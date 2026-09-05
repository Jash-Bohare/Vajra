import 'dotenv/config';
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  CreateInvestigationRequest,
  CreateInvestigationResponse,
  InvestigationGraph,
  RiskScoreRequest,
  RiskScoreResponse,
  ScanAssetsRequest,
  ScanAssetsResponse,
} from '@rt-cfas/types';
import {
  EthereumProvider,
  traceWalletTree,
  scanWalletAssets,
  buildInvestigationGraph,
  isValidEthereumAddress,
  checksumAddress,
} from '@rt-cfas/blockchain';
import { getApiConfig } from '@rt-cfas/config';
import {
  getVaspAddressMap,
  createInvestigationRecord,
  updateInvestigationRecord,
  saveTraceHopRecords,
  getInvestigationRecord,
  getInvestigationHistoryRecords,
  findRecentInvestigationRecord,
} from '../db';

export const investigationsRouter = Router();
const config = getApiConfig();
const ethereumProvider = new EthereumProvider(config.etherscanApiKey);

// In-memory fallback cache for demo sessions when DB isn't running or for rich multi-asset metadata
const memoryStore = new Map<string, any>();

/**
 * Call Python Risk Microservice (services/risk)
 */
async function getRiskScore(
  hops: any[],
  terminalType: string,
  destinationWalletPriorTxCount?: number,
  treeData?: {
    totalFanOutNodes: number;
    totalFanInNodes: number;
    totalBranches: number;
    exchangeBranches: number;
    victimTxHash?: string;
  }
): Promise<RiskScoreResponse> {
  try {
    const payload: any = {
      traceHops: hops,
      terminalType: terminalType as any,
      destinationWalletPriorTxCount: destinationWalletPriorTxCount || 0,
      totalFanOutNodes: treeData?.totalFanOutNodes || 0,
      totalFanInNodes: treeData?.totalFanInNodes || 0,
      totalBranches: treeData?.totalBranches || 1,
      exchangeBranches: treeData?.exchangeBranches || 0,
      victimTxHash: treeData?.victimTxHash || null,
    };

    const res = await fetch(`${config.riskServiceUrl}/risk/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data: RiskScoreResponse = await res.json();
      return data;
    }
  } catch (err: any) {
    console.warn('[API] Could not reach risk service:', err.message);
  }

  // Graceful degradation (Doc 03 Section 33)
  return { riskLevel: 'unavailable', reason: 'Risk scoring service unavailable' };
}

/**
 * POST /api/investigations/scan-assets (Spec 08)
 * Pre-scans a suspect wallet to detect available outgoing assets and volumes
 */
investigationsRouter.post(
  '/scan-assets',
  async (
    req: Request<{}, {}, ScanAssetsRequest>,
    res: Response<ScanAssetsResponse | { error: string }>
  ) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress || !isValidEthereumAddress(walletAddress)) {
        return res.status(400).json({ error: 'Invalid or missing Ethereum wallet address format.' });
      }

      const formattedAddr = checksumAddress(walletAddress);
      console.log(`[API] Pre-scanning assets for wallet: ${formattedAddr}`);
      const assets = await scanWalletAssets(formattedAddr, ethereumProvider);

      return res.status(200).json({
        walletAddress: formattedAddr,
        assets,
      });
    } catch (err: any) {
      console.error('[API] Scan assets error:', err.message);
      return res.status(500).json({ error: 'Failed to scan wallet assets.' });
    }
  }
);

/**
 * POST /api/investigations (Doc 03 Section 6 & Spec 08 & Spec 09)
 * Traces a suspect wallet address using Multi-Branch Tree Engine with Fan-Out/Fan-In Graph Traversal
 */
investigationsRouter.post(
  '/',
  async (
    req: Request<{}, {}, CreateInvestigationRequest>,
    res: Response<CreateInvestigationResponse | { error: string }>
  ) => {
    try {
      const { walletAddress, targetAsset, victimTxHash, victimAmountUsd, sessionId, forceRefresh } = req.body;

      if (!walletAddress || !isValidEthereumAddress(walletAddress)) {
        return res.status(400).json({ error: 'Invalid or missing Ethereum wallet address format.' });
      }

      const activeSessionId = sessionId || 'demo_session';
      const formattedAddr = checksumAddress(walletAddress);

      // Smart Cache Check: When forceRefresh is not requested, return recent snapshot (< 15 mins) instantly
      if (forceRefresh !== true) {
        // 1. Check in-memory cache
        for (const [key, cached] of memoryStore.entries()) {
          if (
            cached &&
            cached.walletAddress &&
            cached.walletAddress.toLowerCase() === formattedAddr.toLowerCase() &&
            cached.status === 'completed' &&
            cached.tree &&
            Date.now() - new Date(cached.completedAt || cached.createdAt || 0).getTime() < 15 * 60 * 1000
          ) {
            console.log(`[API] Returning memory-cached snapshot for ${formattedAddr} (ID: ${cached.id})`);
            return res.status(200).json({
              investigationId: cached.id,
              status: 'completed',
              isCached: true,
              cachedAt: cached.completedAt || cached.createdAt,
            });
          }
        }

        // 2. Check DB
        const recentRecord = await findRecentInvestigationRecord(formattedAddr, targetAsset, 15);
        if (recentRecord) {
          console.log(`[API] Returning DB-cached snapshot for ${formattedAddr} (ID: ${recentRecord.id})`);
          return res.status(200).json({
            investigationId: recentRecord.id,
            status: 'completed',
            isCached: true,
            cachedAt: recentRecord.completedAt,
          });
        }
      }

      const investigationId = crypto.randomUUID();

      // 1. Create DB record
      await createInvestigationRecord(investigationId, activeSessionId, formattedAddr);

      // 2. Fetch VASP lookup map
      const vaspMap = await getVaspAddressMap();
      const lookupFn = (addr: string) => vaspMap.get(addr.toLowerCase());

      // 3. Execute Multi-Branch Tree Engine Tracing for targeted asset
      console.log(`[API] Tree Tracing suspect wallet: ${formattedAddr} (Target Asset: ${targetAsset || 'Auto'}, Victim Tx: ${victimTxHash || 'None'})`);
      const treeResult = await traceWalletTree(
        formattedAddr,
        ethereumProvider,
        lookupFn,
        5,
        targetAsset,
        victimTxHash,
        victimAmountUsd
      );

      const combinedAssets = Array.from(
        new Set([...(treeResult.assetsDetected || []), targetAsset || 'ETH', 'ETH'])
      );

      // Collect all unique hops across ALL branches in the tree
      const allHopsMap = new Map<string, any>();
      for (const branch of treeResult.tree.branches) {
        for (const hop of branch.hops) {
          const key = `${hop.fromAddress.toLowerCase()}_${hop.toAddress.toLowerCase()}_${hop.txHash.toLowerCase()}`;
          if (!allHopsMap.has(key)) {
            allHopsMap.set(key, hop);
          }
        }
      }
      const allHops = Array.from(allHopsMap.values()).sort((a, b) => a.hopIndex - b.hopIndex);
      const primaryHops = allHops.length > 0 ? allHops : (treeResult.tree.branches[0]?.hops || []);

      // 4. Compute Risk Score via Python Microservice with Tree Topology Metrics
      const risk = await getRiskScore(
        primaryHops,
        treeResult.terminalType,
        treeResult.destinationWalletPriorTxCount,
        {
          totalFanOutNodes: treeResult.tree.totalFanOutNodes,
          totalFanInNodes: treeResult.tree.totalFanInNodes,
          totalBranches: treeResult.tree.totalBranches,
          exchangeBranches: treeResult.tree.exchangeBranches,
          victimTxHash,
        }
      );

      // 5. Persist to DB & Memory Store
      const snapshotGraph = {
        ...treeResult.graph,
        assetsDetected: combinedAssets,
      };

      await saveTraceHopRecords(investigationId, primaryHops);
      await updateInvestigationRecord(
        investigationId,
        'completed',
        treeResult.terminalType,
        treeResult.terminalExchange,
        risk.riskLevel,
        risk.reason,
        treeResult.tree.branches[0]?.hopCount || 1,
        {
          riskScore: risk.score,
          riskIndicators: risk.indicators,
          assetsDetected: combinedAssets,
          targetAsset: treeResult.tree.targetAsset || targetAsset || 'ETH',
          victimTxHash: treeResult.tree.victimTxHash,
          victimAmountUsd: treeResult.tree.victimAmountUsd,
          ethPriceUsd: treeResult.tree.ethPriceUsd,
          tree: treeResult.tree,
          graph: snapshotGraph,
        }
      );

      memoryStore.set(investigationId, {
        id: investigationId,
        sessionId: activeSessionId,
        walletAddress: formattedAddr,
        chain: 'ethereum',
        status: 'completed',
        terminalType: treeResult.terminalType,
        terminalExchange: treeResult.terminalExchange,
        riskLevel: risk.riskLevel,
        riskReason: risk.reason,
        riskScore: risk.score,
        riskIndicators: risk.indicators,
        assetsDetected: combinedAssets,
        targetAsset: treeResult.tree.targetAsset || targetAsset || 'ETH',
        victimTxHash: treeResult.tree.victimTxHash,
        victimAmountUsd: treeResult.tree.victimAmountUsd,
        ethPriceUsd: treeResult.tree.ethPriceUsd,
        hopDepthUsed: treeResult.tree.branches[0]?.hopCount || 1,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        hops: primaryHops,
        graph: snapshotGraph,
        tree: treeResult.tree,
      });

      return res.status(201).json({
        investigationId,
        status: 'completed',
      });
    } catch (err: any) {
      console.error('[API] Investigation error:', err.message);
      return res.status(500).json({ error: 'Failed to complete wallet tree investigation.' });
    }
  }
);

/**
 * GET /api/investigations/system/network-status
 * Returns real-time Ethereum Mainnet block height and live ETH/USD price from oracle
 */
investigationsRouter.get('/system/network-status', async (_req: Request, res: Response) => {
  try {
    const [latestBlock, liveEthPrice] = await Promise.all([
      ethereumProvider.getLatestBlockNumber(),
      ethereumProvider.getEthPriceUsd(),
    ]);

    return res.status(200).json({
      network: 'Ethereum Mainnet',
      chainId: 1,
      latestBlock,
      ethPriceUsd: liveEthPrice,
      timestamp: new Date().toISOString(),
      status: 'synced',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch network status', message: err.message });
  }
});

/**
 * GET /api/investigations/:id (Doc 03 Section 6 & Spec 08)
 * Returns immutable historical investigation snapshot, hops, and InvestigationGraph payload
 */
investigationsRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  // 1. Prefer Memory Store for rich multi-asset metadata, fallback to DB
  let memRecord = memoryStore.get(id);
  let dbRecord = await getInvestigationRecord(id);

  let record = memRecord || dbRecord;

  if (!record) {
    return res.status(404).json({ error: 'Investigation not found.' });
  }

  // If we have DB record and memRecord, merge rich hop & tree details onto record
  if (memRecord && dbRecord) {
    record = {
      ...dbRecord,
      ...memRecord,
      hops: memRecord.hops || dbRecord.hops,
      assetsDetected: memRecord.assetsDetected || dbRecord.assetsDetected,
      targetAsset: memRecord.targetAsset || dbRecord.targetAsset,
      victimTxHash: memRecord.victimTxHash || dbRecord.victimTxHash,
      victimTxTimestamp: memRecord.victimTxTimestamp || dbRecord.victimTxTimestamp,
      victimAmountUsd: memRecord.victimAmountUsd || dbRecord.victimAmountUsd,
      ethPriceUsd: memRecord.ethPriceUsd || dbRecord.ethPriceUsd,
      riskScore: memRecord.riskScore || dbRecord.riskScore,
      riskIndicators: memRecord.riskIndicators || dbRecord.riskIndicators,
      graph: memRecord.graph || dbRecord.graph,
      tree: memRecord.tree || dbRecord.tree,
    };
  }

  // 2. Build InvestigationGraph fallback if missing
  const graphPayload: InvestigationGraph = record.graph || buildInvestigationGraph(
    record.walletAddress,
    record.hops || [],
    record.terminalType || 'inconclusive',
    record.terminalExchange,
    record.targetAsset,
    record.victimTxHash,
    record.victimAmountUsd
  );

  return res.status(200).json({
    id: record.id,
    sessionId: record.sessionId,
    walletAddress: record.walletAddress,
    chain: record.chain,
    status: record.status,
    terminalType: record.terminalType,
    terminalExchange: record.terminalExchange,
    riskLevel: record.riskLevel,
    riskReason: record.riskReason,
    riskScore: record.riskScore,
    riskIndicators: record.riskIndicators,
    assetsDetected: record.assetsDetected || record.graph?.assetsDetected || ['ETH'],
    targetAsset: record.targetAsset || record.graph?.targetAsset,
    victimTxHash: record.victimTxHash,
    victimTxTimestamp: record.victimTxTimestamp,
    victimAmountUsd: record.victimAmountUsd,
    ethPriceUsd: record.ethPriceUsd || record.tree?.ethPriceUsd || record.graph?.ethPriceUsd,
    hopDepthUsed: record.hopDepthUsed,
    graph: record.graph || graphPayload,
    tree: record.tree || record.graph?.tree,
    hops: record.hops,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
  });
});

/**
 * GET /api/investigations/:id/report (Doc 03 Section 6)
 */
investigationsRouter.get('/:id/report', (req: Request, res: Response) => {
  return res.status(501).json({ error: 'Report generation supported via PDF Exporter.' });
});

/**
 * GET /api/investigations (Doc 03 Section 6 & Doc 04 Phase 3)
 * Queries live Supabase database records, falls back to memoryStore
 */
investigationsRouter.get('/', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string | undefined;

  let list = await getInvestigationHistoryRecords(sessionId);

  // Fallback to memoryStore if database returned no results
  if (list.length === 0) {
    list = Array.from(memoryStore.values());
    if (sessionId) {
      list = list.filter((item) => item.sessionId === sessionId);
    }
  }

  return res.status(200).json(list);
});

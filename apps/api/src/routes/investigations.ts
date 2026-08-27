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
  traceWalletHops,
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
  destinationWalletPriorTxCount?: number
): Promise<RiskScoreResponse> {
  try {
    const payload: RiskScoreRequest = {
      traceHops: hops,
      terminalType: terminalType as any,
      destinationWalletPriorTxCount: destinationWalletPriorTxCount || 0,
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
 * POST /api/investigations (Doc 03 Section 6 & Spec 08 + TLFT Architecture)
 * Traces a suspect wallet address end-to-end with optional Victim Tx Reference and Decaying Taint Engine
 */
investigationsRouter.post(
  '/',
  async (
    req: Request<{}, {}, CreateInvestigationRequest>,
    res: Response<CreateInvestigationResponse | { error: string }>
  ) => {
    try {
      const { walletAddress, targetAsset, victimTxHash, sessionId } = req.body;

      if (!walletAddress || !isValidEthereumAddress(walletAddress)) {
        return res.status(400).json({ error: 'Invalid or missing Ethereum wallet address format.' });
      }

      const activeSessionId = sessionId || 'demo_session';
      const investigationId = crypto.randomUUID();
      const formattedAddr = checksumAddress(walletAddress);

      // 1. Create DB record
      await createInvestigationRecord(investigationId, activeSessionId, formattedAddr);

      // 2. Fetch VASP lookup map
      const vaspMap = await getVaspAddressMap();
      const lookupFn = (addr: string) => vaspMap.get(addr.toLowerCase());

      // 3. Execute Targeted Multi-Asset & Decaying Taint Tracing
      console.log(`[API] Tracing suspect wallet: ${formattedAddr} (Target Asset: ${targetAsset || 'Auto'}, Victim Tx: ${victimTxHash || 'None'})`);
      const traceResult = await traceWalletHops(
        formattedAddr,
        ethereumProvider,
        lookupFn,
        5,
        targetAsset,
        victimTxHash
      );

      // 4. Compute Risk Score via Python Microservice
      const risk = await getRiskScore(
        traceResult.hops,
        traceResult.terminalType,
        traceResult.destinationWalletPriorTxCount
      );

      // 5. Persist to DB & Memory Store
      await saveTraceHopRecords(investigationId, traceResult.hops);
      await updateInvestigationRecord(
        investigationId,
        'completed',
        traceResult.terminalType,
        traceResult.terminalExchange,
        risk.riskLevel,
        risk.reason,
        traceResult.hopDepthUsed
      );

      memoryStore.set(investigationId, {
        id: investigationId,
        sessionId: activeSessionId,
        walletAddress: formattedAddr,
        chain: 'ethereum',
        status: 'completed',
        terminalType: traceResult.terminalType,
        terminalExchange: traceResult.terminalExchange,
        riskLevel: risk.riskLevel,
        riskReason: risk.reason,
        riskScore: risk.score,
        riskIndicators: risk.indicators,
        assetsDetected: traceResult.assetsDetected,
        targetAsset: traceResult.targetAsset || targetAsset,
        victimTxHash: traceResult.victimTxHash,
        victimTxTimestamp: traceResult.victimTxTimestamp,
        victimAmountUsd: traceResult.victimAmountUsd,
        hopDepthUsed: traceResult.hopDepthUsed,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        hops: traceResult.hops,
      });

      return res.status(201).json({
        investigationId,
        status: 'completed',
      });
    } catch (err: any) {
      console.error('[API] Investigation error:', err.message);
      return res.status(500).json({ error: 'Failed to complete wallet trace investigation.' });
    }
  }
);

/**
 * GET /api/investigations/:id (Doc 03 Section 6 & Spec 08)
 * Returns investigation summary, hops, and InvestigationGraph payload
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

  // If we have DB record and memRecord, merge rich hop details onto record
  if (memRecord && dbRecord) {
    record = {
      ...dbRecord,
      hops: memRecord.hops || dbRecord.hops,
      assetsDetected: memRecord.assetsDetected,
      targetAsset: memRecord.targetAsset,
      victimTxHash: memRecord.victimTxHash,
      victimTxTimestamp: memRecord.victimTxTimestamp,
      victimAmountUsd: memRecord.victimAmountUsd,
      riskScore: memRecord.riskScore || dbRecord.riskScore,
      riskIndicators: memRecord.riskIndicators || dbRecord.riskIndicators,
    };
  }

  // 2. Build InvestigationGraph (Doc 03 Section 5 & Spec 08)
  const graphPayload: InvestigationGraph = buildInvestigationGraph(
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
    assetsDetected: record.assetsDetected || graphPayload.assetsDetected || ['ETH'],
    targetAsset: record.targetAsset || graphPayload.targetAsset,
    victimTxHash: record.victimTxHash,
    victimTxTimestamp: record.victimTxTimestamp,
    victimAmountUsd: record.victimAmountUsd,
    hopDepthUsed: record.hopDepthUsed,
    graph: graphPayload,
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
 * Session history endpoint - queries database records, falls back to memoryStore
 */
investigationsRouter.get('/', async (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId as string) || 'demo_session';

  let list = await getInvestigationHistoryRecords(sessionId);

  // Fallback to memoryStore if database returned no results
  if (list.length === 0) {
    list = Array.from(memoryStore.values()).filter((item) => item.sessionId === sessionId);
  }

  return res.status(200).json(list);
});

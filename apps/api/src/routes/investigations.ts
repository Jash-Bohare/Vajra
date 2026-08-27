import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  CreateInvestigationRequest,
  CreateInvestigationResponse,
  InvestigationGraph,
  GraphNode,
  GraphEdge,
  RiskScoreRequest,
  RiskScoreResponse,
} from '@rt-cfas/types';
import { EthereumProvider, traceWalletHops, isValidEthereumAddress, checksumAddress } from '@rt-cfas/blockchain';
import { getApiConfig } from '@rt-cfas/config';
import {
  getVaspAddressMap,
  createInvestigationRecord,
  updateInvestigationRecord,
  saveTraceHopRecords,
  getInvestigationRecord,
} from '../db';

export const investigationsRouter = Router();
const config = getApiConfig();
const ethereumProvider = new EthereumProvider(config.etherscanApiKey);

// In-memory fallback cache for demo sessions when DB isn't running
const memoryStore = new Map<string, any>();

/**
 * Call Python Risk Microservice (services/risk)
 */
async function getRiskScore(hops: any[], terminalType: string): Promise<{ riskLevel: string; reason: string }> {
  try {
    const payload: RiskScoreRequest = {
      traceHops: hops,
      terminalType: terminalType as any,
    };

    const res = await fetch(`${config.riskServiceUrl}/risk/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data: RiskScoreResponse = await res.json();
      return { riskLevel: data.riskLevel, reason: data.reason };
    }
  } catch (err: any) {
    console.warn('[API] Could not reach risk service:', err.message);
  }

  // Graceful degradation (Doc 03 Section 33)
  return { riskLevel: 'unavailable', reason: 'Risk scoring service unavailable' };
}

/**
 * POST /api/investigations (Doc 03 Section 6 & Doc 04 Phase 2)
 * Traces a suspect wallet address end-to-end
 */
investigationsRouter.post(
  '/',
  async (
    req: Request<{}, {}, CreateInvestigationRequest>,
    res: Response<CreateInvestigationResponse | { error: string }>
  ) => {
    try {
      const { walletAddress, sessionId } = req.body;

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

      // 3. Execute Greedy Single-Path Tracing
      console.log(`[API] Tracing suspect wallet: ${formattedAddr}`);
      const traceResult = await traceWalletHops(formattedAddr, ethereumProvider, lookupFn, 5);

      // 4. Compute Risk Score via Python Microservice
      const risk = await getRiskScore(traceResult.hops, traceResult.terminalType);

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
 * GET /api/investigations/:id (Doc 03 Section 6 & Doc 04 Phase 3/5)
 * Returns investigation summary, hops, and graph payload
 */
investigationsRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  // 1. Check DB first, fallback to Memory Store
  let record = await getInvestigationRecord(id);
  if (!record) {
    record = memoryStore.get(id);
  }

  if (!record) {
    return res.status(404).json({ error: 'Investigation not found.' });
  }

  // 2. Build InvestigationGraph (Doc 03 Section 5)
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeSet = new Set<string>();

  // Add initial wallet node
  nodes.push({ id: record.walletAddress, type: 'wallet' });
  nodeSet.add(record.walletAddress.toLowerCase());

  const hops = record.hops || [];
  for (const hop of hops) {
    // Edge
    edges.push({
      from: hop.fromAddress,
      to: hop.toAddress,
      amountEth: hop.amountEth,
      txHash: hop.txHash,
      timestamp: hop.txTimestamp,
    });

    // To Node
    if (!nodeSet.has(hop.toAddress.toLowerCase())) {
      const isTerminalExchange =
        record.terminalType === 'exchange' &&
        hop.hopIndex === hops.length;

      nodes.push({
        id: hop.toAddress,
        type: isTerminalExchange ? 'exchange' : 'wallet',
        label: isTerminalExchange ? record.terminalExchange : undefined,
      });
      nodeSet.add(hop.toAddress.toLowerCase());
    }
  }

  const graphPayload: InvestigationGraph = {
    nodes,
    edges,
    terminal: {
      type: record.terminalType || 'inconclusive',
      exchangeName: record.terminalExchange,
    },
  };

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
  return res.status(501).json({ error: 'Report generation will be implemented in Phase 5.' });
});

/**
 * GET /api/investigations (Doc 03 Section 6)
 * Session history endpoint
 */
investigationsRouter.get('/', async (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId as string) || 'demo_session';
  const list = Array.from(memoryStore.values()).filter((item) => item.sessionId === sessionId);
  return res.status(200).json(list);
});

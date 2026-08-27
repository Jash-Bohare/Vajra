/**
 * Shared Domain Models and API Contracts for RT-CFAS
 * Source of truth: Doc 03 Technical Architecture Engineering Specification
 */

export type InvestigationStatus = 'pending' | 'running' | 'completed' | 'failed';

export type TerminalType = 'exchange' | 'inconclusive';

export type RiskLevel = 'low' | 'medium' | 'high' | 'unavailable';

export type Chain = 'ethereum';

/**
 * Graph Visualization Schema (Doc 03 Section 5)
 */
export interface GraphNode {
  id: string; // wallet address (checksummed)
  type: 'wallet' | 'exchange';
  label?: string; // e.g. "Binance Hot Wallet 1"
}

export interface GraphEdge {
  from: string; // sender address
  to: string; // receiver address
  amountEth: number; // ETH amount
  txHash: string; // transaction hash
  timestamp: string; // ISO 8601 UTC string
}

export interface InvestigationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  terminal: {
    type: TerminalType;
    exchangeName?: string;
  };
}

/**
 * Database Entity Schemas (Doc 03 Section 4)
 */
export interface TraceHop {
  id?: string;
  investigationId?: string;
  hopIndex: number;
  fromAddress: string;
  toAddress: string;
  amountEth: number;
  txHash: string;
  txTimestamp: string;
}

export interface Investigation {
  id: string;
  sessionId: string;
  walletAddress: string;
  chain: Chain;
  status: InvestigationStatus;
  terminalType?: TerminalType;
  terminalExchange?: string;
  riskLevel?: RiskLevel;
  riskReason?: string;
  hopDepthUsed?: number;
  reportPath?: string;
  graph?: InvestigationGraph;
  createdAt: string;
  completedAt?: string;
}

export interface KnownExchangeAddress {
  id: string;
  address: string;
  exchangeName: string;
  chain: Chain;
  source?: string;
  addedAt: string;
}

/**
 * Feature Extraction Vector (Doc 03 Section 13)
 */
export interface TraceFeatures {
  hopCount: number;
  minTimeBetweenHopsSec: number;
  maxTimeBetweenHopsSec: number;
  terminalType: TerminalType;
  destinationWalletPriorTxCount: number;
}

/**
 * Risk Scoring Result Schema (Doc 03 Section 16)
 */
export interface RiskResult {
  riskLevel: RiskLevel;
  reason: string;
  featuresUsed?: TraceFeatures;
}

/**
 * API Request & Response Contracts (Doc 03 Section 6)
 */
export interface CreateInvestigationRequest {
  walletAddress: string;
  sessionId?: string;
}

export interface CreateInvestigationResponse {
  investigationId: string;
  status: InvestigationStatus;
}

export interface RiskScoreRequest {
  traceHops: TraceHop[];
  terminalType?: TerminalType;
  destinationWalletPriorTxCount?: number;
}

export interface RiskScoreResponse {
  riskLevel: RiskLevel;
  reason: string;
  featuresUsed?: TraceFeatures;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  timestamp: string;
}

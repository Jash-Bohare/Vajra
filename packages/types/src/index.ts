/**
 * Shared Domain Models and API Contracts for RT-CFAS & Vajra LEA Edition
 * Source of truth: Doc 03 Technical Architecture Engineering Specification & Spec 08
 */

export type InvestigationStatus = 'pending' | 'running' | 'completed' | 'failed';

export type TerminalType = 'exchange' | 'inconclusive';

export type RiskLevel = 'low' | 'medium' | 'high' | 'unavailable';

export type Chain = 'ethereum';

export type AssetType = 'ETH' | 'USDT' | 'USDC' | 'DAI' | 'WETH' | 'ERC20';

export type HopConfidence = 'high' | 'medium' | 'low';

export interface AssetSummary {
  symbol: AssetType;
  outgoingCount: number;
  totalVolumeUsd: number;
  totalVolumeToken: number;
}

/**
 * Graph Visualization Schema (Doc 03 Section 5 & Spec 08)
 */
export interface GraphNode {
  id: string; // wallet address (checksummed)
  type: 'wallet' | 'exchange';
  label?: string; // e.g. "Binance Hot Wallet 1"
}

export interface GraphEdge {
  from: string; // sender address
  to: string; // receiver address
  amountEth: number; // ETH amount (0 for pure token transfers)
  txHash: string; // transaction hash
  timestamp: string; // ISO 8601 UTC string
  tokenSymbol?: AssetType;
  usdValue?: number;
  isInternalTx?: boolean;
  confidence?: HopConfidence;
}

export interface InvestigationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  terminal: {
    type: TerminalType;
    exchangeName?: string;
  };
  assetsDetected?: AssetType[];
  targetAsset?: AssetType;
  victimTxHash?: string;
  victimAmountUsd?: number;
}

/**
 * Database Entity Schemas (Doc 03 Section 4 & Spec 08)
 */
export interface TraceHop {
  id?: string;
  investigationId?: string;
  hopIndex: number;
  fromAddress: string;
  toAddress: string;
  amountEth: number; // Native ETH amount (0 for pure token transfers)
  txHash: string;
  txTimestamp: string;
  tokenSymbol?: AssetType;
  tokenAmount?: number;
  tokenDecimals?: number;
  usdValue?: number;
  isInternalTx?: boolean;
  contractAddress?: string;
  confidence?: HopConfidence;
  taintedAmountUsd?: number;
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
  riskScore?: number;
  riskIndicators?: string[];
  assetsDetected?: AssetType[];
  targetAsset?: AssetType;
  victimTxHash?: string;
  victimTxTimestamp?: string;
  victimAmountUsd?: number;
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
  isPeelingChain?: boolean;
}

/**
 * Risk Scoring Result Schema (Doc 03 Section 16 & Spec 08)
 */
export interface RiskResult {
  riskLevel: RiskLevel;
  score?: number;
  indicators?: string[];
  reason: string;
  featuresUsed?: TraceFeatures;
}

/**
 * API Request & Response Contracts (Doc 03 Section 6 & Spec 08)
 */
export interface ScanAssetsRequest {
  walletAddress: string;
}

export interface ScanAssetsResponse {
  walletAddress: string;
  assets: AssetSummary[];
}

export interface CreateInvestigationRequest {
  walletAddress: string;
  targetAsset?: AssetType;
  victimTxHash?: string; // Optional victim transaction reference
  victimAmountUsd?: number;
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
  score?: number;
  indicators?: string[];
  reason: string;
  featuresUsed?: TraceFeatures;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  timestamp: string;
}

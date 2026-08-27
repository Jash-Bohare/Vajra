import { TraceHop, TerminalType, AssetType, InvestigationGraph, AssetSummary, HopConfidence } from '@rt-cfas/types';
import { EthereumProvider, NormalizedTx, checksumAddress } from './index';

export interface TraceResult {
  hops: TraceHop[];
  terminalType: TerminalType;
  terminalExchange?: string;
  hopDepthUsed: number;
  assetsDetected: AssetType[];
  targetAsset?: AssetType;
  victimTxHash?: string;
  victimTxTimestamp?: string;
  victimAmountUsd?: number;
  destinationWalletPriorTxCount: number;
}

export type VaspLookupFn = (address: string) => string | undefined;

/**
 * Scans a wallet address to identify all available outgoing assets and volume totals (Spec 08)
 */
export async function scanWalletAssets(
  walletAddress: string,
  provider: EthereumProvider
): Promise<AssetSummary[]> {
  const normalizedAddr = checksumAddress(walletAddress);

  const [ethTxs, tokenTxs, internalTxs] = await Promise.all([
    provider.getTransactions(normalizedAddr),
    provider.getTokenTransactions(normalizedAddr),
    provider.getInternalTransactions(normalizedAddr),
  ]);

  const hopMap = new Map<string, NormalizedTx>();
  for (const tx of ethTxs) hopMap.set(tx.txHash, tx);
  for (const tx of internalTxs) hopMap.set(tx.txHash, tx);
  for (const tx of tokenTxs) hopMap.set(tx.txHash, tx);

  const mergedTxs = Array.from(hopMap.values());
  const assetMap = new Map<AssetType, { count: number; volumeUsd: number; volumeToken: number }>();

  for (const tx of mergedTxs) {
    if (tx.fromAddress.toLowerCase() !== normalizedAddr.toLowerCase()) continue;
    if (tx.isFailed) continue;
    if (!tx.toAddress) continue;

    const symbol: AssetType = tx.tokenSymbol || 'ETH';
    const usdVal = tx.usdValue || (tx.amountEth ? tx.amountEth * 3000 : 0);
    const tokenVal = tx.tokenAmount || tx.amountEth || 0;

    if (usdVal <= 0 && tokenVal <= 0) continue;

    const existing = assetMap.get(symbol) || { count: 0, volumeUsd: 0, volumeToken: 0 };
    existing.count += 1;
    existing.volumeUsd += usdVal;
    existing.volumeToken += tokenVal;
    assetMap.set(symbol, existing);
  }

  const summaries: AssetSummary[] = Array.from(assetMap.entries()).map(([symbol, data]) => ({
    symbol,
    outgoingCount: data.count,
    totalVolumeUsd: parseFloat(data.volumeUsd.toFixed(2)),
    totalVolumeToken: parseFloat(data.volumeToken.toFixed(4)),
  }));

  // Sort assets by highest total volume USD
  summaries.sort((a, b) => b.totalVolumeUsd - a.totalVolumeUsd);

  // If no outgoing txs detected, default to ETH
  if (summaries.length === 0) {
    summaries.push({ symbol: 'ETH', outgoingCount: 0, totalVolumeUsd: 0, totalVolumeToken: 0 });
  }

  return summaries;
}

/**
 * Victim Transaction Reference & Decaying Taint Engine (Spec 08 + TLFT Architecture)
 * Uses deterministic 3-tier selection, temporal gating (timestamp > T_crime), and decaying per-branch taint tracking.
 */
export async function traceWalletHops(
  startAddress: string,
  provider: EthereumProvider,
  vaspLookup: VaspLookupFn,
  maxHops: number = 5,
  targetAsset?: AssetType,
  victimTxHash?: string
): Promise<TraceResult> {
  const hops: TraceHop[] = [];
  let currentAddress = checksumAddress(startAddress);
  let terminalType: TerminalType = 'inconclusive';
  let terminalExchange: string | undefined = undefined;
  const assetsDetectedSet = new Set<AssetType>();

  let crimeTimestamp: string | undefined = undefined;
  let currentTaintedUsd: number | undefined = undefined;
  let activeTargetAsset = targetAsset;

  // 1. Fetch victim transaction reference if provided (Anchor Fetch)
  if (victimTxHash) {
    const [ethTxs, tokenTxs, internalTxs] = await Promise.all([
      provider.getTransactions(currentAddress),
      provider.getTokenTransactions(currentAddress),
      provider.getInternalTransactions(currentAddress),
    ]);

    const allTxMap = new Map<string, NormalizedTx>();
    for (const tx of ethTxs) allTxMap.set(tx.txHash.toLowerCase(), tx);
    for (const tx of internalTxs) allTxMap.set(tx.txHash.toLowerCase(), tx);
    for (const tx of tokenTxs) allTxMap.set(tx.txHash.toLowerCase(), tx);

    const victimTx = allTxMap.get(victimTxHash.toLowerCase().trim());
    if (victimTx) {
      crimeTimestamp = victimTx.timestamp;
      currentTaintedUsd = victimTx.usdValue || (victimTx.tokenAmount || victimTx.amountEth * 3000);
      if (!activeTargetAsset && victimTx.tokenSymbol) {
        activeTargetAsset = victimTx.tokenSymbol;
      }
    }
  }

  const visitedAddresses = new Set<string>([currentAddress.toLowerCase()]);
  let currentTimestampBoundary = crimeTimestamp;

  for (let hopIndex = 1; hopIndex <= maxHops; hopIndex++) {
    // Respect Etherscan API free-tier rate limits (5 req/sec = 1 req per 200ms)
    if (hopIndex > 1) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    // Fetch native ETH, ERC-20 token, and internal contract txs in parallel
    const [ethTxs, tokenTxs, internalTxs] = await Promise.all([
      provider.getTransactions(currentAddress),
      provider.getTokenTransactions(currentAddress),
      provider.getInternalTransactions(currentAddress),
    ]);

    // Priority deduplication (tokenTx > internalTx > ethTx)
    const hopMap = new Map<string, NormalizedTx>();
    for (const tx of ethTxs) hopMap.set(tx.txHash, tx);
    for (const tx of internalTxs) hopMap.set(tx.txHash, tx);
    for (const tx of tokenTxs) hopMap.set(tx.txHash, tx);

    const mergedTxs = Array.from(hopMap.values());

    // Filter valid outgoing transfers from current address
    const outgoingTxs = mergedTxs.filter((tx) => {
      const isFromCurrent = tx.fromAddress.toLowerCase() === currentAddress.toLowerCase();
      const isNotSelf = tx.toAddress.toLowerCase() !== currentAddress.toLowerCase();
      const isValidRecipient = Boolean(tx.toAddress);
      const isNotFailed = !tx.isFailed;
      const notVisited = !visitedAddresses.has(tx.toAddress.toLowerCase());

      const symbol = tx.tokenSymbol || 'ETH';
      const matchesTarget = !activeTargetAsset || symbol.toUpperCase() === activeTargetAsset.toUpperCase();

      // Temporal Gate: Must occur AFTER crime/previous hop timestamp
      const matchesTemporalGate =
        !currentTimestampBoundary || new Date(tx.timestamp).getTime() > new Date(currentTimestampBoundary).getTime();

      const hasValue = (tx.usdValue ?? 0) >= 1 || tx.amountEth >= 0.0001 || (tx.tokenAmount ?? 0) > 0;

      return isFromCurrent && isNotSelf && isValidRecipient && isNotFailed && hasValue && notVisited && matchesTarget && matchesTemporalGate;
    });

    if (outgoingTxs.length === 0) {
      break;
    }

    // Deterministic 3-Tier Selection Algorithm
    let selectedTx: NormalizedTx | undefined = undefined;
    let confidence: HopConfidence = 'high';

    // TIER 1: Direct VASP Deposit Match
    const vaspCandidate = outgoingTxs.find((tx) => Boolean(vaspLookup(tx.toAddress)));
    if (vaspCandidate) {
      selectedTx = vaspCandidate;
      confidence = 'high';
    }

    // TIER 2: Tolerated Decaying Taint Match (70% - 105% of currentTaintedUsd)
    if (!selectedTx && currentTaintedUsd !== undefined && currentTaintedUsd > 0) {
      const minUsd = currentTaintedUsd * 0.70;
      const maxUsd = currentTaintedUsd * 1.05;

      const tier2Candidates = outgoingTxs.filter((tx) => {
        const val = tx.usdValue || 0;
        return val >= minUsd && val <= maxUsd;
      });

      if (tier2Candidates.length > 0) {
        // Break ties by soonest timestamp (First Out)
        tier2Candidates.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        selectedTx = tier2Candidates[0];
        confidence = 'high';
      }
    }

    // TIER 3: Closest Proportion Fallback
    if (!selectedTx) {
      if (currentTaintedUsd !== undefined && currentTaintedUsd > 0) {
        outgoingTxs.sort(
          (a, b) => Math.abs((a.usdValue || 0) - currentTaintedUsd!) - Math.abs((b.usdValue || 0) - currentTaintedUsd!)
        );
        selectedTx = outgoingTxs[0];
        confidence = 'low';
      } else {
        outgoingTxs.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0) || b.amountEth - a.amountEth);
        selectedTx = outgoingTxs[0];
        confidence = 'high';
      }
    }

    const nextAddress = checksumAddress(selectedTx.toAddress);
    visitedAddresses.add(nextAddress.toLowerCase());

    const tokenSymbol = selectedTx.tokenSymbol || 'ETH';
    assetsDetectedSet.add(tokenSymbol);

    // Update decaying tainted amount and timestamp boundary for next hop
    currentTaintedUsd = selectedTx.usdValue || (selectedTx.tokenAmount || selectedTx.amountEth * 3000);
    currentTimestampBoundary = selectedTx.timestamp;

    const currentHop: TraceHop = {
      hopIndex,
      fromAddress: currentAddress,
      toAddress: nextAddress,
      amountEth: selectedTx.amountEth,
      txHash: selectedTx.txHash,
      txTimestamp: selectedTx.timestamp,
      tokenSymbol,
      tokenAmount: selectedTx.tokenAmount,
      tokenDecimals: selectedTx.tokenDecimals,
      usdValue: selectedTx.usdValue,
      isInternalTx: selectedTx.isInternalTx,
      contractAddress: selectedTx.contractAddress,
      confidence,
      taintedAmountUsd: currentTaintedUsd,
    };

    hops.push(currentHop);

    // Check VASP deposit address match
    const matchedExchange = vaspLookup(nextAddress);
    if (matchedExchange) {
      terminalType = 'exchange';
      terminalExchange = matchedExchange;
      break;
    }

    currentAddress = nextAddress;
  }

  // Calculate actual destination wallet prior transaction count
  const terminalAddress = hops.length > 0 ? hops[hops.length - 1].toAddress : currentAddress;
  let destinationWalletPriorTxCount = 0;
  try {
    const destEthTxs = await provider.getTransactions(terminalAddress);
    destinationWalletPriorTxCount = destEthTxs.length;
  } catch (err: any) {
    destinationWalletPriorTxCount = 0;
  }

  return {
    hops,
    terminalType,
    terminalExchange,
    hopDepthUsed: hops.length,
    assetsDetected: Array.from(assetsDetectedSet),
    targetAsset: activeTargetAsset || (hops.length > 0 ? hops[0].tokenSymbol : undefined),
    victimTxHash,
    victimTxTimestamp: crimeTimestamp,
    victimAmountUsd: currentTaintedUsd,
    destinationWalletPriorTxCount,
  };
}

/**
 * Transforms raw trace hops into an InvestigationGraph object (Doc 03 Section 5 & Spec 08)
 */
export function buildInvestigationGraph(
  startAddress: string,
  hops: TraceHop[],
  terminalType: TerminalType,
  terminalExchange?: string,
  targetAsset?: AssetType,
  victimTxHash?: string,
  victimAmountUsd?: number
): InvestigationGraph {
  const rootAddr = checksumAddress(startAddress);
  const nodes: { id: string; type: 'wallet' | 'exchange'; label?: string }[] = [];
  const edges: any[] = [];
  const nodeSet = new Set<string>();
  const assetsSet = new Set<AssetType>();

  nodes.push({ id: rootAddr, type: 'wallet' });
  nodeSet.add(rootAddr.toLowerCase());

  for (let i = 0; i < hops.length; i++) {
    const hop = hops[i];
    const isTerminalHop = i === hops.length - 1;
    const isExchangeNode = isTerminalHop && terminalType === 'exchange';

    if (hop.tokenSymbol) {
      assetsSet.add(hop.tokenSymbol);
    }

    edges.push({
      from: hop.fromAddress,
      to: hop.toAddress,
      amountEth: hop.amountEth,
      txHash: hop.txHash,
      timestamp: hop.txTimestamp,
      tokenSymbol: hop.tokenSymbol,
      usdValue: hop.usdValue,
      isInternalTx: hop.isInternalTx,
      confidence: hop.confidence,
    });

    if (!nodeSet.has(hop.toAddress.toLowerCase())) {
      nodes.push({
        id: hop.toAddress,
        type: isExchangeNode ? 'exchange' : 'wallet',
        label: isExchangeNode ? terminalExchange : undefined,
      });
      nodeSet.add(hop.toAddress.toLowerCase());
    }
  }

  return {
    nodes,
    edges,
    terminal: {
      type: terminalType,
      exchangeName: terminalExchange,
    },
    assetsDetected: Array.from(assetsSet),
    targetAsset: targetAsset || (hops.length > 0 ? hops[0].tokenSymbol : undefined),
    victimTxHash,
    victimAmountUsd,
  };
}

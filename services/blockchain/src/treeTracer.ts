import {
  TraceHop,
  TerminalType,
  AssetType,
  InvestigationGraph,
  GraphNode,
  GraphEdge,
  BranchSummary,
  InvestigationTree,
  BranchTerminalType,
  HopConfidence,
} from '@rt-cfas/types';
import { EthereumProvider, NormalizedTx, checksumAddress, VaspLookupFn } from './index';

export const TREE_TRACER_CONFIG = {
  MAX_DEPTH: 5,
  MAX_BRANCHES_PER_NODE: 3,
  MAX_TOTAL_NODES: 25,
  SPLIT_THRESHOLD_PERCENT: 10,
  MIN_USD_VALUE_THRESHOLD: 5,
  MIN_ETH_VALUE_THRESHOLD: 0.0001,
  RATE_LIMIT_DELAY_MS: 750,
  TAINT_TOLERANCE_LOWER: 0.70,
  TAINT_TOLERANCE_UPPER: 1.05,
} as const;

export interface TreeQueueItem {
  address: string;
  depth: number;
  currentTaintUsd: number;
  initialBranchTaintUsd: number;
  pathHops: TraceHop[];
  timestampBoundary?: string;
  visitedPerBranch: Set<string>;
}

export interface TreeTraceResult {
  tree: InvestigationTree;
  graph: InvestigationGraph;
  terminalType: TerminalType;
  terminalExchange?: string;
  assetsDetected: AssetType[];
  destinationWalletPriorTxCount: number;
}

/**
 * Multi-Branch Tree Tracing Engine (Spec 09)
 * Executes BFS graph traversal discovering fund splits (fan-out) and aggregations (fan-in).
 */
export async function traceWalletTree(
  startAddress: string,
  provider: EthereumProvider,
  vaspLookup: VaspLookupFn,
  maxHops: number = TREE_TRACER_CONFIG.MAX_DEPTH,
  targetAsset?: AssetType,
  victimTxHash?: string,
  victimAmountUsdInput?: number
): Promise<TreeTraceResult> {
  const rootAddr = checksumAddress(startAddress);
  const rootKey = rootAddr.toLowerCase();

  let crimeTimestamp: string | undefined = undefined;
  let rootTaintUsd: number = victimAmountUsdInput || 0;
  let activeTargetAsset = targetAsset;

  // 1. Fetch victim transaction reference if provided (Anchor Fetch)
  if (victimTxHash) {
    const [ethTxs, tokenTxs, internalTxs] = await Promise.all([
      provider.getTransactions(rootAddr),
      provider.getTokenTransactions(rootAddr),
      provider.getInternalTransactions(rootAddr),
    ]);

    const allTxMap = new Map<string, NormalizedTx>();
    for (const tx of ethTxs) allTxMap.set(tx.txHash.toLowerCase(), tx);
    for (const tx of internalTxs) allTxMap.set(tx.txHash.toLowerCase(), tx);
    for (const tx of tokenTxs) allTxMap.set(tx.txHash.toLowerCase(), tx);

    const victimTx = allTxMap.get(victimTxHash.toLowerCase().trim());
    if (victimTx) {
      crimeTimestamp = victimTx.timestamp;
      rootTaintUsd = victimTx.usdValue || victimTx.tokenAmount || (victimTx.amountEth * 3000) || rootTaintUsd;
      if (!activeTargetAsset && victimTx.tokenSymbol) {
        activeTargetAsset = victimTx.tokenSymbol;
      }
    }
  }

  // If root taint still 0, default to $10,000 USD for percentage calculations
  if (rootTaintUsd <= 0) {
    rootTaintUsd = 10000;
  }

  // Global Graph Data Structures
  const visitedGlobal = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const branches: BranchSummary[] = [];
  const assetsDetectedSet = new Set<AssetType>();
  let isCapped = false;

  // Initialize Root Node
  const rootNode: GraphNode = {
    id: rootAddr,
    type: 'root',
    label: vaspLookup(rootAddr) || rootAddr.slice(0, 10) + '...',
    isFanOut: false,
    isFanIn: false,
    inDegree: 0,
    outDegree: 0,
    depth: 0,
    taintedAmountUsd: rootTaintUsd,
  };
  visitedGlobal.set(rootKey, rootNode);

  // BFS Queue Initialization
  const queue: TreeQueueItem[] = [
    {
      address: rootAddr,
      depth: 0,
      currentTaintUsd: rootTaintUsd,
      initialBranchTaintUsd: rootTaintUsd,
      pathHops: [],
      timestampBoundary: crimeTimestamp,
      visitedPerBranch: new Set<string>([rootKey]),
    },
  ];

  let branchCounter = 1;

  while (queue.length > 0) {
    // Respect rate limit buffer (750ms delay per node batch)
    if (visitedGlobal.size > 1) {
      await new Promise((resolve) => setTimeout(resolve, TREE_TRACER_CONFIG.RATE_LIMIT_DELAY_MS));
    }

    const currentItem = queue.shift()!;
    const currentAddr = currentItem.address;
    const currentKey = currentAddr.toLowerCase();
    const currentNode = visitedGlobal.get(currentKey);

    // Stop traversal along this branch if MAX_DEPTH reached
    if (currentItem.depth >= maxHops) {
      branches.push({
        branchId: `Branch ${branchCounter++}`,
        hopCount: currentItem.pathHops.length,
        terminalAddress: currentAddr,
        terminalType: 'max_depth_reached',
        exchangeName: undefined,
        initialTaintedAmountUsd: currentItem.initialBranchTaintUsd,
        finalAmountUsd: currentItem.currentTaintUsd,
        taintPercentage: parseFloat(((currentItem.currentTaintUsd / rootTaintUsd) * 100).toFixed(1)),
        hops: currentItem.pathHops,
      });
      continue;
    }

    // Check VASP deposit match for current address
    const matchedVasp = vaspLookup(currentAddr);
    if (currentItem.depth > 0 && matchedVasp) {
      if (currentNode) {
        currentNode.type = 'exchange';
        currentNode.label = matchedVasp;
      }
      branches.push({
        branchId: `Branch ${branchCounter++}`,
        hopCount: currentItem.pathHops.length,
        terminalAddress: currentAddr,
        terminalType: 'exchange',
        exchangeName: matchedVasp,
        initialTaintedAmountUsd: currentItem.initialBranchTaintUsd,
        finalAmountUsd: currentItem.currentTaintUsd,
        taintPercentage: parseFloat(((currentItem.currentTaintUsd / rootTaintUsd) * 100).toFixed(1)),
        hops: currentItem.pathHops,
      });
      continue;
    }

    // Fetch outgoing transactions in parallel (cached at provider level)
    const [ethTxs, tokenTxs, internalTxs] = await Promise.all([
      provider.getTransactions(currentAddr),
      provider.getTokenTransactions(currentAddr),
      provider.getInternalTransactions(currentAddr),
    ]);

    const hopMap = new Map<string, NormalizedTx>();
    for (const tx of ethTxs) hopMap.set(tx.txHash, tx);
    for (const tx of internalTxs) hopMap.set(tx.txHash, tx);
    for (const tx of tokenTxs) hopMap.set(tx.txHash, tx);

    const mergedTxs = Array.from(hopMap.values());

    // Filter valid outgoing transfers from current address
    const candidateTxs = mergedTxs.filter((tx) => {
      const isFromCurrent = tx.fromAddress.toLowerCase() === currentKey;
      const isNotSelf = tx.toAddress && tx.toAddress.toLowerCase() !== currentKey;
      const isValidRecipient = Boolean(tx.toAddress);
      const isNotFailed = !tx.isFailed;
      const notInBranch = !currentItem.visitedPerBranch.has(tx.toAddress.toLowerCase());

      const symbol = tx.tokenSymbol || 'ETH';
      const matchesTarget = !activeTargetAsset || symbol.toUpperCase() === activeTargetAsset.toUpperCase();

      const matchesTemporal =
        !currentItem.timestampBoundary ||
        new Date(tx.timestamp).getTime() > new Date(currentItem.timestampBoundary).getTime();

      const usdVal = tx.usdValue || (tx.tokenAmount || tx.amountEth * 3000);
      const isAboveDust =
        usdVal >= TREE_TRACER_CONFIG.MIN_USD_VALUE_THRESHOLD ||
        tx.amountEth >= TREE_TRACER_CONFIG.MIN_ETH_VALUE_THRESHOLD;

      // Filter dust split: must be >= 10% of current node's taint
      const minSplitTaint = (currentItem.currentTaintUsd * TREE_TRACER_CONFIG.SPLIT_THRESHOLD_PERCENT) / 100;
      const meetsSplitThreshold = usdVal >= Math.min(minSplitTaint, TREE_TRACER_CONFIG.MIN_USD_VALUE_THRESHOLD);

      return (
        isFromCurrent &&
        isNotSelf &&
        isValidRecipient &&
        isNotFailed &&
        notInBranch &&
        matchesTarget &&
        matchesTemporal &&
        isAboveDust &&
        meetsSplitThreshold
      );
    });

    if (candidateTxs.length === 0) {
      branches.push({
        branchId: `Branch ${branchCounter++}`,
        hopCount: currentItem.pathHops.length,
        terminalAddress: currentAddr,
        terminalType: currentItem.currentTaintUsd < TREE_TRACER_CONFIG.MIN_USD_VALUE_THRESHOLD ? 'peeling_leaf' : 'dead_end',
        exchangeName: undefined,
        initialTaintedAmountUsd: currentItem.initialBranchTaintUsd,
        finalAmountUsd: currentItem.currentTaintUsd,
        taintPercentage: parseFloat(((currentItem.currentTaintUsd / rootTaintUsd) * 100).toFixed(1)),
        hops: currentItem.pathHops,
      });
      continue;
    }

    // Sort candidates by highest USD value
    candidateTxs.sort((a, b) => (b.usdValue || b.amountEth * 3000) - (a.usdValue || a.amountEth * 3000));

    // Cap outgoing branches to MAX_BRANCHES_PER_NODE (3)
    const selectedBranches = candidateTxs.slice(0, TREE_TRACER_CONFIG.MAX_BRANCHES_PER_NODE);

    if (selectedBranches.length > 1 && currentNode) {
      currentNode.isFanOut = true;
    }

    if (currentNode) {
      currentNode.outDegree = (currentNode.outDegree || 0) + selectedBranches.length;
    }

    for (const tx of selectedBranches) {
      const nextAddr = checksumAddress(tx.toAddress);
      const nextKey = nextAddr.toLowerCase();
      const symbol = tx.tokenSymbol || 'ETH';
      assetsDetectedSet.add(symbol);

      const txUsdVal = tx.usdValue || (tx.tokenAmount || tx.amountEth * 3000);
      const branchTaintPercent = Math.min((txUsdVal / (currentItem.currentTaintUsd || 1)) * 100, 100);

      const hop: TraceHop = {
        hopIndex: currentItem.depth + 1,
        fromAddress: currentAddr,
        toAddress: nextAddr,
        amountEth: tx.amountEth,
        txHash: tx.txHash,
        txTimestamp: tx.timestamp,
        tokenSymbol: symbol,
        tokenAmount: tx.tokenAmount,
        tokenDecimals: tx.tokenDecimals,
        usdValue: txUsdVal,
        isInternalTx: tx.isInternalTx,
        contractAddress: tx.contractAddress,
        confidence: 'high',
        taintedAmountUsd: txUsdVal,
      };

      // Record Edge
      edges.push({
        from: currentAddr,
        to: nextAddr,
        amountEth: tx.amountEth,
        txHash: tx.txHash,
        timestamp: tx.timestamp,
        tokenSymbol: symbol,
        usdValue: txUsdVal,
        isInternalTx: tx.isInternalTx,
        confidence: 'high',
        taintPercentage: parseFloat(branchTaintPercent.toFixed(1)),
      });

      // Handle Fan-In Convergence (Bug 1 Fix: Accumulate Taint)
      if (visitedGlobal.has(nextKey)) {
        const existingNode = visitedGlobal.get(nextKey)!;
        existingNode.isFanIn = true;
        existingNode.inDegree = (existingNode.inDegree || 0) + 1;
        // ACCUMULATE taint from converging branch (sum-accumulation)
        existingNode.taintedAmountUsd = (existingNode.taintedAmountUsd || 0) + txUsdVal;

        // Do NOT re-queue existingNode to prevent infinite loops, but record terminal branch
        const vasp = vaspLookup(nextAddr);
        branches.push({
          branchId: `Branch ${branchCounter++}`,
          hopCount: currentItem.pathHops.length + 1,
          terminalAddress: nextAddr,
          terminalType: vasp ? 'exchange' : 'dead_end',
          exchangeName: vasp,
          initialTaintedAmountUsd: currentItem.initialBranchTaintUsd,
          finalAmountUsd: txUsdVal,
          taintPercentage: parseFloat(((txUsdVal / rootTaintUsd) * 100).toFixed(1)),
          hops: [...currentItem.pathHops, hop],
        });
        continue;
      }

      // Check Circuit Breaker (Bug 2 Fix: MAX_TOTAL_NODES cap = 25)
      if (visitedGlobal.size >= TREE_TRACER_CONFIG.MAX_TOTAL_NODES) {
        isCapped = true;
        break;
      }

      // Create new node in global graph
      const vasp = vaspLookup(nextAddr);
      const newNode: GraphNode = {
        id: nextAddr,
        type: vasp ? 'exchange' : 'wallet',
        label: vasp || nextAddr.slice(0, 10) + '...',
        isFanOut: false,
        isFanIn: false,
        inDegree: 1,
        outDegree: 0,
        depth: currentItem.depth + 1,
        taintedAmountUsd: txUsdVal,
      };
      visitedGlobal.set(nextKey, newNode);

      // Create new branch path state
      const nextVisitedBranch = new Set(currentItem.visitedPerBranch);
      nextVisitedBranch.add(nextKey);

      queue.push({
        address: nextAddr,
        depth: currentItem.depth + 1,
        currentTaintUsd: txUsdUsdVal(txUsdVal),
        initialBranchTaintUsd: currentItem.depth === 0 ? txUsdVal : currentItem.initialBranchTaintUsd,
        pathHops: [...currentItem.pathHops, hop],
        timestampBoundary: tx.timestamp,
        visitedPerBranch: nextVisitedBranch,
      });
    }
  }

  function txUsdUsdVal(v: number) {
    return v > 0 ? v : 1;
  }

  // Calculate Aggregated Metrics
  const nodesArray = Array.from(visitedGlobal.values());
  const totalBranches = branches.length;
  const exchangeBranches = branches.filter((b) => b.terminalType === 'exchange').length;

  const totalTracedTaintUsd = branches.reduce((acc, b) => acc + b.finalAmountUsd, 0);
  const taintCoveragePercent = Math.min(
    parseFloat(((totalTracedTaintUsd / rootTaintUsd) * 100).toFixed(1)),
    100.0
  );

  const totalFanOutNodes = nodesArray.filter((n) => n.isFanOut).length;
  const totalFanInNodes = nodesArray.filter((n) => n.isFanIn).length;

  const primaryTerminalExchange = branches.find((b) => b.terminalType === 'exchange')?.exchangeName;
  const primaryTerminalType: TerminalType = exchangeBranches > 0 ? 'exchange' : 'inconclusive';

  // Build InvestigationTree object
  const tree: InvestigationTree = {
    rootAddress: rootAddr,
    targetAsset: activeTargetAsset || 'ETH',
    victimTxHash,
    victimAmountUsd: rootTaintUsd,
    nodes: nodesArray,
    edges,
    branches,
    totalBranches,
    exchangeBranches,
    taintCoveragePercent,
    totalFanOutNodes,
    totalFanInNodes,
    isCapped,
  };

  // Build InvestigationGraph for UI visualizer
  const graph: InvestigationGraph = {
    nodes: nodesArray,
    edges,
    terminal: {
      type: primaryTerminalType,
      exchangeName: primaryTerminalExchange,
    },
    assetsDetected: Array.from(assetsDetectedSet),
    targetAsset: activeTargetAsset || 'ETH',
    victimTxHash,
    victimAmountUsd: rootTaintUsd,
    tree,
  };

  // Calculate terminal wallet prior transaction count
  const lastTerminalAddr = branches.length > 0 ? branches[0].terminalAddress : rootAddr;
  let destinationWalletPriorTxCount = 0;
  try {
    const destEthTxs = await provider.getTransactions(lastTerminalAddr);
    destinationWalletPriorTxCount = destEthTxs.length;
  } catch (err) {
    destinationWalletPriorTxCount = 0;
  }

  return {
    tree,
    graph,
    terminalType: primaryTerminalType,
    terminalExchange: primaryTerminalExchange,
    assetsDetected: Array.from(assetsDetectedSet),
    destinationWalletPriorTxCount,
  };
}

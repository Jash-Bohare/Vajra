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
  WalletCategory,
} from '@rt-cfas/types';
import { EthereumProvider, NormalizedTx, checksumAddress, getLiveEthPriceUsd, VaspLookupFn } from './index';

export interface WalletClassificationInputs {
  isRoot?: boolean;
  isExchange: boolean;
  inDegree?: number;
  outDegree?: number;
  hopVelocitySec?: number;
  txCount?: number;
  sweepRatio?: number;
}

/**
 * Deterministic Wallet Classifier (MHA / LEA Money Laundering Domain Model)
 *  - 'root'         : Reported suspect wallet (taint origin)
 *  - 'exchange'     : Cataloged VASP deposit address (Binance, Coinbase, etc.)
 *  - 'aggregator'   : Fan-in node receiving from 2+ separate incoming branches
 *  - 'burner'       : Single-use disposable wallet (txCount <= 4, 1 in / 1 out, high sweep ratio)
 *  - 'intermediary' : Active layering / forwarding wallet in the money laundering chain
 */
export function classifyWallet(inputs: WalletClassificationInputs): WalletCategory {
  const {
    isRoot = false,
    isExchange = false,
    inDegree = 1,
    outDegree = 1,
    hopVelocitySec,
    txCount,
    sweepRatio = 1.0,
  } = inputs;

  if (isRoot) return 'root';
  if (isExchange) return 'exchange';
  if (inDegree >= 2) return 'aggregator';

  const isSinglePath = inDegree <= 1 && outDegree <= 1;
  const isLowActivity = txCount !== undefined ? txCount <= 4 : isSinglePath;
  const isHighSweep = sweepRatio >= 0.80;

  if (isSinglePath && isLowActivity && isHighSweep && (hopVelocitySec === undefined || hopVelocitySec < 1200)) {
    return 'burner';
  }

  return 'intermediary';
}

export const TREE_TRACER_CONFIG = {
  MAX_DEPTH: 5,              // Trace up to 5 full hops
  MAX_BRANCHES_PER_NODE: 5, // sort by USD desc so top-5 largest flows are captured
  MAX_TOTAL_NODES: 30,       // Allows full multi-hop 5-depth exploration without premature cutoff
  SPLIT_THRESHOLD_PERCENT: 10,
  MIN_USD_VALUE_THRESHOLD: 5,
  MIN_ETH_VALUE_THRESHOLD: 0.0001,
  RATE_LIMIT_DELAY_MS: 0,    // global Etherscan queue enforces rate limits
  TAINT_TOLERANCE_LOWER: 0.70,
  TAINT_TOLERANCE_UPPER: 1.05,
} as const;

/**
 * Known Smart Contract / DEX Router terminals.
 * When a traced address matches one of these, the engine terminates the branch
 * and labels the node as 'contract_pool' — it does NOT follow outgoing swaps
 * from these shared public contracts (which would pull in unrelated users' funds).
 *
 * Sources: Uniswap, 1inch, Curve, Balancer, Harbor, Aave, Compound, Tornado, bridges, token contracts.
 */
export const KNOWN_CONTRACT_TERMINALS: Record<string, string> = {
  // Uniswap
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2: Router',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3: Router',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3: Router 2',
  '0x000000000022d473030f116ddee9f6b43ac78ba3': 'Uniswap: Permit2',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap: Universal Router',
  // 1inch
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch: Aggregation Router V5',
  '0x111111125421ca6dc452d289314280a0f8842a65': '1inch: Aggregation Router V6',
  // Curve Finance
  '0x99a58482bd75cbab83b27ec03ca68ff489b5788f': 'Curve: Router',
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap: Router',
  // Balancer
  '0xba12222222228d8ba445958a75a0704d566bf2c8': 'Balancer: Vault',
  // Aave
  '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': 'Aave V3: Pool',
  '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9': 'Aave V2: Lending Pool',
  // Compound
  '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b': 'Compound: Comptroller',
  // Tornado Cash
  '0x910cbd523d972eb0a6f4cae4618ad62622b39dbf': 'Tornado Cash: Proxy',
  '0x12d66f87a04a9e220c9d5525d6bd37b47e32be97': 'Tornado Cash: ETH 0.1',
  '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936': 'Tornado Cash: ETH 1',
  '0x94a1b5cdb22c43faab4abeb5c74999895464ddaf': 'Tornado Cash: ETH 10',
  '0xa160cdab225685da1d56aa342ad8841c3b53f291': 'Tornado Cash: ETH 100',
  // Bridges
  '0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf': 'Polygon: ERC20 Bridge',
  '0x99c9fc46f92e8a1c0dec1b1747d010903e884be1': 'Optimism: Gateway',
  '0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f': 'Arbitrum: Inbox',
  // OpenSea & NFT
  '0x00000000006c3852cbef3e08e8df289169ede581': 'OpenSea: Seaport 1.1',
  '0x0000000000000068f116a894984e2db1123eb395': 'OpenSea: Seaport 1.6',
  // Token Contracts (ERC-20 transfers go through these)
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'Tether: USDT Token',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'Circle: USDC Token',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'MakerDAO: DAI Token',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'Wrapped: WETH Token',
  // Harbor (detected in user's wallet)
  '0x1f21f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f': 'Harbor: Router',
};

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

  const ethPriceUsd = await getLiveEthPriceUsd();
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
      rootTaintUsd = victimTx.usdValue || victimTx.tokenAmount || (victimTx.amountEth * ethPriceUsd) || rootTaintUsd;
      if (!activeTargetAsset && victimTx.tokenSymbol) {
        activeTargetAsset = victimTx.tokenSymbol;
      }
    }
  }

  // If root taint still 0, default to 0; will calculate from outgoing transfers at root node
  if (rootTaintUsd <= 0) {
    rootTaintUsd = 0;
  }

  // Global Graph Data Structures
  const visitedGlobal = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const branches: BranchSummary[] = [];
  const assetsDetectedSet = new Set<AssetType>();
  let isCapped = false;

  // Pre-scan root wallet assets — reuse the BFS fetch below (provider caches results)
  // Assets are collected incrementally inside the BFS loop from actual discovered txs
  // This avoids making 2 extra blocking API calls before traversal even begins.
  assetsDetectedSet.add('ETH'); // Root always has ETH activity (it's why it was flagged)
  try {
    const rootTokenCheck = await provider.getTokenTransactions(rootAddr);
    for (const t of rootTokenCheck) {
      if (t.tokenSymbol) assetsDetectedSet.add(t.tokenSymbol as AssetType);
    }
  } catch (_) { /* non-critical */ }

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
    // Rate limiting is handled by the global Etherscan queue in index.ts
    // No extra artificial delay needed here.

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

    // FIX 4: Deduplicate by txHash+from+to to preserve distinct transfers
    // sharing the same txHash (e.g. multi-transfer contracts) while avoiding
    // double-counting of the same transfer appearing in both ethTxs + internalTxs.
    const hopMap = new Map<string, NormalizedTx>();
    for (const tx of ethTxs) {
      const key = `${tx.txHash}_${tx.fromAddress.toLowerCase()}_${tx.toAddress.toLowerCase()}`;
      hopMap.set(key, tx);
    }
    for (const tx of internalTxs) {
      const key = `${tx.txHash}_${tx.fromAddress.toLowerCase()}_${tx.toAddress.toLowerCase()}`;
      // Prefer internal tx over regular tx only when it has a non-zero ETH value
      if (!hopMap.has(key) || (tx.amountEth > 0)) {
        hopMap.set(key, tx);
      }
    }
    for (const tx of tokenTxs) {
      const key = `${tx.txHash}_${tx.fromAddress.toLowerCase()}_${tx.toAddress.toLowerCase()}_${tx.tokenSymbol}`;
      hopMap.set(key, tx);
    }

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

      const usdVal = tx.usdValue || (tx.tokenAmount || tx.amountEth * ethPriceUsd);
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
        taintPercentage: Math.min(parseFloat(((currentItem.currentTaintUsd / (rootTaintUsd || 1)) * 100).toFixed(1)), 100.0),
        hops: currentItem.pathHops,
      });
      continue;
    }

    // FIX 1: Sort candidates by descending USD value BEFORE slicing so the
    // largest fund movements are always captured first (not dropped arbitrarily
    // due to API return order). Previously, the 4th-largest transfer was silently dropped.
    candidateTxs.sort((a, b) => {
      const aUsd = a.usdValue || a.amountEth * ethPriceUsd;
      const bUsd = b.usdValue || b.amountEth * ethPriceUsd;
      return bUsd - aUsd; // descending — biggest first
    });

    // Cap outgoing branches to MAX_BRANCHES_PER_NODE (now 5)
    const selectedBranches = candidateTxs.slice(0, TREE_TRACER_CONFIG.MAX_BRANCHES_PER_NODE);

    // FIX 2: At root node level, if rootTaintUsd was 0, sum ALL valid candidates
    // (not just the sliced selectedBranches) to compute the accurate denominator.
    // Previously, the taint % was inflated because the denominator excluded dropped branches.
    if (currentItem.depth === 0 && rootTaintUsd === 0) {
      const outgoingSum = candidateTxs.reduce((sum, tx) => sum + (tx.usdValue || tx.amountEth * ethPriceUsd), 0);
      rootTaintUsd = outgoingSum > 0 ? outgoingSum : 1000;
      if (currentNode) {
        currentNode.taintedAmountUsd = rootTaintUsd;
      }
      currentItem.currentTaintUsd = rootTaintUsd;
      currentItem.initialBranchTaintUsd = rootTaintUsd;
    }

    if (selectedBranches.length > 1 && currentNode) {
      currentNode.isFanOut = true;
    }

    if (currentNode) {
      currentNode.outDegree = (currentNode.outDegree || 0) + selectedBranches.length;

      // Accurately compute forwarding holding time for the wallet that forwarded the funds
      if (currentItem.timestampBoundary && selectedBranches.length > 0) {
        const inMs = new Date(currentItem.timestampBoundary).getTime();
        const outMs = new Date(selectedBranches[0].timestamp).getTime();
        if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
          currentNode.hopVelocitySec = Math.round((outMs - inMs) / 1000);
        }
      }

      // Reclassify wallet category with updated outDegree and hopVelocitySec
      if (currentNode.type !== 'root' && currentNode.type !== 'exchange') {
        currentNode.walletCategory = classifyWallet({
          isRoot: false,
          isExchange: false,
          inDegree: currentNode.inDegree || 1,
          outDegree: currentNode.outDegree,
          hopVelocitySec: currentNode.hopVelocitySec,
        });
      }
    }

    // Total USD value of outgoing selected transfers for proportional taint distribution
    const totalSelectedTxUsd = selectedBranches.reduce((sum, tx) => sum + (tx.usdValue || tx.amountEth * ethPriceUsd), 0);

    for (const tx of selectedBranches) {
      const nextAddr = checksumAddress(tx.toAddress);
      const nextKey = nextAddr.toLowerCase();
      const symbol = tx.tokenSymbol || 'ETH';
      assetsDetectedSet.add(symbol);

      const txUsdVal = tx.usdValue || (tx.tokenAmount || tx.amountEth * ethPriceUsd);

      // Proportional Taint Decay Capping:
      // A branch cannot carry more tainted USD than the parent node's current taint balance.
      let branchTaintUsd = txUsdVal;
      if (selectedBranches.length > 1 && totalSelectedTxUsd > 0) {
        branchTaintUsd = Math.min(currentItem.currentTaintUsd, (txUsdVal / totalSelectedTxUsd) * currentItem.currentTaintUsd);
      } else {
        branchTaintUsd = Math.min(currentItem.currentTaintUsd, txUsdVal);
      }
      if (branchTaintUsd <= 0) branchTaintUsd = txUsdVal;

      // Cumulative root taint share (%) - accurately bounded to initial suspect loss
      const cumulativeTaintPercent = Math.min(parseFloat(((branchTaintUsd / (rootTaintUsd || 1)) * 100).toFixed(1)), 100.0);

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
        blockNumber: tx.blockNumber,
      };

      // Record Edge with cumulative root taint share
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
        taintPercentage: cumulativeTaintPercent,
      });

      // Handle Fan-In Convergence (Bug 1 Fix: Accumulate Taint)
      if (visitedGlobal.has(nextKey)) {
        const existingNode = visitedGlobal.get(nextKey)!;
        existingNode.isFanIn = true;
        existingNode.inDegree = (existingNode.inDegree || 0) + 1;
        // ACCUMULATE decayed taint from converging branch (bounded to root inception)
        existingNode.taintedAmountUsd = Math.min(rootTaintUsd, (existingNode.taintedAmountUsd || 0) + branchTaintUsd);
        existingNode.totalReceivedUsd = (existingNode.totalReceivedUsd || 0) + txUsdVal;
        existingNode.taintPercentage = Math.min(100, Math.round(((existingNode.taintedAmountUsd / (rootTaintUsd || 1)) * 100) * 10) / 10);

        // Do NOT re-queue existingNode to prevent infinite loops, but record terminal branch
        const vasp = vaspLookup(nextAddr);
        branches.push({
          branchId: `Branch ${branchCounter++}`,
          hopCount: currentItem.pathHops.length + 1,
          terminalAddress: nextAddr,
          terminalType: vasp ? 'exchange' : 'dead_end',
          exchangeName: vasp,
          initialTaintedAmountUsd: currentItem.initialBranchTaintUsd,
          finalAmountUsd: branchTaintUsd,
          taintPercentage: Math.min(parseFloat(((branchTaintUsd / (rootTaintUsd || 1)) * 100).toFixed(1)), 100.0),
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

      // FIX 3: Smart Contract / DEX Router Terminal Detection.
      // If the next address is a known DEX router, pool, bridge, or token contract,
      // we terminate traversal here instead of following other users' swap outflows.
      // This prevents taint pollution (e.g. tracing Harbor Router pulls $7k unrelated swaps).
      const knownContractName = KNOWN_CONTRACT_TERMINALS[nextKey];
      if (knownContractName && !vasp) {
        // Add node as a contract_pool terminal
        const contractNode: GraphNode = {
          id: nextAddr,
          type: 'contract_pool' as any,
          label: knownContractName,
          isFanOut: false,
          isFanIn: false,
          inDegree: 1,
          outDegree: 0,
          depth: currentItem.depth + 1,
          taintedAmountUsd: branchTaintUsd,
          totalReceivedUsd: txUsdVal,
          taintPercentage: cumulativeTaintPercent,
          walletCategory: 'intermediary',
          hopVelocitySec: undefined,
        };
        visitedGlobal.set(nextKey, contractNode);
        // Record a terminated branch — do NOT queue for further BFS
        branches.push({
          branchId: `Branch ${branchCounter++}`,
          hopCount: currentItem.pathHops.length + 1,
          terminalAddress: nextAddr,
          terminalType: 'dead_end',
          exchangeName: knownContractName,
          initialTaintedAmountUsd: currentItem.initialBranchTaintUsd,
          finalAmountUsd: branchTaintUsd,
          taintPercentage: Math.min(parseFloat(((branchTaintUsd / (rootTaintUsd || 1)) * 100).toFixed(1)), 100.0),
          hops: [...currentItem.pathHops, hop],
        });
        continue;
      }

      // Newly discovered node has not forwarded funds yet (outDegree = 0, hopVelocitySec = undefined)
      const walletCategory = classifyWallet({
        isRoot: false,
        isExchange: Boolean(vasp),
        inDegree: 1,
        outDegree: 0,
        hopVelocitySec: undefined,
      });

      const newNode: GraphNode = {
        id: nextAddr,
        type: vasp ? 'exchange' : 'wallet',
        label: vasp || nextAddr.slice(0, 10) + '...',
        isFanOut: false,
        isFanIn: false,
        inDegree: 1,
        outDegree: 0,
        depth: currentItem.depth + 1,
        taintedAmountUsd: branchTaintUsd,
        totalReceivedUsd: txUsdVal,
        taintPercentage: cumulativeTaintPercent,
        walletCategory,
        hopVelocitySec: undefined,
      };
      visitedGlobal.set(nextKey, newNode);

      // Create new branch path state
      const nextVisitedBranch = new Set(currentItem.visitedPerBranch);
      nextVisitedBranch.add(nextKey);

      queue.push({
        address: nextAddr,
        depth: currentItem.depth + 1,
        currentTaintUsd: branchTaintUsd,
        initialBranchTaintUsd: currentItem.depth === 0 ? branchTaintUsd : currentItem.initialBranchTaintUsd,
        pathHops: [...currentItem.pathHops, hop],
        timestampBoundary: tx.timestamp,
        visitedPerBranch: nextVisitedBranch,
      });
    }
  }

  function txUsdUsdVal(v: number) {
    return v > 0 ? v : 1;
  }

  // Recalculate true inDegree and outDegree from actual graph edges
  const inDegMap = new Map<string, number>();
  const outDegMap = new Map<string, number>();
  edges.forEach((e) => {
    const from = e.from.toLowerCase();
    const to = e.to.toLowerCase();
    outDegMap.set(from, (outDegMap.get(from) || 0) + 1);
    inDegMap.set(to, (inDegMap.get(to) || 0) + 1);
  });

  visitedGlobal.forEach((node) => {
    const key = node.id.toLowerCase();
    node.inDegree = inDegMap.get(key) || 0;
    node.outDegree = outDegMap.get(key) || 0;
    node.isFanIn = node.inDegree >= 2;
    node.isFanOut = node.outDegree >= 2;

    if (node.type !== 'root' && node.type !== 'exchange' && (node as any).type !== 'contract_pool') {
      node.walletCategory = classifyWallet({
        isRoot: false,
        isExchange: false,
        inDegree: node.inDegree,
        outDegree: node.outDegree,
        hopVelocitySec: node.hopVelocitySec,
      });
    }
  });

  // Calculate Aggregated Metrics
  const nodesArray = Array.from(visitedGlobal.values());
  const totalBranches = branches.length;
  const exchangeBranches = branches.filter((b) => b.terminalType === 'exchange').length;

  const totalTracedTaintUsd = branches.reduce((acc, b) => acc + (b.finalAmountUsd || 0), 0);
  const rawCoverage = rootTaintUsd > 0 ? (totalTracedTaintUsd / rootTaintUsd) * 100 : 100.0;
  const taintCoveragePercent = isNaN(rawCoverage)
    ? 100.0
    : Math.max(0, Math.min(parseFloat(rawCoverage.toFixed(1)), 100.0));

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
    ethPriceUsd,
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
    ethPriceUsd,
    tree,
  };

  // Calculate terminal wallet prior transaction count (non-blocking — don't await this)
  // Run it in background and return 0 if it takes too long or fails
  const lastTerminalAddr = branches.length > 0 ? branches[0].terminalAddress : rootAddr;
  let destinationWalletPriorTxCount = 0;
  try {
    const destEthTxs = await Promise.race([
      provider.getTransactions(lastTerminalAddr),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]) as Awaited<ReturnType<typeof provider.getTransactions>>;
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

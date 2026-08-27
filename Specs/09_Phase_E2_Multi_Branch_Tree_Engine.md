# Spec 09 — Phase E2: Multi-Branch Tree Tracing Engine
### Vajra LEA Enterprise Edition | Real-Time Crypto Fraud Attribution System (RT-CFAS)
**Phase:** E2 — Multi-Branch Tree Tracing Engine (Fan-Out & Fan-In)
**Target Date:** August 30, 2026
**Owner:** Blockchain Lead + MERN Dev
**Branch:** `phase-e2`
**Prerequisite:** Phase E1 (`main`, Commit `f6c2567`) fully merged and verified

---

## 1. Executive Summary

Phase E2 is the second enterprise upgrade to RT-CFAS. The current tracer (`services/blockchain/src/tracer.ts`) follows a **single greedy path** — at each hop it picks exactly one outgoing transaction and follows it forward. This is correct behavior for simple layering chains, but **real-world organized cybercrime syndicates use fund splitting** to evade linear tracing.

Phase E2 replaces the single-path greedy algorithm with a **Multi-Branch Tree Traversal Engine** that:

1. **Detects Fan-Out (Splitting)** — A suspect wallet sends the stolen amount to 2 or more wallets simultaneously (e.g. 10,000 USDT split into 6,000 USDT + 4,000 USDT).
2. **Detects Fan-In (Merging)** — Multiple previously split wallets re-combine funds into a single destination wallet before depositing to an exchange.
3. **Renders a Full Tree Graph** — The Cytoscape.js canvas now shows a branching tree of fund flow, not a linear chain, giving investigators a complete picture of the entire money laundering network topology.
4. **Computes Aggregate Taint Coverage** — Reports the total percentage of tainted funds accounted for across all tree branches combined.

**Acceptance Criteria:** The investigator UI displays a multi-branch Cytoscape.js fund-flow tree with expandable/collapsible nodes, branch-level taint percentages, fan-out and fan-in annotations, and an updated risk score that accounts for the full tree topology.

---

## 2. Problem Statement: Why Phase E2 Matters

### 2.1 The Single-Path Blind Spot

The current tracer picks the **single best next hop** using the 3-Tier TLFT selection algorithm (VASP match → Taint Match → Closest Proportion). This is correct when a scammer moves funds linearly:

```
Victim → Wallet A → Wallet B → Binance
```

But it **completely misses** organized syndicate behavior:

```
Victim → Wallet A ──→ Wallet B (6,000 USDT) → Coinbase [MISSED]
                  └──→ Wallet C (4,000 USDT) → Binance  [FOLLOWED]
```

In this case, the investigator sees only the Binance path and misses a Coinbase deposit worth ₹5 lakh — potentially letting a suspect walk free.

### 2.2 Real-World India Syndicate Patterns (NCRP Data)

```
Pattern 1: Simple Fan-Out (2 branches)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Victim → Suspect Wallet
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Wallet B (60%)     Wallet C (40%)
    ↓                   ↓
  Binance            WazirX

Pattern 2: Fan-Out then Fan-In (Hourglass)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Victim → Suspect Wallet
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Wallet B           Wallet C
    └──────┬────────────┘
           ↓
       Aggregator Wallet
           ↓
         Binance

Pattern 3: Deep Multi-Hop Per Branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Victim → Suspect Wallet
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Wallet B           Wallet C
    ↓                   ↓
Wallet D           Wallet E
    ↓                   ↓
 Coinbase           Binance
```

Phase E2 catches all three patterns.

---

## 3. Architecture Overview

### 3.1 System Component Map (What Changes in Phase E2)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Phase E2 Change Scope                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   packages/types/src/index.ts          ← ADD: TreeNode, TreeEdge,           │
│                                              TraceTree, BranchSummary        │
│                                                                              │
│   services/blockchain/src/             ← CORE CHANGES                        │
│     treeTracer.ts                     ← NEW: BFS tree traversal engine       │
│     tracer.ts                         ← MODIFY: keep linear path for         │
│                                              backwards compat & simple cases  │
│                                                                              │
│   services/risk/                       ← MODIFY                              │
│     rules.py                          ← ADD: tree topology risk features     │
│     models.py                         ← ADD: TreeNode model, BranchSummary   │
│                                                                              │
│   apps/api/src/routes/                 ← MODIFY                              │
│     investigations.ts                 ← ADD: tree mode param, tree response  │
│                                                                              │
│   apps/web/src/                        ← UI CHANGES                          │
│     components/GraphVisualizer.tsx    ← MODIFY: Cytoscape tree layout,       │
│                                              fan-out/fan-in badges            │
│     components/BranchSummaryCard.tsx  ← NEW: per-branch taint summary table  │
│     pages/ResultsPage.tsx             ← MODIFY: tree mode results layout     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow (Phase E1 vs Phase E2)

**Phase E1 (Current):**
```
Root Wallet
    → Single Path Greedy Tracer
    → Linear Hop Array [Hop 1, Hop 2, Hop 3, ...]
    → Risk Score (linear features)
    → Cytoscape Linear Chain Graph
```

**Phase E2:**
```
Root Wallet
    → Multi-Branch BFS Tree Tracer
    → Tree Structure {
          root: TreeNode,
          branches: [
              Branch 1: [Hop 1a, Hop 2a, Hop 3a → Coinbase],
              Branch 2: [Hop 1b, Hop 2b → Binance],
          ],
          fanOutNodes: [...],
          fanInNodes:  [...],
      }
    → Risk Score (tree topology features: fanOutRatio, branchCount, fanInDetected)
    → Cytoscape Hierarchical Tree Canvas (breadthfirst layout)
```

---

## 4. Detailed Technical Specification

### 4.1 TypeScript Data Contract Changes (`packages/types/src/index.ts`)

#### 4.1.1 New `TreeNode` Interface

A single node (wallet) in the multi-branch fund flow tree.

```typescript
export interface TreeNode {
  address: string;                  // Checksummed wallet address
  depth: number;                    // Tree depth (0 = root, 1 = first hop, etc.)
  branchId: string;                 // Unique branch identifier (e.g. "0", "0.0", "0.1")
  parentAddress?: string;           // Parent wallet address (undefined for root)

  // VASP / Exchange Attribution
  isVasp: boolean;                  // true if matched against VASP database
  vaspName?: string;                // Exchange name (e.g. "Coinbase", "Binance")

  // Asset & Value Information
  tokenSymbol?: AssetType;          // Asset received at this node
  tokenAmount?: number;             // Amount received
  usdValue?: number;                // USD value received

  // Taint Tracking
  incomingTxHash?: string;          // Transaction hash that funded this node
  incomingTimestamp?: string;       // Timestamp of incoming transfer
  taintedAmountUsd?: number;        // Tainted USD value entering this node
  taintPercentage?: number;         // % of original stolen amount (0–100)

  // Fan-Out / Fan-In Detection
  isFanOutNode: boolean;            // true if this node sent to ≥ 2 children
  isFanInNode: boolean;             // true if this node received from ≥ 2 parents
  fanOutCount?: number;             // Number of outgoing branches from this node
  fanInCount?: number;              // Number of parent nodes converging here
  confidence?: HopConfidence;       // 'high' | 'low' (TLFT selection confidence)
}
```

#### 4.1.2 New `TreeEdge` Interface

A directed transfer edge in the tree graph.

```typescript
export interface TreeEdge {
  from: string;                     // Sender address (checksummed)
  to: string;                       // Receiver address (checksummed)
  txHash: string;
  timestamp: string;
  tokenSymbol?: AssetType;
  tokenAmount?: number;
  amountEth?: number;
  usdValue?: number;
  isInternalTx?: boolean;
  taintedAmountUsd?: number;
  taintPercentage?: number;         // % of original stolen amount on this edge
  confidence?: HopConfidence;
}
```

#### 4.1.3 New `BranchSummary` Interface

A summary of a single leaf-to-root branch.

```typescript
export interface BranchSummary {
  branchId: string;                 // Unique branch ID
  depth: number;                    // Number of hops in this branch
  terminalAddress: string;          // Leaf node address (exchange or dead-end)
  terminalType: TerminalType;       // 'exchange' | 'inconclusive'
  terminalExchange?: string;        // Exchange name if VASP matched
  taintedAmountUsd?: number;        // Tainted amount that reached the terminal
  taintPercentage?: number;         // % of original stolen amount on this branch
  hops: TraceHop[];                 // Linear hop array for this branch (for PDF reports)
}
```

#### 4.1.4 New `TraceTree` Interface

The complete multi-branch tree result from Phase E2 tracer.

```typescript
export interface TraceTree {
  rootAddress: string;              // Starting suspect wallet
  nodes: TreeNode[];                // ALL nodes in the tree (all branches combined)
  edges: TreeEdge[];                // ALL edges in the tree (all branches combined)
  branches: BranchSummary[];        // Per-branch summaries (one per leaf node)

  // Aggregated Tree Statistics
  totalBranches: number;            // Total number of leaf branches
  totalFanOutNodes: number;         // Nodes where splitting occurred
  totalFanInNodes: number;          // Nodes where re-merging occurred
  maxDepth: number;                 // Deepest hop depth reached
  exchangeBranches: number;         // Number of branches that terminated at a VASP
  totalTaintedUsd: number;          // Sum of tainted USD across all branches
  taintCoveragePercent: number;     // % of victim amount accounted for across all branches

  // Asset Info
  assetsDetected: AssetType[];
  targetAsset?: AssetType;

  // Victim Tx Reference (from E1)
  victimTxHash?: string;
  victimAmountUsd?: number;
  victimTxTimestamp?: string;
}
```

#### 4.1.5 Updated `InvestigationGraph` (backwards-compatible addition)

```typescript
export interface InvestigationGraph {
  // ---- Existing Fields (Phase E1, unchanged) ----
  nodes: GraphNode[];
  edges: GraphEdge[];
  terminal: { type: TerminalType; exchangeName?: string; };
  assetsDetected?: AssetType[];
  targetAsset?: AssetType;
  victimTxHash?: string;
  victimAmountUsd?: number;

  // ---- Phase E2 New Field ----
  tree?: TraceTree;                 // Full multi-branch tree (present when traceMode='tree')
}
```

#### 4.1.6 Updated `CreateInvestigationRequest`

```typescript
export interface CreateInvestigationRequest {
  walletAddress: string;
  targetAsset?: AssetType;
  victimTxHash?: string;
  victimAmountUsd?: number;
  sessionId?: string;

  // Phase E2 addition
  traceMode?: 'linear' | 'tree';    // Default: 'tree' in Phase E2
  maxBranches?: number;             // Max outgoing branches per node (default: 3)
  splitThresholdPercent?: number;   // Min % of taint to count as a branch (default: 10%)
}
```

#### 4.1.7 Updated `RiskScoreRequest`

```typescript
export interface RiskScoreRequest {
  traceHops: TraceHop[];            // Kept for linear compat
  terminalType?: TerminalType;
  destinationWalletPriorTxCount?: number;

  // Phase E2 additions
  traceTree?: TraceTree;            // Full tree (used when traceMode='tree')
  victimTxHash?: string;            // ← REQUIRED for topology risk rules to fire (false-positive guard)
  isFanOutDetected?: boolean;
  isFanInDetected?: boolean;
  totalBranches?: number;
  exchangeBranches?: number;
  taintCoveragePercent?: number;
}
```

---

### 4.2 New Tree Tracer Engine (`services/blockchain/src/treeTracer.ts`)

This is the **core new file** in Phase E2. It implements a **Breadth-First Search (BFS) tree traversal** with fan-out detection, taint splitting, and fan-in detection.

#### 4.2.1 Algorithm Design: BFS Tree Traversal

```
PHASE E2 BFS TREE ALGORITHM
════════════════════════════════════════════════

Input:
  - rootAddress: string
  - victimTxHash?: string          (for T_crime temporal gate)
  - targetAsset?: AssetType        (from E1 2-step asset selector)
  - maxDepth: number               (default: 5)
  - maxBranchesPerNode: number     (default: 3)
  - splitThresholdPercent: number  (default: 10%)

State maintained per BFS node:
  - address: string
  - depth: number
  - branchId: string
  - taintedAmountUsd: number       (decaying taint carried from parent)
  - timestampBoundary: string      (temporal gate: must be after parent's tx)
  - parentAddress?: string
  - parentTxHash?: string

Algorithm:
────────────────────────────────────────────────
1. Initialize Queue = [{ address: rootAddress, depth: 0, taintedUsd: victimAmountUsd }]
2. Initialize visited Set = { rootAddress }
3. Initialize allNodes = [rootNode], allEdges = [], allBranches = []

4. While Queue is not empty:
   a. Dequeue node = queue.shift()

   b. Fetch all outgoing txs from node.address:
      → provider.getTransactions(addr)
      → provider.getTokenTransactions(addr)
      → provider.getInternalTransactions(addr)
      → Merge + Deduplicate (same priority as E1: tokenTx > internalTx > ethTx)

   c. Apply filters (same as E1 linear tracer):
      → isOutgoing (from === node.address)
      → isNotFailed
      → matchesTargetAsset (if specified)
      → matchesTemporalGate (timestamp > node.timestampBoundary)
      → notVisitedByThisBranch (prevent branch-level loops)
      → hasValue (usdValue >= 1 OR amountEth >= 0.0001)

   d. Apply FAN-OUT SPLIT THRESHOLD FILTER:
      → For each candidate tx, compute splitRatio = tx.usdValue / node.taintedUsd
      → Keep only candidates where splitRatio >= splitThresholdPercent (default 10%)
      → This prevents tracing micro-dust leftover transactions that are irrelevant

   e. Select branches using DETERMINISTIC MULTI-SELECT:
      → Sort candidates descending by usdValue
      → Take top min(candidates.length, maxBranchesPerNode) candidates
      → These are the outgoing branches from this node

   f. If selected.length == 0:
      → Mark node as LEAF (dead-end terminal)
      → Create BranchSummary(terminalType='inconclusive') for this branch
      → Continue

   g. If selected.length == 1:
      → Single forward hop (linear — no fan-out)
      → Create TreeEdge, push child to Queue

   h. If selected.length >= 2:
      → FAN-OUT DETECTED at node
      → Mark node.isFanOutNode = true, node.fanOutCount = selected.length
      → Split taint proportionally:
           taintSplit[i] = node.taintedUsd * (tx[i].usdValue / totalBranchUsd)
      → Create TreeEdges for all children
      → Push all children to Queue with their proportional taint

   i. For each child node created:
      → Check if child.address already exists in visitedGlobal (from ANOTHER branch)
      → If yes: FAN-IN DETECTED
           → Mark child node as isFanInNode = true, increment fanInCount

           ⚠️  [BUG 1 FIX] TAINT ACCUMULATION ON FAN-IN:
           The existing node's taintedAmountUsd must be SUMMED with this new
           converging branch's taint — not left at whatever the first-arriving
           branch set it to. Whichever branch BFS processes second carries
           real stolen funds; silently discarding its taint under-counts the
           merged total and breaks all downstream calculations.

           Correct implementation:
             existingNode.taintedAmountUsd =
               (existingNode.taintedAmountUsd ?? 0) + incomingBranchTaintUsd;
             existingNode.taintPercentage =
               (existingNode.taintedAmountUsd / victimAmountUsd) * 100;

           → Do NOT re-queue (fan-in node was already queued by first branch)
           → DO add the convergence edge so Cytoscape shows the arrow visually

   j. [BUG 2 FIX] HARD CIRCUIT BREAKER — MAX_TOTAL_NODES:
      → Before pushing ANY child to the queue, check:
           if (visitedGlobal.size >= MAX_TOTAL_NODES) → stop exploring, mark current node as leaf
      → Rationale: MAX_BRANCHES_PER_NODE=3 and MAX_DEPTH=5 gives 3^5=243 nodes
        worst-case, not the ~15 assumed in Section 7. A bushy real wallet could
        silently consume 729 API calls and hang the demo for minutes.
      → MAX_TOTAL_NODES = 25 (set in TREE_TRACER_CONFIG, see Section 5)

   k. Check if child address is in VASP map:
      → If yes: Mark as VASP terminal, create BranchSummary(terminalType='exchange')
               Do NOT push to queue (terminal reached)
      → If no: Push to queue if depth < maxDepth AND visitedGlobal.size < MAX_TOTAL_NODES

   l. If node.depth == maxDepth OR visitedGlobal.size >= MAX_TOTAL_NODES:
      → Mark as LEAF (max depth / node cap terminal)
      → Create BranchSummary(terminalType='inconclusive')

5. Compute aggregate stats:
   → taintCoveragePercent = (sum of all terminal taintedAmountUsd) / victimAmountUsd * 100
   → Return TraceTree { nodes, edges, branches, stats }
```

#### 4.2.2 Taint Splitting Logic

When a fan-out is detected at a node, the decaying taint is split proportionally across all outgoing branches:

```typescript
// Proportional taint splitting at a fan-out node
const totalBranchValueUsd = selectedTxs.reduce((sum, tx) => sum + (tx.usdValue ?? 0), 0);

for (const tx of selectedTxs) {
  const branchFraction = (tx.usdValue ?? 0) / totalBranchValueUsd;
  const childTaintedUsd = parentNode.taintedAmountUsd * branchFraction;
  const childTaintPercent = (childTaintedUsd / victimAmountUsd) * 100;
  // childTaintedUsd is passed to the child node for next-hop selection
}
```

**Example:**
- Victim amount: 10,000 USDT (= 100% taint)
- Fan-out: 6,000 USDT to Wallet B + 4,000 USDT to Wallet C
- Wallet B carries: 60% taint = 6,000 USDT tainted
- Wallet C carries: 40% taint = 4,000 USDT tainted

#### 4.2.3 Fan-In Taint Accumulation Logic (Bug 1 Fix)

Fan-in occurs when two or more independently traced branches send funds to the same wallet. The **critical requirement** is that the fan-in node's `taintedAmountUsd` is the **sum** of all converging branches — not the amount carried by whichever branch happened to arrive first in BFS order.

```typescript
const childAddress = checksumAddress(selectedTx.toAddress);
const incomingBranchTaintUsd = currentQueueItem.taintedAmountUsd *
  ((selectedTx.usdValue ?? 0) / totalBranchValueUsd);

if (visitedGlobal.has(childAddress.toLowerCase())) {
  // FAN-IN DETECTED: accumulate taint from this converging branch
  const existingNode = allNodes.find(n => n.address.toLowerCase() === childAddress.toLowerCase());
  if (existingNode) {
    existingNode.isFanInNode = true;
    existingNode.fanInCount = (existingNode.fanInCount ?? 1) + 1;

    // ✅ Correct: ADD this branch's taint to the existing accumulated total
    existingNode.taintedAmountUsd = (existingNode.taintedAmountUsd ?? 0) + incomingBranchTaintUsd;
    existingNode.taintPercentage = victimAmountUsd > 0
      ? (existingNode.taintedAmountUsd / victimAmountUsd) * 100
      : undefined;
  }
  // Add convergence edge for visual display (Cytoscape shows the arrow)
  allEdges.push(convergenceEdge);
  // Do NOT re-queue — BFS will process it via the first-arriving branch
  continue;
}
visitedGlobal.add(childAddress.toLowerCase());
```

#### 4.2.4 Visit Tracking: Branch-Level vs Global

Two distinct visited sets are maintained:

| Set | Scope | Purpose |
|-----|-------|---------|
| `visitedGlobal` | Entire tree | Prevents the same node from being explored twice (fan-in detection) |
| `visitedPerBranch` | Each branch path | Prevents a single branch from looping back to its own ancestor |

Branch-level `visitedPerBranch` is maintained as a Set inherited from the parent at each BFS push. It starts with just `[rootAddress]` and grows as each branch explores forward.

#### 4.2.5 Rate Limiting Strategy

The BFS tree tracer makes significantly more API calls than the linear tracer (up to `3 calls × nodeCount`). Rate-limit throttling:

```typescript
// Between each wallet's 3-API fetch batch, wait 750ms
// Rationale: 3 parallel calls per node / 600ms = exactly 5 req/sec — the
// Etherscan free-tier ceiling with zero margin. Network jitter or a slightly
// slow timer fires a 429 mid-demo. 750ms gives a safe buffer below the ceiling.
await new Promise(resolve => setTimeout(resolve, 750));
```

The existing 10-minute in-memory cache in `EthereumProvider` prevents redundant re-fetches when the same wallet address appears in multiple branches (critical for fan-in scenarios).

---

### 4.3 API Layer Changes (`apps/api/src/routes/investigations.ts`)

#### 4.3.1 Request Parsing

The `POST /api/investigations` route now reads the `traceMode` field:

```typescript
const {
  walletAddress,
  targetAsset,
  victimTxHash,
  victimAmountUsd,
  sessionId,
  traceMode = 'tree',       // Phase E2: default to tree mode
  maxBranches = 3,
  splitThresholdPercent = 10,
} = req.body;
```

#### 4.3.2 Conditional Execution

```typescript
let traceResult: TraceResult | undefined = undefined;
let treeResult: TraceTree | undefined = undefined;

if (traceMode === 'linear') {
  // Phase E1 linear tracer (backwards compatible)
  traceResult = await traceWalletHops(formattedAddr, provider, vaspLookup, 5, targetAsset, victimTxHash);
} else {
  // Phase E2 BFS tree tracer
  treeResult = await traceWalletTree(formattedAddr, provider, vaspLookup, {
    maxDepth: 5,
    maxBranchesPerNode: maxBranches,
    splitThresholdPercent,
    targetAsset,
    victimTxHash,
    victimAmountUsd,
  });
}
```

#### 4.3.3 Risk Score Call (Tree Mode)

In tree mode, the risk score request sends tree-level topology features to the Python risk service:

```typescript
const riskPayload: RiskScoreRequest = {
  traceHops: treeResult.branches.flatMap(b => b.hops),  // Flatten all branches
  terminalType: treeResult.exchangeBranches > 0 ? 'exchange' : 'inconclusive',
  destinationWalletPriorTxCount: ...,

  // Phase E2 tree features
  traceTree: treeResult,
  isFanOutDetected: treeResult.totalFanOutNodes > 0,
  isFanInDetected: treeResult.totalFanInNodes > 0,
  totalBranches: treeResult.totalBranches,
  exchangeBranches: treeResult.exchangeBranches,
  taintCoveragePercent: treeResult.taintCoveragePercent,
};
```

#### 4.3.4 API Response Shape (Tree Mode)

```json
{
  "investigationId": "...",
  "walletAddress": "0x...",
  "traceMode": "tree",
  "riskLevel": "high",
  "riskScore": 87,
  "riskReason": "Fund splitting detected across 3 branches with fan-out at root node. 2 of 3 branches terminated at known exchanges.",
  "riskIndicators": ["fan_out_splitting", "rapid_forwarding", "multi_vasp_deposit"],
  "assetsDetected": ["USDT", "ETH"],
  "targetAsset": "USDT",
  "victimTxHash": "0x...",
  "victimAmountUsd": 10000,
  "tree": {
    "rootAddress": "0x...",
    "totalBranches": 3,
    "exchangeBranches": 2,
    "totalFanOutNodes": 1,
    "totalFanInNodes": 0,
    "maxDepth": 3,
    "totalTaintedUsd": 10000,
    "taintCoveragePercent": 94.5,
    "assetsDetected": ["USDT", "ETH"],
    "nodes": [...],
    "edges": [...],
    "branches": [
      {
        "branchId": "0.0",
        "depth": 2,
        "terminalAddress": "0x...",
        "terminalType": "exchange",
        "terminalExchange": "Coinbase",
        "taintedAmountUsd": 6000,
        "taintPercentage": 60,
        "hops": [...]
      },
      {
        "branchId": "0.1",
        "depth": 2,
        "terminalAddress": "0x...",
        "terminalType": "exchange",
        "terminalExchange": "Binance",
        "taintedAmountUsd": 3800,
        "taintPercentage": 38,
        "hops": [...]
      },
      {
        "branchId": "0.2",
        "depth": 1,
        "terminalAddress": "0x...",
        "terminalType": "inconclusive",
        "taintedAmountUsd": 200,
        "taintPercentage": 2,
        "hops": [...]
      }
    ]
  }
}
```

---

### 4.4 Risk Service Changes (`services/risk/rules.py` & `models.py`)

#### 4.4.1 Extended `RiskScoreRequest` Pydantic Model

```python
class BranchSummaryItem(BaseModel):
    branchId: str
    depth: int
    terminalType: str
    terminalExchange: Optional[str] = None
    taintedAmountUsd: Optional[float] = None
    taintPercentage: Optional[float] = None

class RiskScoreRequest(BaseModel):
    traceHops: List[TraceHopItem]
    terminalType: Optional[str] = None
    destinationWalletPriorTxCount: Optional[int] = 0

    # Phase E2 tree fields
    isFanOutDetected: Optional[bool] = False
    isFanInDetected: Optional[bool] = False
    totalBranches: Optional[int] = 1
    exchangeBranches: Optional[int] = 0
    taintCoveragePercent: Optional[float] = None
    branches: Optional[List[BranchSummaryItem]] = None
```

#### 4.4.2 New Risk Rules (Phase E2)

> ⚠️ **[FALSE POSITIVE FIX]** Rules 1, 2, and 3 (fan-out, multi-VASP, fan-in) MUST
> only fire when `victimTxHash` is present in the request — i.e., the trace is
> **anchored to a confirmed reported crime**. Fan-out is structurally common in
> legitimate activity: businesses paying multiple suppliers, DAOs distributing
> treasury funds, DeFi yield strategies — all produce fan-out patterns on-chain.
> Without a crime anchor, these structural observations carry zero fraud signal
> and will false-positive on the first real wallet a judge tests.
>
> Implementation: Add `isVictimAnchored = bool(request.victimTxHash)` at the top
> of the scoring function and gate all three topology rules behind it.

**Rule 1: Fan-Out Splitting (HIGH RISK — victim-anchored only)**
```python
# Fund splitting = deliberate layering to obfuscate tracing
# ONLY meaningful when trace is anchored to a known victim transaction
if isVictimAnchored and request.isFanOutDetected and (request.totalBranches or 1) >= 2:
    score += 25
    indicators.append("fan_out_splitting")
    reasons.append(f"Funds split across {request.totalBranches} branches from a victim-reported transaction — deliberate layering pattern.")
```

**Rule 2: Multi-VASP Deposit (HIGH RISK — victim-anchored only)**
```python
# Money deposited into multiple exchanges = attempt to avoid exchange AML thresholds
# ONLY meaningful when the split originated from a known victim transaction
if isVictimAnchored and (request.exchangeBranches or 0) >= 2:
    score += 20
    indicators.append("multi_vasp_deposit")
    reasons.append(f"{request.exchangeBranches} branches from victim funds terminated at different exchanges.")
```

**Rule 3: Fan-In Aggregation (HIGH RISK — victim-anchored only)**
```python
# Re-merging of split funds = hourglass obfuscation pattern
# ONLY suspicious when confirmed to originate from a victim transaction
if isVictimAnchored and request.isFanInDetected:
    score += 20
    indicators.append("fan_in_aggregation")
    reasons.append("Multiple split branches of victim funds re-merged into a single wallet — hourglass obfuscation.")
```

**Rule 4: High Taint Coverage (Confirmatory — no victim anchor required)**
```python
# High taint coverage confirms the trace is accurate regardless of anchor
if (request.taintCoveragePercent or 0) >= 80:
    indicators.append("high_taint_coverage")
    reasons.append(f"{request.taintCoveragePercent:.1f}% of victim funds accounted for across all branches.")
```

**Rule 5: Low Taint Coverage (Inconclusive warning — no victim anchor required)**
```python
# Low coverage means significant funds are unaccounted for
if (request.taintCoveragePercent or 100) < 30:
    indicators.append("low_taint_coverage")
    reasons.append(f"Only {request.taintCoveragePercent:.1f}% of victim funds traced — chain may be incomplete.")
```

#### 4.4.3 Updated Risk Score Cap Logic

The Phase E2 scoring retains all Phase E1 rules and adds tree-topology rules. The maximum score cap remains 100:

```python
final_score = min(score, 100)
```

Updated scoring buckets:

| Score Range | Risk Level |
|-------------|------------|
| 0 – 25 | `low` |
| 26 – 55 | `medium` |
| 56 – 79 | `high` |
| 80 – 100 | `critical` |

**Note:** Phase E2 introduces `critical` as a new risk level for multi-branch, multi-VASP organized crime patterns.

---

### 4.5 Frontend UI Changes (`apps/web/src/`)

#### 4.5.1 Updated `GraphVisualizer.tsx` — Cytoscape Tree Layout

**Layout Algorithm:**

Replace the current `cose` (force-directed) layout with Cytoscape's `breadthfirst` layout for tree mode:

```typescript
const layout = traceMode === 'tree'
  ? {
      name: 'breadthfirst',
      directed: true,
      padding: 40,
      spacingFactor: 1.5,
      avoidOverlap: true,
    }
  : { name: 'cose', ... };  // Existing linear layout unchanged
```

**Fan-Out Node Badge:**

Nodes where `isFanOutNode === true` get a visual annotation:

```typescript
// Cytoscape node style for fan-out nodes
{
  selector: 'node[isFanOut = "true"]',
  style: {
    'background-color': '#f59e0b',        // Amber warning colour
    'border-color': '#d97706',
    'border-width': 4,
    'label': 'data(label)',
    'font-size': '10px',
  }
}
```

**Fan-In Node Badge:**

```typescript
{
  selector: 'node[isFanIn = "true"]',
  style: {
    'background-color': '#8b5cf6',        // Violet for merging
    'border-color': '#7c3aed',
    'border-width': 4,
  }
}
```

**Edge Taint % Label:**

Each tree edge displays its taint percentage in the centre:

```typescript
{
  selector: 'edge',
  style: {
    'label': (ele) => `${ele.data('taintPercentage')?.toFixed(0) ?? ''}%\n${formatUsd(ele.data('usdValue'))}`,
    'font-size': '9px',
    'text-rotation': 'autorotate',
  }
}
```

**Node Expand / Collapse:**

Tree nodes that have children can be collapsed/expanded by clicking, using the `cytoscapejs-collapse-api` or a custom toggle via filtering element display.

```typescript
// On node click: toggle children visibility
cy.on('tap', 'node', (evt) => {
  const node = evt.target;
  const successors = node.successors();
  if (node.data('collapsed')) {
    successors.restore();
    node.data('collapsed', false);
  } else {
    successors.remove();   // Temporarily removes from display (not from data)
    node.data('collapsed', true);
  }
});
```

#### 4.5.2 New Component: `BranchSummaryCard.tsx`

A per-branch summary table below the Cytoscape canvas showing each traced path:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 Fund Flow Branch Summary                                             │
├───────────┬────────┬─────────────────────┬────────────┬────────────────┤
│ Branch ID │ Depth  │ Terminal            │ Tainted $  │ Taint %        │
├───────────┼────────┼─────────────────────┼────────────┼────────────────┤
│ Branch 0  │ 2 Hops │ 🎯 Coinbase         │ $6,000     │ 60% ████████░░ │
│ Branch 1  │ 2 Hops │ 🎯 Binance          │ $3,800     │ 38% ██████░░░░ │
│ Branch 2  │ 1 Hop  │ ⚠️ Inconclusive     │ $200       │ 2%  ░░░░░░░░░░ │
├───────────┴────────┴─────────────────────┴────────────┴────────────────┤
│ Total Taint Coverage: 94.5%   ██████████████████░   Victim: $10,000    │
└─────────────────────────────────────────────────────────────────────────┘
```

Each row in the branch summary table is clickable to highlight that branch on the Cytoscape canvas (all other branches grey out).

#### 4.5.3 Updated Investigation Summary Banner (`ResultsPage.tsx`)

Add tree-topology tags to the existing Investigation Summary card:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Investigation Summary                                                 │
│ Suspect Wallet: 0x4585fe...20c0              Chain: Ethereum         │
│ Targeted Asset: 🟢 USDT   All Wallet Assets: 🟢 USDT  🟣 WETH       │
│ Trace Mode: 🌳 Multi-Branch Tree             Trace Depth: 3 Hops     │
│                                                                       │
│ ⚠️ Fan-Out Splitting Detected  |  🎯 2 Exchange Deposits Found       │
│ Taint Coverage: 94.5% ████████████████░░ of $10,000 victim funds     │
└──────────────────────────────────────────────────────────────────────┘
```

#### 4.5.4 Updated PDF Investigative Report (`PdfExporter.ts`)

The PDF report gains:

1. **Tree Topology Summary Section**: Table of all branches, their depth, terminal type, exchange name, and taint percentage.
2. **Fan-Out Annotation**: Text block flagging when and where splitting occurred.
3. **Taint Coverage Investigative Summary Statement**: Wording such as *"94.5% ($9,450 USD) of the total reported victim loss of $10,000 USD has been traced and accounted for across 3 independent fund flow branches in this investigation."*
   > Note: Use language appropriate to an investigative summary — not a legal certification. The report presents findings from on-chain data analysis; legal conclusions are drawn by the investigating officer.

---

### 5. Threshold Configuration & Constants

All thresholds are defined as named constants in `treeTracer.ts` for easy configuration without code changes:

```typescript
export const TREE_TRACER_CONFIG = {
  MAX_DEPTH: 5,                     // Maximum hop depth per branch
  MAX_BRANCHES_PER_NODE: 3,         // Maximum outgoing branches to follow per fan-out node
  MAX_TOTAL_NODES: 25,              // [BUG 2 FIX] Hard circuit breaker: 3^5=243 worst-case without this.
                                    // Caps total nodes explored regardless of depth/branch state.
                                    // A bushy wallet would otherwise consume 729 API calls.
  SPLIT_THRESHOLD_PERCENT: 10,      // Minimum % of taint to consider a branch (ignore dust)
  MIN_USD_VALUE_THRESHOLD: 5,       // Minimum USD value of any tx to be considered ($5)
  MIN_ETH_VALUE_THRESHOLD: 0.0001,  // Minimum ETH value threshold
  RATE_LIMIT_DELAY_MS: 750,         // [RATE LIMIT FIX] 600ms = exactly 5 req/sec ceiling with zero margin;
                                    // 750ms provides safe buffer below Etherscan free-tier limit.
  TAINT_TOLERANCE_LOWER: 0.70,      // Lower bound for Tier 2 taint match (70%)
  TAINT_TOLERANCE_UPPER: 1.05,      // Upper bound for Tier 2 taint match (105%)
} as const;
```

---

### 6. Test Wallet Addresses

#### 6.1 Primary Canonical Test Wallet: Fan-Out Splitting

**Target Wallet:** `0xbdb3ba9ffe392549e1f8658dd2630c141fdf47b6`

**Verified Properties (from Phase E1 testing):**
- Sends USDC to at least 3 distinct wallets after receiving funds.
- Large amounts ($1M+) split across multiple recipient wallets.
- Expected: Phase E2 BFS tree shows 2–3 branches with branching at Hop 1.
- Expected taint coverage: >80% across all discovered branches.

**Expected Test Output:**
```
Tree Result:
  Total Branches: 2-3
  Fan-Out Nodes: 1 (at root)
  Exchange Branches: 0 (Inconclusive — no VASP match in 5 hops for this wallet)
  Max Depth: 4
  Taint Coverage: ~85%
```

#### 6.2 Secondary Canonical Preset: Fan-In Hourglass (Locked Before Coding)

> ⚠️ **[TBD FIX]** The secondary wallet MUST be identified and locked before Phase E2
> execution begins — not deferred to "during execution". Deferring this was the same
> mistake that cost a day in Phase E1. The `data/find_test_wallet.js` discovery script
> must be run as the **first task** of Phase E2 execution day.

**Required properties for the secondary canonical wallet:**
- Must demonstrate ≥ 2 fan-out branches originating from the root wallet.
- At least 1 branch must terminate at a known VASP (Coinbase, Binance, etc.) within 5 hops.
- Must have ≤ 20 outgoing transactions at root (keeps Etherscan calls predictable).
- Must NOT be a known exchange hot wallet, bridge contract, or DEX router.

**Discovery strategy:** Run the following before starting implementation:
```bash
# Scan candidate wallets from known active layering addresses found during E1
node data/find_test_wallet.js --mode=fan-out --min-branches=2 --max-txs=20
```

**Lock the address here once found.** Until locked, the secondary preset button on `HomePage.tsx` is hidden (not shown as `TBD`).

#### 6.3 Preset Quick-Select Update (`HomePage.tsx`)

```typescript
const presetWallets = [
  // Existing E1 presets (unchanged)
  { label: '🟢 USDT Transfer Trail (999 USDT)', address: '0xcc06d5e8f7bac7d85dcd07ff70790c0c500f1fe1', asset: 'USDT' },
  { label: '⚙️ DEX Routing Obfuscation (Uniswap)', address: '0x2ea1a2b899dbc43f1c61c78a634817ef90ba1eca', asset: 'ETH' },
  { label: '🟣 Coinbase Trail (10.99 ETH)', address: '0x53ef6da5fc74cdef214367240b0d96c34231258d', asset: 'ETH' },
  { label: '🟡 Binance Deposit Trail (0.05 ETH)', address: '0x6f2d8b347dbfa187d1313338e0ff0120ca26a829', asset: 'ETH' },

  // Phase E2 presets (secondary address to be locked before coding)
  { label: '🌳 Multi-Branch Fan-Out (USDC Splitting)', address: '0xbdb3ba9ffe392549e1f8658dd2630c141fdf47b6', asset: 'USDC' },
  // Fan-In Hourglass preset: address locked once discovery script runs (see Section 6.2)
];
```

---

### 7. Etherscan API Rate Limit & Caching Strategy

Phase E2 makes more API calls than E1 due to multi-node traversal. Corrected worst-case analysis with `MAX_TOTAL_NODES=25` circuit breaker:

| Scenario | Max Nodes (Capped) | API Calls (3/node) | With Cache Hits | Est. Time @ 750ms/node |
|----------|-------------------|-------------------|-----------------|------------------------|
| 1 branch, depth 5 | 5 nodes | 15 calls | ~8 unique | ~6 seconds |
| 2 branches, depth 3 | 7 nodes | 21 calls | ~12 unique | ~8 seconds |
| 3 branches, max depth | **25 nodes (cap)** | 75 calls | ~40 unique | **~22 seconds max** |
| Without cap (3^5) | ~~243 nodes~~ | ~~729 calls~~ | — | ~~demo-breaking~~ |

**Mitigation Strategies:**

1. **`MAX_TOTAL_NODES = 25` hard circuit breaker** — BFS stops exploring new nodes once 25 are in the tree, regardless of depth or branch state. Bounds worst-case runtime to ~22 seconds.
2. **Existing 10-min TTL cache** — Wallets already fetched in one branch are served from cache in other branches. Critical for fan-in scenarios where the same wallet appears in multiple branches.
3. **Parallel fetch within each node** — All 3 API calls per node (`getTransactions`, `getTokenTransactions`, `getInternalTransactions`) execute concurrently with `Promise.all`.
4. **Sequential node processing** — Between node fetch batches, 750ms delay is inserted (safe buffer below Etherscan free-tier ceiling).
5. **Max Branches Limit** — `maxBranchesPerNode = 3` caps the maximum tree fan-out per node.

---

### 8. File Change Summary

| File | Type | Change Description |
|------|------|--------------------|
| `packages/types/src/index.ts` | MODIFY | Add `TreeNode`, `TreeEdge`, `BranchSummary`, `TraceTree`; extend `RiskScoreRequest`, `InvestigationGraph`, `CreateInvestigationRequest` |
| `services/blockchain/src/treeTracer.ts` | **NEW** | BFS multi-branch tree traversal engine, fan-out/fan-in detection, taint splitting |
| `services/blockchain/src/tracer.ts` | MODIFY | Keep linear tracer unchanged; export `traceWalletTree` from `treeTracer.ts` in `index.ts` |
| `services/blockchain/src/index.ts` | MODIFY | Export `traceWalletTree` from new `treeTracer.ts` |
| `services/risk/rules.py` | MODIFY | Add fan-out, fan-in, multi-VASP, taint-coverage risk rules; add `critical` risk level |
| `services/risk/tests/test_rules.py` | MODIFY | Add 4 new tree-topology risk rule tests |
| `apps/api/src/routes/investigations.ts` | MODIFY | Parse `traceMode`; call `traceWalletTree` in tree mode; build extended risk payload; return `tree` in response |
| `apps/web/src/components/GraphVisualizer.tsx` | MODIFY | Add `breadthfirst` Cytoscape layout, fan-out/fan-in node styling, taint % edge labels, node collapse/expand |
| `apps/web/src/components/BranchSummaryCard.tsx` | **NEW** | Per-branch taint summary table with taint percentage bar and branch highlighting |
| `apps/web/src/pages/ResultsPage.tsx` | MODIFY | Add tree topology banner (fan-out/fan-in flags, taint coverage), render `BranchSummaryCard` |
| `apps/web/src/utils/PdfExporter.ts` | MODIFY | Add Tree Topology Section, Fan-Out Annotation, Taint Coverage investigative summary statement to PDF |
| `apps/web/src/pages/HomePage.tsx` | MODIFY | Add Phase E2 canonical test wallet presets |

---

### 9. Unit Tests to Write

| File | Test Name | Expected Behaviour |
|------|-----------|-------------------|
| `services/blockchain/src/treeTracer.test.ts` | `test_fanout_detected_at_root` | `totalFanOutNodes >= 1` when 2+ branches found |
| `services/blockchain/src/treeTracer.test.ts` | `test_taint_splits_proportionally` | Branch taint sums ≈ parent taint (within 5%) |
| `services/blockchain/src/treeTracer.test.ts` | `test_fanin_detected_at_convergence` | `isFanInNode = true` when 2 branches visit same address |
| `services/blockchain/src/treeTracer.test.ts` | `test_split_threshold_filters_dust` | Transactions below 10% taint threshold are not branched |
| `services/blockchain/src/treeTracer.test.ts` | `test_linear_path_matches_tree_when_single_branch` | Tree result with 1 branch matches E1 linear result |
| `services/risk/tests/test_rules.py` | `test_fanout_triggers_high_risk` | `indicators` includes `fan_out_splitting` |
| `services/risk/tests/test_rules.py` | `test_multi_vasp_deposit_high_risk` | `indicators` includes `multi_vasp_deposit` |
| `services/risk/tests/test_rules.py` | `test_fanin_triggers_high_risk` | `indicators` includes `fan_in_aggregation` |
| `services/risk/tests/test_rules.py` | `test_high_taint_coverage_confirmatory` | `indicators` includes `high_taint_coverage` |

### 9.1 Regression Tests (Must Still Pass)

- All 5 existing `tracer.test.ts` linear tracer tests must pass (linear mode unchanged).
- All 6 existing `test_rules.py` pytest tests must pass (E1 rules unchanged).

---

## 10. Presentable Milestone Deliverable (End of Phase E2)

At the end of Phase E2, the RT-CFAS dashboard **must** demonstrate:

1. ✅ A trace run on `0xbdb3ba9ffe392549e1f8658dd2630c141fdf47b6` shows a **multi-branch Cytoscape tree graph** with visually distinct branch nodes.
2. ✅ **Fan-Out nodes** (where splitting occurred) are highlighted in amber with a fan-out badge.
3. ✅ **Fan-In nodes** (where merging occurred) are highlighted in violet.
4. ✅ Each Cytoscape edge label shows the **taint percentage** and **USD value** for that branch.
5. ✅ The **Branch Summary Table** below the canvas shows all branches with their terminal type (exchange name or inconclusive) and taint percentage bar.
6. ✅ The **Investigation Summary Banner** shows "Fan-Out Splitting Detected" and "Taint Coverage: X%".
7. ✅ The **Risk Score** reflects tree topology (fan-out = +25, multi-VASP = +20, fan-in = +20).
8. ✅ The **PDF Legal Report** includes a Tree Topology Section with a Taint Coverage legal statement.
9. ✅ All existing Phase E1 functionality (linear trace, token badges, 2-step asset selector, victim tx reference, DEX whitelist) continues working with zero regression.
10. ✅ All 9 new unit tests pass. All 11 existing unit tests (5 tracer + 6 risk) continue passing.

---

## 11. Git Commit Strategy for Phase E2

Following the same atomic commit convention as Phase E1:

```
Commit 1: feat(types): add TreeNode, TreeEdge, BranchSummary, TraceTree, and extend RiskScoreRequest
Commit 2: feat(blockchain): implement BFS multi-branch tree tracer with fan-out/fan-in detection
Commit 3: feat(risk): add fan-out, fan-in, multi-VASP, and taint-coverage risk rules
Commit 4: feat(api): add tree mode support to investigation routes with extended risk payload
Commit 5: feat(web): add Cytoscape tree layout, BranchSummaryCard, taint coverage banner, and PDF tree section
```

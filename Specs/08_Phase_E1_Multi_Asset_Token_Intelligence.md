# Spec 08 — Phase E1: Multi-Asset & Token Intelligence
### Vajra LEA Enterprise Edition | Real-Time Crypto Fraud Attribution System (RT-CFAS)
**Phase:** E1 — Multi-Asset & Token Intelligence  
**Target Date:** August 28, 2026  
**Owner:** Blockchain Lead + MERN Dev  
**Branch:** `phase-e1`

---

## 1. Executive Summary

Phase E1 is the first enterprise upgrade to RT-CFAS. The existing prototype only traces **native ETH transfers**, which means it misses the majority of real-world Indian cyber fraud cases — over **90% of on-chain fraud in India is transacted in ERC-20 stablecoins (primarily Tether USDT and USD Coin USDC)**, not raw ETH.

Phase E1 adds three critical intelligence capabilities:

1. **ERC-20 Token Transfer Tracing** — Detect and trace USDT, USDC, DAI, and other ERC-20 token movement along with native ETH.
2. **Internal Transaction Tracing** — Capture fund movements routed through smart contracts, DEX swaps (Uniswap, 1inch), and contract wallets that would otherwise appear as dead ends in pure ETH tracing.
3. **USD Value Normalization** — Convert all hop amounts to a normalized USD value using live/cached price data so investigators can immediately understand the financial magnitude of each hop.

**Acceptance Criteria:** The full investigator UI displays token symbols, formatted amounts, USD equivalents, and internal transaction badges without any regression to existing ETH tracing functionality.

---

## 2. Problem Statement: Why Phase E1 Matters

### 2.1 The ETH-Only Blind Spot

The current tracer (`services/blockchain/src/tracer.ts`) only calls Etherscan's `action=txlist` endpoint. This means:

- A suspect wallet that **receives 10,000 USDT** and **forwards 9,800 USDT** to a Binance hot wallet appears as a wallet with **0 ETH transactions** — completely invisible to our tracer.
- A suspect wallet that routes funds through a **Uniswap V3 swap** (ETH → USDT) shows the ETH outgoing tx but the USDT landing at the next wallet is invisible.

### 2.2 Real-World India Fraud Pattern (NCRP Data)
```
Victim → Suspect Wallet (ETH sent)
                    ↓ Uniswap swap (ETH → USDT) [INTERNAL TX — currently invisible]
         Intermediary Wallet (USDT)
                    ↓ USDT Forward [ERC-20 TX — currently invisible]
         Exchange Deposit Wallet (Binance/WazirX)
                    ↓ Sold on exchange
```
With only `txlist`, we see only the first arrow. Phase E1 makes all arrows visible.

---

## 3. Architecture Overview

### 3.1 System Component Map (What Changes)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Phase E1 Change Scope                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   packages/types/src/index.ts          ← ADD: AssetType, extended TraceHop  │
│                                                                              │
│   services/blockchain/src/             ← CORE CHANGES                       │
│     providers/ethereum.ts             ← ADD: fetchTokenTxs(), fetchInternalTxs() │
│     tracer.ts                         ← MODIFY: merge multi-asset hop list   │
│                                                                              │
│   services/risk/rules.py              ← MODIFY: token-aware risk features    │
│                                                                              │
│   apps/api/src/routes/investigations.ts ← MODIFY: pass token hop data       │
│                                                                              │
│   apps/web/src/                        ← UI CHANGES                         │
│     components/TokenBadge.tsx         ← NEW: Token symbol/icon badge         │
│     pages/ResultsPage.tsx             ← MODIFY: token columns in hops table  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow (Before vs After)

**Before Phase E1:**
```
Wallet Address
    → Etherscan txlist (ETH only)
    → Single hop chain (ETH amounts only)
    → Risk score
    → UI (ETH column only)
```

**After Phase E1:**
```
Wallet Address
    → Etherscan txlist      (native ETH transfers)
    → Etherscan tokentx     (ERC-20 USDT, USDC, DAI transfers)
    → Etherscan txlistinternal (contract/DEX internal transfers)
    → Merge & Deduplicate by txHash
    → Multi-asset hop chain (ETH + tokens + internal txns)
    → Token-aware risk scoring
    → UI (Token symbol, amount, USD value columns)
```

---

## 4. Detailed Technical Specification

### 4.1 TypeScript Data Contract Changes (`packages/types/src/index.ts`)

#### 4.1.1 New `AssetType` Enum
```typescript
/** Supported on-chain asset types for Phase E1 tracing */
export type AssetType = 'ETH' | 'USDT' | 'USDC' | 'DAI' | 'WETH' | 'ERC20';
```

#### 4.1.2 Extended `TraceHop` Interface
The existing `TraceHop` type must be extended with three optional fields. All existing fields remain unchanged (backwards compatible).

```typescript
export interface TraceHop {
  // ---- Existing Fields (DO NOT CHANGE) ----
  hopIndex: number;
  fromAddress: string;
  toAddress: string;
  amountEth: number;         // Native ETH value OR token amount converted to ETH equivalent
  txHash: string;
  txTimestamp: string;

  // ---- Phase E1 New Fields ----
  tokenSymbol?: AssetType;        // 'USDT', 'USDC', 'DAI', 'WETH', or undefined (= native ETH)
  tokenAmount?: number;           // Raw token amount (e.g. 5000.00 for 5000 USDT)
  tokenDecimals?: number;         // Token decimal places (USDT = 6, USDC = 6, DAI = 18)
  usdValue?: number;              // Approx USD value of this hop at time of transfer
  isInternalTx?: boolean;         // true if routed via smart contract internal call (DEX, bridge)
  contractAddress?: string;       // Address of ERC-20 token contract (if token transfer)
}
```

#### 4.1.3 Extended `InvestigationGraph` (minor addition)
```typescript
export interface InvestigationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  terminalType: 'exchange' | 'inconclusive';
  terminalExchange?: string;

  // Phase E1 addition
  assetsDetected?: AssetType[];   // e.g. ['ETH', 'USDT'] — all assets found in the trace
}
```

#### 4.1.4 Updated `GraphEdge` (minor addition)
```typescript
export interface GraphEdge {
  from: string;
  to: string;
  amountEth: number;
  txHash: string;
  timestamp: string;

  // Phase E1 addition
  tokenSymbol?: AssetType;        // Token type on this edge
  usdValue?: number;              // USD display value
  isInternalTx?: boolean;
}
```

---

### 4.2 Ethereum Provider Changes (`services/blockchain/src/providers/ethereum.ts`)

#### 4.2.1 New Constants: Tracked Token Contract Addresses
```typescript
export const TRACKED_ERC20_CONTRACTS: Record<string, AssetType> = {
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',   // Tether USDT
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',   // USD Coin
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',    // Dai Stablecoin
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',   // Wrapped ETH
};

export const TOKEN_DECIMALS: Record<AssetType, number> = {
  ETH: 18, USDT: 6, USDC: 6, DAI: 18, WETH: 18, ERC20: 18,
};
```

#### 4.2.2 New Method: `fetchTokenTransactions(address, startBlock?)`
This method calls Etherscan `action=tokentx` and returns normalized ERC-20 hop entries.

**Etherscan API Endpoint Called:**
```
GET https://api.etherscan.io/v2/api?chainid=1
  &module=account
  &action=tokentx
  &address={walletAddress}
  &startblock=0
  &endblock=99999999
  &sort=asc
  &apikey={ETHERSCAN_API_KEY}
```

**Returns:**
```typescript
interface RawTokenTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;              // Raw value with decimals
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}
```

**Processing Logic:**
1. Filter only **outgoing** transfers where `from.toLowerCase() === walletAddress.toLowerCase()`.
2. Filter only tracked contracts (`TRACKED_ERC20_CONTRACTS`).
3. Normalize `value / 10^tokenDecimal` to get human-readable token amount.
4. **[BUG FIX #2]** Set `amountEth = 0` for ALL pure token transfers. **Do NOT convert token amounts to an ETH equivalent.** `amountEth` must mean only real native ETH. Use `usdValue` (computed separately via price cache) as the universal cross-asset comparison field.
5. Return as `Partial<TraceHop>[]` with `tokenSymbol`, `tokenAmount`, `tokenDecimals`, `usdValue`, `amountEth: 0`, `isInternalTx: false`.

#### 4.2.3 New Method: `fetchInternalTransactions(address)`
This method calls Etherscan `action=txlistinternal` to capture contract-routed value flows.

**Etherscan API Endpoint Called:**
```
GET https://api.etherscan.io/v2/api?chainid=1
  &module=account
  &action=txlistinternal
  &address={walletAddress}
  &sort=asc
  &apikey={ETHERSCAN_API_KEY}
```

**Processing Logic:**
1. Filter only **outgoing** internal transactions where `from === walletAddress`.
2. Normalize `value / 1e18` for ETH amount into `amountEth`. Set `usdValue = amountEth * cachedEthPriceUsd`.
3. Return as `Partial<TraceHop>[]` with `isInternalTx: true`, `tokenSymbol: 'ETH'`.

#### 4.2.4 Existing `fetchTransactions(address)` (no breaking change)
The existing `fetchTransactions` method continues to fetch native ETH `txlist`. No changes to its signature. Its results will be **merged** with token and internal tx results in the tracer.

---

### 4.3 Tracer Algorithm Changes (`services/blockchain/src/tracer.ts`)

#### 4.3.1 Multi-Asset Hop Merge Logic

At each hop, instead of calling only `fetchTransactions`, the tracer now calls all three providers in parallel and merges results:

```typescript
// Pseudocode for each hop node
const [ethTxs, tokenTxs, internalTxs] = await Promise.all([
  provider.fetchTransactions(walletAddress),
  provider.fetchTokenTransactions(walletAddress),
  provider.fetchInternalTransactions(walletAddress),
]);

// [BUG FIX #3] Three-way deduplication with explicit priority order
// Priority: tokenTx > internalTx > ethTx
// A single contract call can appear in ALL THREE lists simultaneously.
// We build a single Map<txHash, TraceHop> applying lowest-priority first,
// then overwriting with higher-priority sources:
const hopMap = new Map<string, Partial<TraceHop>>();
for (const tx of ethTxs)      { hopMap.set(tx.txHash, tx); }   // lowest priority
for (const tx of internalTxs) { hopMap.set(tx.txHash, tx); }   // medium priority
for (const tx of tokenTxs)    { hopMap.set(tx.txHash, tx); }   // highest priority — wins always
const allTxs = Array.from(hopMap.values());

// Sort by timestamp ascending
allTxs.sort((a, b) => new Date(a.txTimestamp!).getTime() - new Date(b.txTimestamp!).getTime());

// Apply value threshold filter (drop micro-dust transactions)
// [BUG FIX #2] Use usdValue as cross-asset threshold — not amountEth
const significantTxs = allTxs.filter(tx =>
  (tx.amountEth ?? 0) >= 0.001 ||
  (tx.usdValue ?? 0) >= 10        // $10 USD minimum for token hops
);
```

#### 4.3.2 Three-Way Deduplication Rule (Corrected)
A single Ethereum transaction can appear in **all three** lists simultaneously:
- `txlist`: as the parent call (even if value = 0)
- `tokentx`: as the ERC-20 token transfer triggered by the call
- `txlistinternal`: as the ETH internal value moved within the same call

**Priority order (highest wins):** `tokenTx > internalTx > ethTx`

This is enforced by populating the `Map` in ascending priority order so each higher-priority source overwrites lower-priority entries for the same `txHash`. The result is exactly one hop record per real on-chain transaction.

#### 4.3.3 VASP Matching (unchanged)
VASP matching logic continues to operate on `toAddress` — no changes required. Token destination addresses are still checked against the VASP database.

---

### 4.4 Risk Service Token-Aware Changes (`services/risk/rules.py`)

#### 4.4.1 Extended `RiskScoreRequest` Model
```python
class TraceHopItem(BaseModel):
    hopIndex: int
    fromAddress: str
    toAddress: str
    amountEth: float
    txHash: str
    txTimestamp: str
    tokenSymbol: Optional[str] = None   # Phase E1 addition
    tokenAmount: Optional[float] = None # Phase E1 addition
    usdValue: Optional[float] = None    # Phase E1 addition
    isInternalTx: Optional[bool] = False # Phase E1 addition
```

#### 4.4.2 New Risk Rule: DEX Routing / Contract Obfuscation (Corrected)

> **[BUG FIX #1] CRITICAL:** The naive `if internal_tx_count >= 1` rule is wrong.
> Internal transactions are extremely common and mostly innocent — any multisig, exchange withdrawal, DeFi protocol interaction, or smart contract wallet produces them. Triggering HIGH RISK on any internal tx would false-positive on the majority of legitimate wallets and make the demo look broken the first time a non-scam wallet is tested for comparison.

**Correct approach:** Only trigger this rule when the internal transaction's destination matches a **known DEX router address** from a hardcoded whitelist.

```python
# Known DEX router addresses that indicate deliberate fund routing / obfuscation
KNOWN_DEX_ROUTERS = {
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',  # Uniswap V2 Router
    '0xe592427a0aece92de3edee1f18e0157c05861564',  # Uniswap V3 Router
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',  # Uniswap V3 Router 2
    '0x1111111254fb6c44bac0bed2854e76f90643097d',  # 1inch V4 Router
    '0x1111111254eeb25477b68fb85ed929f73a960582',  # 1inch V5 Router
    '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',  # SushiSwap Router
    '0x03f7724180aa6b939894b5ca4314783b0b36b329',  # Shibaswap Router
}

# Rule: Internal tx routing through a known DEX router = deliberate obfuscation
dex_routed_hops = [
    h for h in hops
    if h.isInternalTx
    and (h.toAddress or '').lower() in KNOWN_DEX_ROUTERS
]
if len(dex_routed_hops) >= 1:
    return RiskScoreResponse(
        riskLevel="high",
        score=79.0,
        indicators=["dex_routing", "contract_obfuscation"],
        reason=f"Fund routed through known DEX aggregator/router contract — deliberate obfuscation pattern.",
        ...
    )
```

---

### 4.5 API Layer Changes (`apps/api/src/routes/investigations.ts`)

The investigations route already passes `hops` to the frontend. In Phase E1, it must additionally:

1. Pass `tokenSymbol`, `tokenAmount`, `usdValue`, `isInternalTx` per hop in the API response.
2. Include `assetsDetected` array in the top-level response (e.g. `["ETH", "USDT"]`).

**Updated `POST /api/investigations` response (new fields only):**
```json
{
  "investigationId": "...",
  "walletAddress": "...",
  "riskLevel": "high",
  "riskReason": "...",
  "assetsDetected": ["ETH", "USDT"],
  "hops": [
    {
      "hopIndex": 1,
      "fromAddress": "0x...",
      "toAddress": "0x...",
      "amountEth": 0.0,
      "tokenSymbol": "USDT",
      "tokenAmount": 5000.00,
      "usdValue": 5000.00,
      "isInternalTx": false,
      "txHash": "0x...",
      "txTimestamp": "2024-07-25T10:00:00Z"
    }
  ],
  "graph": { ... }
}
```

---

### 4.6 Frontend UI Changes (`apps/web/`)

#### 4.6.1 New Component: `TokenBadge.tsx`
A small reusable badge component that displays a colored token icon + symbol label.

| Token | Color | Label |
|-------|-------|-------|
| ETH | Purple | `ETH` |
| USDT | Emerald | `USDT` |
| USDC | Blue | `USDC` |
| DAI | Yellow | `DAI` |
| WETH | Violet | `WETH` |
| Internal Tx | Orange | `⚙️ Contract` |

#### 4.6.2 Updated Hops Table (`ResultsPage.tsx`)
The **Traced On-Chain Hops** table gains two new columns:

| Hop # | Sender | Recipient | **Asset** | **Amount** | **~USD Value** | Timestamp | Tx Hash |
|-------|--------|-----------|-----------|------------|----------------|-----------|---------|
| Hop #1 | `0x53ef...` | `0x321f...` | 🟣 ETH | 10.99 ETH | ~$32,970 | Jul 25 | View ↗ |
| Hop #2 | `0x321f...` | `0x716b...` | 🟢 USDT | 10,980 USDT | ~$10,980 | Jul 25 | View ↗ |
| Hop #3 | `0x716b...` | `0x4338...` | ⚙️ Contract | 10,950 USDT | ~$10,950 | Jul 25 | View ↗ |

#### 4.6.3 Summary Banner (`ResultsPage.tsx`)
Add an **"Assets Detected"** pill row in the Investigation Summary card:

```
Assets Detected in Trace:  [🟣 ETH]  [🟢 USDT]
```

---

### 6.1 Canonical Test Wallet: Confirmed ERC-20 USDT Wallet

**Locked Canonical Test Wallet:** `0xcc06d5e8f7bac7d85dcd07ff70790c0c500f1fe1`

**Verified Properties:**
- ✅ Outgoing USDT Transfers: 100 USDT & 999.01 USDT transfers to `0x7b09fc3b...`
- ✅ Outgoing Native ETH Transfers: Included in transaction history
- ✅ Total Transaction Count: 6 transactions (fast, clean tracing without hitting Etherscan page caps)
- ✅ Not a CEX hot wallet

**Expected Test Output:**
- Hops table displays `🟢 USDT` asset badge for `100 USDT` and `999.01 USDT` hops.
- USD value display: `~$100.00` and `~$999.01`.
- Summary card pill displays `Assets Detected: [ETH] [USDT]`.

---

## 5. Etherscan API Rate Limits & Caching Strategy

Phase E1 triples the number of Etherscan API calls per wallet (3 calls per node instead of 1). To manage rate limits:

| API Call | Endpoint | Rate Limit (Free Tier) | Phase E1 Strategy |
|----------|----------|------------------------|-------------------|
| Native ETH | `txlist` | 5 req/sec | Existing 10-min cache |
| ERC-20 Token | `tokentx` | 5 req/sec | New 10-min cache keyed `tokentx:{address}` |
| Internal Txns | `txlistinternal` | 5 req/sec | New 10-min cache keyed `internal:{address}` |

All three cache keys use the same existing in-memory `Map<string, CachedResponse>` structure in `ethereum.ts`.

---

### 6.2 Unit Tests to Write/Update
| File | Test | Expected |
|------|------|----------|
| `services/blockchain/src/tracer.test.ts` | `test_token_hop_detected` | TraceHop with `tokenSymbol: 'USDT'` present in hops |
| `services/blockchain/src/tracer.test.ts` | `test_deduplication_logic` | Same txHash not duplicated when in both txlist and tokentx |
| `services/risk/tests/test_rules.py` | `test_dex_routing_rule_triggers_high_risk` | `indicators` includes `dex_routing` |

### 6.3 Regression Tests (Must Still Pass)
- All 3 existing `tracer.test.ts` graph tests must pass.
- All 5 existing `test_rules.py` pytest tests must pass.

---

## 7. File Change Summary

| File | Type | Change Description |
|------|------|--------------------|
| `packages/types/src/index.ts` | MODIFY | Add `AssetType`, extend `TraceHop`, `GraphEdge`, `InvestigationGraph` |
| `services/blockchain/src/providers/ethereum.ts` | MODIFY | Add `fetchTokenTransactions()`, `fetchInternalTransactions()`, token constants |
| `services/blockchain/src/tracer.ts` | MODIFY | Merge multi-asset hop lists, deduplication, threshold filter |
| `services/risk/rules.py` | MODIFY | Extend `TraceHopItem` model, add DEX routing rule |
| `apps/api/src/routes/investigations.ts` | MODIFY | Pass `tokenSymbol`, `tokenAmount`, `usdValue`, `isInternalTx`, `assetsDetected` |
| `apps/web/src/components/TokenBadge.tsx` | NEW | Token symbol badge component |
| `apps/web/src/pages/ResultsPage.tsx` | MODIFY | Add Asset + USD Value columns, Assets Detected summary pill |

---

## 8. Presentable Milestone Deliverable (End of Phase E1)

At the end of Phase E1, the RT-CFAS dashboard **must** demonstrate:

1. ✅ A trace run on any Ethereum wallet shows **ERC-20 USDT/USDC transfers** in the hops table (not just ETH).
2. ✅ Each hop row displays a colored **token symbol badge** (`ETH`, `USDT`, `USDC`, etc.).
3. ✅ Each hop row displays a **~USD Value** approximate column.
4. ✅ Internal smart contract hops display an **⚙️ Contract** badge.
5. ✅ Investigation Summary banner shows **"Assets Detected: [ETH] [USDT]"** pills.
6. ✅ All existing ETH tracing, VASP attribution, Cytoscape graph, PDF export, and session history features continue working with zero regression.
7. ✅ All existing unit tests (3 graph tests + 5 risk tests) pass.

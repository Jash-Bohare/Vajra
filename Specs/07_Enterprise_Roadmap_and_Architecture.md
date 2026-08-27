# Spec 07 — Enterprise Roadmap & Technical Architecture Specification
### Vajra LEA Edition | Real-Time Crypto Fraud Attribution System (RT-CFAS)
**Target Deadline:** September 7, 2026  
**Document Purpose:** Complete technical architecture, data contracts, and module ownership specification for AI IDE team collaboration (Cursor, Windsurf, Antigravity, Gemini).

---

## 🏛️ Executive Summary & Vision

RT-CFAS has completed its initial PoC milestone (Phases 1–5). To transform RT-CFAS into **Vajra LEA Enterprise Edition** — a production-ready, government-grade platform for Law Enforcement Agencies (LEAs) — the system is expanding across 4 core technical pillars:

1. **Multi-Asset & Token Intelligence**: Tracing ERC-20 (USDT, USDC, WETH) and internal smart contract transactions alongside native ETH.
2. **Multi-Branch Tree Tracing Engine**: Traversal algorithms handling fund splitting (fan-out), aggregation (fan-in), and peeling chains up to 10+ hops deep.
3. **Advanced AI/ML Engine**: Standalone Python package providing NetworkX graph topological analytics, XGBoost/Scikit-learn fraud scoring, and LLM-powered legal case narrative generation.
4. **Expanded VASP Intelligence & Visual Exporter**: 150+ tagged exchange deposit addresses (including Indian VASPs like WazirX, CoinDCX, CoinSwitch) and high-res graph canvas export.

---

## 📂 Monorepo Ownership & Teammate Module Map

This specification establishes clean modular boundaries so teammates can work concurrently using their AI IDEs without merge conflicts or broken builds:

```
/Vajra
├── /packages
│   └── /types                   → SHARED: Central TypeScript interfaces & API contracts (@rt-cfas/types)
│
├── /services
│   ├── /blockchain              → BLOCKCHAIN LEAD & MERN: Etherscan multi-token provider & tree tracer
│   └── /risk                    → AI/ML TEAMMATES: Python AI/ML Microservice
│       ├── main.py              → FastAPI server & HTTP endpoints
│       ├── rules.py             → Rule heuristic fallback engine
│       ├── /graph_analytics     → [AI/ML] NetworkX topological graph metric extractors
│       ├── /ml_models           → [AI/ML] Trained XGBoost / Random Forest risk scoring models
│       └── /llm_narrative       → [AI/ML] LLM automated legal summary generator (Ollama / Llama 3 / OpenAI)
│
├── /apps
│   ├── /api                     → MERN DEV: Express orchestrator & Postgres database queries
│   └── /web                     → MERN DEV: React + Cytoscape.js interactive investigator dashboard
│
└── /Specs
    └── 07_Enterprise_Roadmap_and_Architecture.md  → THIS SPECIFICATION (Share with all AI IDEs)
```

---

## 🎯 Phase Breakdown & Module Specifications

---

### Phase E1 — Multi-Asset & Token Intelligence (ERC-20 USDT/USDC & Internal Txns)
**Objective:** Expand tracing beyond pure ETH to include ERC-20 token transfers (Tether USDT, USD Coin USDC, WETH) and DEX internal contract calls.

#### 1. Technical Data Contract (`packages/types`)
```typescript
export type AssetType = 'ETH' | 'USDT' | 'USDC' | 'WETH' | 'TOKEN';

export interface TraceHop {
  hopIndex: number;
  fromAddress: string;
  toAddress: string;
  amountEth: number;         // Native value or token equivalent in ETH
  tokenAmount?: number;      // Raw token amount (e.g. 5000.0 USDT)
  tokenSymbol?: AssetType;   // 'USDT' | 'USDC' | 'ETH'
  txHash: string;
  txTimestamp: string;
  isInternalTx?: boolean;    // Smart contract internal transaction flag
}
```

#### 2. Etherscan API Calls (`services/blockchain`)
- Native ETH: `action=txlist`
- ERC-20 Token Transfers: `action=tokentx` (filters for USDT contract `0xdac17f958d2ee523a2206206994597c13d831ec7` & USDC `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`)
- Internal Contract Transactions: `action=txlistinternal`

#### 3. Presentable Milestone Criteria (E1)
- Live dashboard displays token symbols (`USDT`, `USDC`, `ETH`), formatted token amounts, and internal contract transaction badges.

---

### Phase E2 — Multi-Branch Tree Tracing Engine (Fan-Out & Fan-In Graph)
**Objective:** Replace single-path tracing with a Multi-Branching Directed Acyclic Graph (DAG) tracer capable of discovering fund splits ($1 \rightarrow N$ wallets) and fund aggregations ($N \rightarrow 1$ wallet) up to 10 hops deep.

#### 1. Graph Node & Edge Interfaces (`packages/types`)
```typescript
export interface GraphNode {
  id: string;
  label?: string;            // Exchange name if cataloged, or shortened address
  type: 'root' | 'intermediary' | 'exchange';
  inDegree: number;          // Number of incoming transfer edges
  outDegree: number;         // Number of outgoing transfer edges
  totalReceivedEth: number;  // Cumulative received value
}

export interface GraphEdge {
  from: string;
  to: string;
  amountEth: number;
  tokenSymbol?: string;
  txHash: string;
  timestamp: string;
}

export interface InvestigationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  maxDepthReached: number;
  hasExchangeMatch: boolean;
  matchedExchanges: string[];
}
```

#### 2. Tree Traversal Algorithm Parameters (`services/blockchain`)
- **Max Hop Depth**: `10` (configurable)
- **Min Transfer Value Threshold**: `0.005 ETH` or `$10 USDT` (filters out micro-dust spam transactions)
- **Branching Factor Cap**: Max `5` outgoing child paths per node to prevent combinatorial explosion.

#### 3. Presentable Milestone Criteria (E2)
- Cytoscape.js visual graph canvas renders multi-branching tree graphs with node expand/collapse controls and path highlighting.

---

### Phase E3 — Advanced AI/ML Engine (Graph Analytics, Risk Classifier & LLM Narrative)
**Objective:** Provide a modular Python AI/ML microservice (`services/risk/`) for your AI/ML teammates to plug in graph algorithms, trained ML models, and LLM text generation.

#### 1. Modular Directory Structure (`services/risk/`)
```
services/risk/
├── main.py
├── requirements.txt
├── graph_analytics/
│   ├── __init__.py
│   └── network_metrics.py     → NetworkX graph topological feature extraction
├── ml_models/
│   ├── __init__.py
│   ├── classifier.py          → XGBoost / Random Forest risk scoring model
│   └── trained_model.pkl      → Serialized ML model weights
└── llm_narrative/
    ├── __init__.py
    └── generator.py           → LLM automated legal summary generator
```

#### 2. NetworkX Topological Feature Extraction (`graph_analytics/network_metrics.py`)
Computes mathematical graph metrics from `InvestigationGraph`:
- **Degree Centrality**: Max in/out degree across nodes.
- **Clustering Coefficient**: Density of interconnected intermediary wallets.
- **Fan-Out Ratio**: Ratio of outgoing child wallets to incoming parent wallets.
- **Velocity Score**: Average time delta (in seconds) between hop transfers.

#### 3. ML Risk Classifier Output Contract (`/risk/score`)
```json
{
  "riskLevel": "high",
  "score": 91.4,
  "indicators": ["high_fanout_ratio", "peeling_chain_velocity", "burner_wallet_cluster"],
  "reason": "High fan-out ratio detected with rapid multi-hop velocity across uncataloged endpoints.",
  "graphMetrics": {
    "nodeCount": 12,
    "edgeCount": 15,
    "avgHopVelocitySec": 240,
    "maxFanOutRatio": 4.2
  },
  "aiNarrative": "Automated Case Summary: Suspect wallet 0x53ef... initiated a rapid fund dispersion pattern splitting 10.99 ETH across 3 intermediary addresses within 10 minutes..."
}
```

#### 4. Presentable Milestone Criteria (E3)
- Web UI displays numeric ML risk score gauge, graph topological metrics card, feature importance breakdown, and AI-generated 3-paragraph executive summary.

---

### Phase E4 — Expanded VASP Intelligence & Production Polish (Pre-Demo Freeze)
**Objective:** Expand VASP dataset, add high-resolution graph export, polish UI styling, and finalize production build.

#### 1. VASP Dataset Expansion (`data/vasp-addresses/`)
- Expand cataloged deposit addresses to **150+ verified exchanges & services**:
  - **Indian Exchanges**: WazirX, CoinDCX, CoinSwitch Kuber, ZebPay, Giottus.
  - **Global Exchanges**: Binance, OKX, Bybit, KuCoin, HTX, Kraken, Coinbase, Bitget.
  - **DEX & Mixers**: Uniswap Routers, 1inch Routers, Tornado Cash Contracts.

#### 2. High-Res Canvas Export (`apps/web`)
- Add **"📷 Export High-Res PNG Graph"** and **"📄 Export SVG Vector Graph"** buttons for court presentation slides.

---

## 🤖 Instructions for Teammates Using AI IDEs (Cursor / Windsurf / Antigravity)

When sharing this project with your AI/ML or MERN teammates, instruct them to include the following prompt in their AI IDE:

```text
"I am working on the Vajra LEA Enterprise Edition monorepo. 
Please read Specs/07_Enterprise_Roadmap_and_Architecture.md to understand the repository architecture, module ownership, and data contracts. 
My task is in [services/risk | apps/web | apps/api | services/blockchain]. 
Ensure all types adhere strictly to packages/types."
```

---

## ⏱️ Timeline & Presentable Milestones Schedule

| Phase | Description | Target Date | Presentable Output |
| :--- | :--- | :--- | :--- |
| **Phase E1** | Multi-Asset Tracing (ERC-20 USDT/USDC & Internal Txns) | Aug 28 | Live multi-token tracing dashboard |
| **Phase E2** | Multi-Branch Tree Engine (Fan-Out/Fan-In Graphs) | Aug 31 | Interactive Cytoscape multi-branch tree canvas |
| **Phase E3** | Advanced AI/ML Engine (Graph Analytics & LLM Narrative) | Sept 3 | ML risk score meter, graph metrics & AI summary |
| **Phase E4** | Expanded VASP Dataset (150+) & PNG/SVG Graph Export | Sept 6 | Final production-grade platform (Demo Ready) |

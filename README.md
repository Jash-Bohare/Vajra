# Real-Time Crypto Fraud Attribution System (RT-CFAS)
### Ministry of Home Affairs (MHA) | Indian Cyber Crime Coordination Centre (I4C) | Vajra LEA Edition

RT-CFAS (Vajra) is an automated blockchain forensic intelligence and VASP (Virtual Asset Service Provider) attribution platform designed for law enforcement agencies (LEAs) and cyber fraud investigators. It automatically traces victim-reported suspect cryptocurrency wallet addresses, identifies receiving exchanges/VASPs, computes explainable risk indicators, performs multi-asset token intelligence (ETH, USDT, USDC, DAI, WETH), applies decaying taint tracking, and generates standardized legal investigation reports with Section 65B forensic certificates.

---

## Repository Architecture

This repository is structured as a modular TypeScript + Python monorepo:

```
/apps
  /web              → React + Vite + TypeScript investigator UI + Cytoscape.js (Port 5173)
  /api              → Node.js + Express + TypeScript backend orchestrator (Port 3001)

/services
  /blockchain       → In-process TypeScript library with ChainProvider, token tracer & BFS tree engine
  /risk             → Python + FastAPI risk-scoring microservice & heuristic rules (Port 8000)

/packages
  /types            → Shared TypeScript types & API contracts (@rt-cfas/types)
  /config           → Shared environment variable schemas (@rt-cfas/config)

/data
  /vasp-addresses   → Verified exchange deposit catalog + PostgreSQL schema & import scripts
  test_consistency.js → Automated cold-vs-warm cache consistency test suite

/ml                 → AI/ML training infrastructure blueprint & dataset specs (Phase E3)

/Specs              → Project specifications & extension specs (Docs 01–10)
```

---

## Key Capabilities

1. **Automated 2-Stage Asset-Gated Flow**:
   - As soon as a suspect wallet address is entered or selected, an automatic debounced on-chain asset scan runs in the background.
   - The engine discovers currency holdings (ETH, USDT, USDC, DAI), presents interactive token cards, and unlocks the targeted trace.

2. **Multi-Branch BFS Decaying Taint Tracing Engine**:
   - Traces complex multi-hop fund flows across parallel dispersion paths (Fan-Out), consolidation paths (Fan-In), and peel chains up to 5 hops deep.
   - Computes **Cumulative Root Taint Share (%)** on each edge to maintain strict mathematical conservation of the victim's initial loss.

3. **Temporal Gating & Victim FIR Anchor**:
   - Investigators can provide a **Victim Tx Hash Reference** to lock the tracer to post-crime transfers (`timestamp > T_crime`), eliminating noise from unrelated prior transfers.

4. **Automated VASP Attribution & Immediate Freeze Intelligence**:
   - Matches terminal deposit wallets against cataloged exchange addresses (Binance, OKX, Coinbase, Kraken, Gate.io, Bybit, KuCoin, Bitstamp, Gemini, Crypto.com).
   - Generates instant exchange-specific **Law Enforcement Subpoena & Preservation Notices**, official LEA contact points, jurisdiction details, and average turnaround times.

5. **Immutable Historical Snapshot Persistence**:
   - Every completed investigation stores a frozen JSONB snapshot in PostgreSQL (`tree_payload`, `graph_payload`, `eth_price_usd`, `risk_score`, `risk_indicators`, `assets_detected`).
   - Viewing past reports from **Session History** displays the exact point-in-time graph and frozen oracle exchange rates without modifying or recomputing historical findings.

6. **Court-Admissible Legal PDF Dossier (Section 65B Certificate)**:
   - One-click export of an official investigation dossier featuring case metadata, hop breakdown table, risk indicators, and an **Indian Evidence Act Section 65B Electronic Evidence Certificate**.

7. **Rate-Limit Serialized Request Queue**:
   - Outgoing blockchain queries across all tree branches are automatically throttled via an internal promise queue (260ms spacing), guaranteeing compliance with public API rate limits.

---

## Prerequisites

Ensure your machine has the following installed:
- **Node.js**: `v20.x` or later (`node -v`)
- **npm**: `v10.x` or later (`npm -v`)
- **Python**: `v3.10` or later (`python --version`)
- **Git**: (`git --version`)

---

## Step-by-Step Local Setup Guide

### 1. Clone the Repository
```bash
git clone git@github.com:Jash-Bohare/Vajra.git
cd Vajra
```

### 2. Configure Environment Variables
Copy `.env.example` to root `.env` and `apps/api/.env`:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
Copy-Item .env.example apps/api/.env
```

**macOS / Linux:**
```bash
cp .env.example .env
cp .env.example apps/api/.env
```

Ensure `.env` contains:
- `DATABASE_URL`: Connection string for PostgreSQL database.
- `ETHERSCAN_API_KEY`: Etherscan API key for live on-chain queries.

### 3. Install Monorepo Node Dependencies
At the root of the repository, run:
```bash
npm install
```

### 4. Setup Python Risk Microservice
Navigate to `services/risk`, create a virtual environment, and install dependencies:

**Windows (PowerShell):**
```powershell
cd services/risk
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
cd ../..
```

**macOS / Linux:**
```bash
cd services/risk
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### 5. Build Monorepo TypeScript Packages
Compile `@rt-cfas/types`, `@rt-cfas/config`, `@rt-cfas/blockchain`, `@rt-cfas/api`, and `@rt-cfas/web`:
```bash
npm run build
```

---

## Running the Services Locally

Open **3 separate terminal tabs** to run the services in development mode:

### Terminal 1: Backend API (`apps/api`)
```bash
npm run dev:api
```
- Running on: `http://localhost:3001`
- Health check: `http://localhost:3001/health`

### Terminal 2: Risk Microservice (`services/risk`)
**Windows (PowerShell):**
```powershell
cd services/risk
.\.venv\Scripts\python main.py
```
**macOS / Linux:**
```bash
cd services/risk
source .venv/bin/activate
python main.py
```
- Running on: `http://localhost:8000`
- Health check: `http://localhost:8000/health`

### Terminal 3: Web UI Frontend (`apps/web`)
```bash
npm run dev:web
```
- Running on: `http://localhost:5173`
- Open your browser at `http://localhost:5173` to test the Investigator UI!

---

## Testing & Verification Suite

### 1. Run Python Risk Microservice Pytest Suite
```powershell
cd services/risk
.\.venv\Scripts\pytest tests/test_rules.py
```
*(Verifies rapid forwarding, peeling chain, DEX whitelist, burner wallet, and baseline risk rules)*

### 2. Run Multi-Branch Tree Tracer Engine Unit Tests
```bash
node services/blockchain/dist/treeTracer.test.js
```
*(Verifies BFS multi-branch traversal, fan-in taint accumulation, and circuit breakers)*

### 3. Run Automated Graph & TLFT Engine Unit Tests
```bash
node services/blockchain/dist/tracer.test.js
```
*(Verifies exchange-matched, inconclusive, multi-asset token, and TLFT decaying taint graph schemas)*

### 4. Run Cold vs Warm Consistency Suite
```bash
node data/test_consistency.js
```

### 5. Browser UI Test (Full Investigator Journey)
1. Open **[http://localhost:5173](http://localhost:5173)** in your browser.
2. Click one of the quick-select preset test wallet buttons:
   - **11-Node Multi-Hop Trail (Binance)**: `0x0d694430b5e34d65aa04a23d38b74c9f4f60342b`
   - **USDT Transfer Trail (999 USDT)**: `0xcc06d5e8f7bac7d85dcd07ff70790c0c500f1fe1`
   - **DEX Routing Obfuscation (Uniswap)**: `0x2ea1a2b899dbc43f1c61c78a634817ef90ba1eca`
   - **Coinbase Deposit Trail (10.99 ETH)**: `0x53ef6da5fc74cdef214367240b0d96c34231258d`
   - **Binance Direct Trail (0.05 ETH)**: `0x6f2d8b347dbfa187d1313338e0ff0120ca26a829`
   - **Multi-Branch Fan-Out (USDC)**: `0xbdb3ba9ffe392549e1f8658dd2630c141fdf47b6`
   - **Fan-In Hourglass Splitting (USDT)**: `0x7b09fc3bdd9a1eb0059f0c9d391f5d684e0f9918`
3. Notice automatic background pre-scan discovers token holdings and unlocks **Run Targeted Investigation**.
4. View live results:
   - **Multi-Branch Tree Topology**: Filterable branch summaries with taint coverage bars.
   - **Interactive Cytoscape Graph Canvas**: Forwarding velocity badges, terminal exchange badges, and edge taint share percentages.
   - **Actionable Intelligence Card**: Pre-filled legal preservation notice for matched exchange.
   - **Download Legal PDF Report**: Court-admissible dossier with Section 65B Indian Evidence Act certificate.
5. Check **Session History** (`/history`) to verify immutable historical replay with frozen timestamps and oracle exchange rates.

---

## Documentation & Specifications

For detailed architectural guidelines, read the specifications in the [`/Specs`](./Specs) folder:
- [01 — Product & Business Specification](./Specs/01_Product_Business_Specification.md)
- [02 — UX & Requirements Specification](./Specs/02_Product_Requirements_UX_Specification.md)
- [03 — Technical Architecture Specification](./Specs/03_Technical_Architecture_Engineering_Specification.md)
- [04 — Roadmap & Execution Plan](./Specs/04_Roadmap_Execution_Plan.md)
- [05 — Architecture Decision Records](./Specs/05_Architecture_Decision_Records.md)
- [06 — AI Development & Repo Specification](./Specs/06_AI_Development_Repository_Specification.md)
- [07 — Enterprise Roadmap & Architecture](./Specs/07_Enterprise_Roadmap_and_Architecture.md)
- [08 — Phase E1 Multi-Asset & Token Intelligence](./Specs/08_Phase_E1_Multi_Asset_Token_Intelligence.md)
- [09 — Phase E2 Multi-Branch Tree Tracing Engine](./Specs/09_Phase_E2_Multi_Branch_Tree_Engine.md)
- [10 — Phase E3 Advanced AI/ML Engine](./Specs/10_Phase_E3_Advanced_AI_ML_Engine.md)

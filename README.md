# Real-Time Crypto Fraud Attribution System (RT-CFAS)
### SIH 2026 | Ministry of Home Affairs (MHA) | Vajra LEA Edition v1

RT-CFAS (Vajra) is an automated blockchain intelligence and VASP (Virtual Asset Service Provider) attribution platform designed for law enforcement agencies (LEAs). It automatically traces victim-reported suspect cryptocurrency wallet addresses, identifies receiving exchanges/VASPs, computes explainable risk indicators, performs multi-asset token intelligence (USDT, USDC, DAI, WETH, ETH), applies decaying taint tracking, and generates standardized legal investigation reports.

---

## 🏗️ Repository Architecture

This repository is structured as a monorepo (Doc 03 Section 2 & Doc 06 Section 1):

```
/apps
  /web              → React + Vite + TypeScript investigator UI + Cytoscape.js (Port 5173)
  /api              → Node.js + Express + TypeScript backend orchestrator (Port 3001)

/services
  /blockchain       → In-process TypeScript library with ChainProvider, token tracer & TLFT engine (used by apps/api)
  /risk             → Python + FastAPI risk-scoring microservice & DEX whitelist rules (Port 8000)

/packages
  /types            → Shared TypeScript types & API contracts (@rt-cfas/types)
  /config           → Shared environment variable schemas (@rt-cfas/config)

/data
  /vasp-addresses   → Curated dataset (60 verified exchange deposit addresses) + Postgres schema & import script
  test_consistency.js → Automated cold-vs-warm cache consistency test suite

/ml                 → v2 roadmap placeholder documentation

/Specs              → Project specifications & extension specs (Docs 01–08)
```

---

## ⚡ Prerequisites

Ensure your machine has the following installed:
- **Node.js**: `v20.x` or later (`node -v`)
- **npm**: `v10.x` or later (`npm -v`)
- **Python**: `v3.10` or later (`python --version`)
- **Git**: (`git --version`)

---

## 🚀 Step-by-Step Local Setup Guide

Follow these steps to get all three services running locally on your computer in under 15 minutes.

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
- `DATABASE_URL`: Connection string for Supabase PostgreSQL.
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

## 🏃 Running the Services Locally

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

## 🧪 Testing & Verification Suite

### 1. Run Python Risk Microservice Pytest Suite (6/6 Passing Tests)
To run the Phase 4 & Phase E1 DEX whitelist risk scoring engine unit tests:
```powershell
cd services/risk
.\.venv\Scripts\pytest tests/test_rules.py
```
*(Expected output: `6 passed in 0.17s` covering Rapid Forwarding, Peeling Chain, DEX Router Whitelist, Burner Wallet, Unresolved Trail, and Low Risk baseline)*

### 2. Run Automated Graph & TLFT Engine Unit Test Suite
To run the graph generator & victim reference assertion tests:
```bash
node --test services/blockchain/dist/tracer.test.js
```
*(Expected output: 5 passed tests verifying exchange-matched, inconclusive, zero-hop, multi-asset token, and TLFT decaying taint graph schemas)*

### 3. Run Cold vs Warm Consistency Suite
To run the 100% deterministic consistency test across cold and warm cache runs:
```bash
node data/test_consistency.js
```

### 4. Browser UI Test (Full Investigator Journey)
1. Open **[http://localhost:5173](http://localhost:5173)** in your browser.
2. Click one of the quick-select preset test wallet buttons:
   - **🟢 USDT Transfer Trail (999 USDT)**: `0xcc06d5e8f7bac7d85dcd07ff70790c0c500f1fe1`
   - **🔗 Multi-Hop Layering Trail (USDC)**: `0xbdb3ba9ffe392549e1f8658dd2630c141fdf47b6`
   - **⚙️ DEX Routing Obfuscation (Uniswap)**: `0x2ea1a2b899dbc43f1c61c78a634817ef90ba1eca`
   - **🟣 Coinbase Trail (10.99 ETH)**: `0x53ef6da5fc74cdef214367240b0d96c34231258d`
   - **🟡 Binance Deposit Trail (0.05 ETH)**: `0x6f2d8b347dbfa187d1313338e0ff0120ca26a829`
3. Notice **Step 1 Pre-Scan**: Automatically previews all outgoing currencies on-chain (`USDT`, `USDC`, `ETH`, `DAI`).
4. Select target currency and click **Run Targeted Investigation**.
5. View live results:
   - **Cytoscape.js Graph Canvas**: Click nodes & edges to inspect multi-asset USD values & Etherscan links.
   - **Risk Assessment Card**: Expand reasoning details to view rule explainability & score (0-100).
   - **VASP Attribution**: Exchange name match (`🎯 MATCHED VASP: Coinbase` / `Binance`).
   - **Traced On-Chain Hops Table**: Displays token badges, USD values, timestamps, and confidence levels (`HIGH` / `LOW`).
   - **Download Legal PDF Report**: Click **"📄 Download Legal PDF Report"** to export an official PDF investigation report.

---

## 🗄️ Database Setup & VASP Seeding (PostgreSQL)

When connecting to Supabase / Neon / Local PostgreSQL:

1. Run the DDL migration script in `data/vasp-addresses/schema.sql` against your database.
2. Seed the verified exchange deposit addresses into PostgreSQL:
```bash
npm run db:seed
```

---

## 📚 Documentation & Specifications

For detailed architectural guidelines and rules, read the files in the [`/Specs`](./Specs) folder:
- [01 — Product & Business Specification](./Specs/01_Product_Business_Specification.md)
- [02 — UX & Requirements Specification](./Specs/02_Product_Requirements_UX_Specification.md)
- [03 — Technical Architecture Specification](./Specs/03_Technical_Architecture_Engineering_Specification.md)
- [04 — Roadmap & Execution Plan](./Specs/04_Roadmap_Execution_Plan.md)
- [05 — Architecture Decision Records](./Specs/05_Architecture_Decision_Records.md)
- [06 — AI Development & Repo Specification](./Specs/06_AI_Development_Repository_Specification.md)
- [08 — Phase E1 Multi-Asset & Token Intelligence](./Specs/08_Phase_E1_Multi_Asset_Token_Intelligence.md)

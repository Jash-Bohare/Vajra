# Real-Time Crypto Fraud Attribution System (RT-CFAS)
### SIH 2026 | Ministry of Home Affairs (MHA) | v1 Scope

RT-CFAS is an automated blockchain intelligence and VASP (Virtual Asset Service Provider) attribution platform designed for law enforcement agencies (LEAs). It automatically traces victim-reported suspect cryptocurrency wallet addresses, identifies receiving exchanges/VASPs, computes explainable risk indicators, and generates standardized legal investigation reports.

---

## 🏗️ Repository Architecture

This repository is structured as a monorepo (Doc 03 Section 2 & Doc 06 Section 1):

```
/apps
  /web              → React + Vite + TypeScript investigator UI (Port 5173)
  /api              → Node.js + Express + TypeScript backend orchestrator (Port 3001)

/services
  /blockchain       → In-process TypeScript library with ChainProvider interface (used by apps/api)
  /risk             → Python + FastAPI risk-scoring microservice (Port 8000)

/packages
  /types            → Shared TypeScript types & API contracts (@rt-cfas/types)
  /config           → Shared environment variable schemas (@rt-cfas/config)

/data
  /vasp-addresses   → Curated dataset (100+ verified exchange deposit addresses) + Postgres schema & import script

/ml                 → v2 roadmap placeholder documentation

/Specs              → Project specifications (Docs 01–06)
```

---

## ⚡ Prerequisites

Ensure your machine has the following installed:
- **Node.js**: `v20.x` or later (`node -v`)
- **npm**: `v10.x` or later (`npm -v`)
- **Python**: `v3.10` or later (`python --version`)
- **Git**: (`git --version`)

---

## 🚀 Step-by-Step Local Setup Guide (Phase 1)

Follow these steps to get all three services running locally on your computer in under 15 minutes.

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Vajra
```

### 2. Configure Environment Variables
Copy the template `.env.example` to `apps/api/.env`:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example apps/api/.env
```

**macOS / Linux:**
```bash
cp .env.example apps/api/.env
```

Edit `apps/api/.env` if needed:
- `ETHERSCAN_API_KEY`: Get a free key from [Etherscan.io](https://etherscan.io/myapikey) (any placeholder string works for Phase 1).
- `DATABASE_URL`: Connection string for PostgreSQL (Supabase / Neon / Local Postgres).

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

## 🧪 Verification & Testing

### 1. Run Python Unit Tests
Verify all 4 risk-scoring rules in `services/risk`:
```bash
cd services/risk
.\.venv\Scripts\pytest tests/test_rules.py
```
*(Expected output: `4 passed in 0.17s`)*

### 2. Verify Health Endpoints
Open your browser or use curl to check:
- **Express API**: `http://localhost:3001/health` → `{"status":"ok","service":"apps/api",...}`
- **Risk Microservice**: `http://localhost:8000/health` → `{"status":"ok","service":"services/risk",...}`

---

## 🗄️ Database Setup & VASP Seeding (PostgreSQL)

When connecting to Supabase / Neon / Local PostgreSQL:

1. Run the DDL migration script in `data/vasp-addresses/schema.sql` against your database.
2. Seed the 100+ verified exchange deposit addresses:
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

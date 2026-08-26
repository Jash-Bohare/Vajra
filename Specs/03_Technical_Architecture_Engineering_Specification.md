# 03 — Technical Architecture & Engineering Specification
## Real-Time Crypto Fraud Attribution System (RT-CFAS)
### SIH 2026 | v1 Scope

This document is the single source of truth for how v1 is built. Every architectural decision here is deliberately made to be simple enough to ship in ~13 days with a 6-person team using AI-assisted IDEs, while leaving clean seams for the v2+ roadmap (Doc 04) so nothing built in v1 needs to be thrown away.

---

## 1. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript | MERN teammate's core skill; large ecosystem, fast with AI IDEs |
| Graph visualization | Cytoscape.js (or vis-network as fallback) | Purpose-built for node/edge fund-flow diagrams |
| Backend / API | Node.js + Express + TypeScript | Shared language with frontend (fewer context switches for AI agents); strong web3 library support (ethers.js) for the blockchain lead |
| Blockchain interaction | ethers.js + Etherscan API | Standard, well-documented, free tier sufficient for v1 |
| Risk scoring service | Python + FastAPI | Isolates AI/ML teammates in their strongest language; establishes the exact seam where a real ML model replaces rule-based logic in v2 without touching the rest of the system |
| Database | PostgreSQL | Simple, relational, sufficient for v1's single-path trace data; avoids premature complexity of a graph DB (see Section 4) |
| Report generation | Node — `pdfkit` or `puppeteer` (HTML→PDF) | Runs in the same backend process, no extra service needed |
| Hosting (frontend) | Vercel (free tier) | Zero-config React deploys |
| Hosting (backend + risk service) | Render or Railway (free tier) | Simple free-tier Node/Python hosting |
| Hosted Postgres | Supabase or Neon (free tier) | No local DB ops required, works from day one |

**Locked for v1:** Ethereum only, PostgreSQL only, Node/TypeScript backend, React frontend. Any deviation requires an ADR (Doc 05).

---

## 2. Repository Architecture

Monorepo, matching the structure defined in Doc 06 (AI Development & Repository Specification) so AI agents always know where new code belongs:

```
/apps
  /web              → React frontend
  /api              → Node/Express backend (orchestrator)

/services
  /blockchain        → Blockchain fetching + tracing logic (used by /api)
  /risk               → Python FastAPI risk-scoring service

/packages
  /types              → Shared TypeScript types (API contracts, trace models)
  /config             → Shared config/env schema

/data
  /vasp-addresses     → Known exchange/VASP address dataset (source files + import script)

/ml                   → Placeholder for v2; empty in v1 beyond a README stating intended structure (datasets/, features/, training/, models/)

/docs                 → This documentation set
```

v1 populates every folder above except deeper `/ml` training infrastructure, which stays a v2 placeholder (Section 14).

---

## 3. Service Boundaries

- **`apps/web`** — presentation only. Talks exclusively to `apps/api`. Never calls Etherscan or the risk service directly.
- **`apps/api`** — the orchestrator. Owns the investigation pipeline end-to-end: validates input, calls `services/blockchain` (as an in-process module in v1, not a separate network service — see note below), persists results to Postgres, calls `services/risk` over HTTP, generates the report, serves session history.
- **`services/blockchain`** — a well-isolated module/library within the API for v1 (not its own deployed service), so investigation logic isn't split across a network call for something this small. It IS structured as if it were a separate service (clear interface, no leaking of Express-specific code into it) so it can be extracted into its own microservice in v2 without a rewrite.
- **`services/risk`** — a genuinely separate deployed service (Python/FastAPI), called by `apps/api` over HTTP. This boundary is real (not just organizational) because it's the exact seam where v2 swaps rule-based logic for a trained ML model — the AI/ML team can iterate and redeploy this service independently without touching the Node backend.

**Why blockchain logic is in-process but risk logic is a separate service:** blockchain tracing has no reason to scale independently of the API in v1, and keeping it in-process avoids unnecessary network hops during the demo. Risk scoring benefits from being separate because it isolates a fast-moving, ML-owned component from the rest of the team's code.

---

## 4. Database Schema

PostgreSQL. v1 uses relational tables, not a graph database — because v1 only ever traces a single dominant path per investigation (no fan-out yet, see Doc 01 Non-Goals), so a graph DB like Neo4j would be premature complexity. This is revisited in v2 when fan-out/multi-path tracing is built (see Doc 05, ADR on database choice).

```sql
-- Core investigation record
CREATE TABLE investigations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         TEXT NOT NULL,           -- browser-session identifier, no auth in v1
  wallet_address     TEXT NOT NULL,
  chain              TEXT NOT NULL DEFAULT 'ethereum',
  status             TEXT NOT NULL DEFAULT 'pending', -- pending | running | completed | failed
  terminal_type      TEXT,                    -- 'exchange' | 'inconclusive'
  terminal_exchange  TEXT,                    -- exchange name if matched
  risk_level         TEXT,                    -- 'low' | 'medium' | 'high'
  risk_reason        TEXT,                    -- plain-language explanation
  hop_depth_used     INTEGER,
  report_path        TEXT,                    -- generated report file location
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at       TIMESTAMPTZ
);

-- Each hop in the traced path, in order
CREATE TABLE trace_hops (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id   UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  hop_index          INTEGER NOT NULL,
  from_address       TEXT NOT NULL,
  to_address         TEXT NOT NULL,
  amount_eth         NUMERIC NOT NULL,
  tx_hash            TEXT NOT NULL,
  tx_timestamp       TIMESTAMPTZ NOT NULL
);

-- Curated known exchange / VASP deposit addresses
CREATE TABLE known_exchange_addresses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address            TEXT NOT NULL UNIQUE,
  exchange_name      TEXT NOT NULL,
  chain              TEXT NOT NULL DEFAULT 'ethereum',
  source             TEXT,                    -- where this label came from
  added_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

All addresses are stored in EIP-55 checksummed form (see Section 19, Data Normalization) so lookups and matches are case-consistent.

---

## 5. Graph Schema (Visualization Layer)

Distinct from the database schema — this is the shape of data sent to the frontend for rendering the fund-flow diagram:

```ts
type GraphNode = {
  id: string;              // wallet address
  type: 'wallet' | 'exchange';
  label?: string;           // exchange name, if type === 'exchange'
};

type GraphEdge = {
  from: string;
  to: string;
  amountEth: number;
  txHash: string;
  timestamp: string;        // ISO8601
};

type InvestigationGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  terminal: { type: 'exchange' | 'inconclusive'; exchangeName?: string };
};
```

v1's graph is always a simple path (linear chain of nodes) since fan-out isn't built yet — but modeling it as a generic node/edge graph now means the frontend visualization component doesn't need to change when v2 introduces branching paths.

---

## 6. API Specification

All endpoints under `apps/api`, REST, JSON.

```
POST   /api/investigations
  body: { walletAddress: string }
  → 201 { investigationId: string, status: "running" }

GET    /api/investigations/:id
  → 200 {
      id, status, walletAddress, terminalType, terminalExchange,
      riskLevel, riskReason, graph: InvestigationGraph, createdAt, completedAt
    }

GET    /api/investigations/:id/report
  → 200, binary PDF stream

GET    /api/investigations?sessionId=...
  → 200 [ { id, walletAddress, status, terminalType, createdAt }, ... ]
```

Internal service call (API → Risk service):

```
POST   /risk/score          (services/risk, internal only, not public-facing)
  body: { traceHops: TraceHop[] }
  → 200 { riskLevel: "low"|"medium"|"high", reason: string, featuresUsed: {...} }
```

All internal service-to-service calls stay on a private network / localhost in v1 deployment — never exposed publicly.

---

## 7. Authentication

**v1: none.** Every investigation is tied to a lightweight `sessionId` (a random token generated client-side and stored in memory) purely to scope session history (Doc 02, Section 6.6) — this is not real authentication and provides no security guarantee. Deliberate v1 scope decision (Doc 01 Non-Goals).

**v2 plan (documented, not built):** token-based auth (JWT) issued via an agency identity provider or standalone login, tied to the RBAC model below.

---

## 8. RBAC

**v1: none** — single implicit role, no access differentiation, matching Doc 02 Section 13.

**v2 plan:** three roles — Investigator (create/view own investigations), Supervisor (view all, approve/export), Admin (manage exchange-address dataset, view audit logs). Enforcement point would sit in `apps/api` middleware, checking role against a `role` claim in the JWT before hitting any route.

---

## 9. Blockchain Indexing

v1 does **not** run a persistent indexer. Every investigation triggers a fresh, on-demand pull from the Etherscan API for the addresses involved in that trace. This is intentional: an always-on indexer is unnecessary infrastructure for a bounded demo and adds real cost/ops overhead the team doesn't have time for.

**v2 plan:** for production-scale response time and independence from third-party rate limits, move to a self-managed indexing layer (e.g., ingesting from a node provider like Alchemy/Infura webhooks into the own database), enabling sub-second repeated lookups instead of live API calls per investigation.

---

## 10. Chain-Specific Architecture

v1 supports **Ethereum only**. To avoid hardcoding Ethereum-specific logic throughout the codebase (which would make adding chains in v2 expensive), the blockchain module is built behind a `ChainProvider` interface:

```ts
interface ChainProvider {
  getTransactions(address: string): Promise<RawTx[]>;
  normalizeTx(tx: RawTx): NormalizedTx;
  isValidAddress(address: string): boolean;
}
```

v1 ships exactly one implementation: `EthereumProvider` (backed by Etherscan). Adding Bitcoin, BSC, or Polygon in v2 means writing a new class against the same interface — no changes needed to the tracing engine, database schema, or frontend. This is a genuine architectural investment worth making now, and worth stating explicitly in the SIH presentation as evidence of scalable design thinking.

---

## 11. VASP Intelligence Database

- **Source (v1):** compiled from open-source, publicly labeled address datasets — e.g., Etherscan's public label-cloud exports and open GitHub repositories cataloguing known exchange hot/deposit wallets.
- **Format:** a static seed file (`/data/vasp-addresses/seed.json` or `.csv`) imported into `known_exchange_addresses` via a one-time import script at setup time.
- **Update process (v1):** manual — a team member periodically re-runs the import script with an updated source file. No live syncing.
- **v2 plan:** scheduled ingestion jobs pulling from multiple sources, deduplication logic, confidence scoring per label source, and a review workflow for disputed labels.

---

## 12. AI/ML Architecture

The risk-scoring service (`services/risk`) is architected from day one as an ML-ready service, even though v1's actual logic is deterministic rules — this is the most important design decision for making the "AI/ML" part of the team's work genuinely visible in v1 while being honest that no model is trained yet.

```
Trace hops (from apps/api)
        ↓
Feature extraction  (Section 13)
        ↓
Decision function    ← v1: rule engine  |  v2: trained classifier
        ↓
{ riskLevel, reason }
```

Both the v1 rule engine and the future v2 model consume the **exact same feature vector** (Section 13) and return the exact same response shape — meaning `apps/api` and the frontend need zero changes when the v2 model replaces the v1 rules. This is the core "swap the brain, not the body" pattern for this service.

---

## 13. Feature Engineering

Features computed from `trace_hops` for a given investigation, used by both v1 rules and the future v2 ML model:

| Feature | Description |
|---|---|
| `hopCount` | Number of hops in the traced path |
| `minTimeBetweenHopsSec` | Shortest time gap between consecutive hops |
| `maxTimeBetweenHopsSec` | Longest time gap between consecutive hops |
| `terminalType` | `exchange` or `inconclusive` |
| `destinationWalletPriorTxCount` | Number of transactions the final wallet had *before* receiving these funds (proxy for "burner wallet" behavior) |

These are deliberately simple, computable directly from data already fetched during tracing — no extra API calls required.

---

## 14. Model Training Pipeline

**v1:** none — risk logic is rule-based (Doc 02, Section 9.4), implemented as plain functions in `services/risk`, unit tested directly.

**v2 plan:** once real/verified historical fraud case data is available, a training pipeline (`/ml/training`) will build a labeled dataset from confirmed cases (fraud vs. legitimate patterns), train a classifier (e.g., gradient-boosted trees — chosen for interpretability, important for court-usable evidence) on the Section 13 feature set, version model artifacts, and evaluate against held-out cases before promotion.

---

## 15. Model Serving

**v1:** the `POST /risk/score` FastAPI endpoint runs the rule engine synchronously and returns a result in milliseconds — no model loading needed.

**v2 plan:** the same endpoint loads a serialized trained model (e.g., pickle or ONNX) at service startup and runs inference instead of rules, keeping the exact same request/response contract so no other part of the system needs to change on model upgrade.

---

## 16. Risk Scoring

Implemented per the rules defined in Doc 02, Section 9.4, as pure, independently testable functions in `services/risk`:

```python
def score_risk(features: TraceFeatures) -> RiskResult:
    if features.hop_count >= 3 and features.min_time_between_hops_sec < 3600:
        return RiskResult("high", "3+ hops within 1 hour — rapid movement pattern")
    if features.destination_wallet_prior_tx_count == 0:
        return RiskResult("high", "Destination wallet has no prior transaction history")
    if features.terminal_type == "inconclusive" and features.hop_count >= 2:
        return RiskResult("medium", "Multiple hops with no identified exchange endpoint")
    return RiskResult("low", "Direct or near-direct transfer to known exchange, no unusual timing")
```

Each rule is unit tested independently so risk output is fully predictable and explainable in a demo.

---

## 17. Graph Algorithms

**v1:** a simple greedy traversal — at each wallet, follow the single largest outgoing transaction (by ETH value) as the next hop, repeating until an exchange match is found or max depth (default 5) is reached. This is O(depth) API calls per investigation — deliberately cheap and fast.

**v2 plan:** replace greedy single-path traversal with proper multi-path graph algorithms — BFS/DFS across all outgoing edges (not just the largest), common-input-ownership clustering heuristics to group wallets likely controlled by the same entity, and connected-component analysis for fan-out cases.

---

## 18. Data Ingestion

- **Transaction data:** pulled on-demand per investigation via the `EthereumProvider` (Etherscan API) — not a continuous background ingestion pipeline in v1 (see Section 9).
- **VASP address data:** batch-imported from static seed files at setup time (Section 11), not continuously ingested in v1.

---

## 19. Data Normalization

Applied uniformly before storage or comparison:
- All addresses converted to **EIP-55 checksummed format** so string comparisons (e.g., VASP matching) are reliable regardless of input casing.
- All amounts converted from Wei to ETH as `NUMERIC`, never floating point, to avoid precision issues.
- All timestamps normalized to **ISO 8601 UTC**.

---

## 20. Caching

v1 uses a simple in-memory cache (e.g., `node-cache`) inside `apps/api` for Etherscan responses, keyed by address, with a short TTL (~10 minutes). This exists purely to avoid redundant calls for the same address within a demo session and to reduce exposure to free-tier rate limits (Section 32) — not a distributed cache, since v1 runs as a single instance.

**v2 plan:** move to Redis if the service scales beyond a single instance.

---

## 21. Background Jobs

**v1:** none. The entire investigation pipeline (Doc 02, Section 5) runs synchronously within a single HTTP request, since the target completion time is well under 30 seconds (Doc 02 NFR). No job queue is needed at this scale.

**v2 plan:** once deeper multi-hop, cross-chain, or multi-path tracing is added (making single requests too slow), move pipeline execution to an async job queue (e.g., BullMQ + Redis), with the frontend polling or subscribing via WebSocket for status updates — matching the staged progress UX already defined in Doc 02, so the UI won't need redesigning, only its data source swapped.

---

## 22. Logging

- Structured (JSON) logs at each pipeline stage, tagged with `investigationId` for correlation across the full request lifecycle.
- Node backend: `pino` (or console with structured format) — fast, low overhead.
- Python risk service: standard `logging` module with structured output.
- Logged at minimum: stage entered/exited, external API call latency, errors with context (never raw stack traces shown to the end user — see Section 25).

---

## 23. Monitoring

**v1:** log-based only — sufficient for a demo-scale deployment; no dedicated monitoring stack.

**v2 plan:** add error tracking (e.g., Sentry) and basic uptime/latency metrics once the system runs beyond a single-team demo context.

---

## 24. Security

- No secrets (Etherscan API key, DB credentials) ever committed to source or exposed client-side — server-side environment variables only.
- All external inputs (wallet address) validated and sanitized before use in any downstream call.
- CORS restricted to the known frontend origin.
- Basic rate limiting on public API endpoints to prevent abuse of the team's free-tier Etherscan quota.

---

## 25. Privacy

v1 handles **no victim PII and no case metadata** — only public on-chain wallet addresses and derived trace results, which are not personal data. This significantly simplifies v1's privacy posture. If case linkage (victim identity, complaint ID) is introduced in v2 (Doc 02, Section 14), data protection controls (encryption at rest, access logging, retention policy) must be added before any such data is stored — explicitly flagged here so it isn't missed.

---

## 26. Evidence Integrity

Even in v1, every generated report (Doc 02, Section 11) includes: the exact data source and timestamp of generation, and every hop's transaction hash — independently verifiable by anyone on a public block explorer. This means v1's output, while not cryptographically signed or chain-of-custody tracked yet, is already reproducible and auditable in principle. **v2 plan:** store a hash of the raw API responses used to generate each report, for stronger evidentiary reproducibility.

---

## 27. Deployment

- **Frontend:** Vercel free tier, auto-deployed from the `apps/web` directory.
- **Backend (`apps/api`):** Render or Railway free tier.
- **Risk service (`services/risk`):** Render or Railway free tier, separate deployment from the backend, communicating over a private URL.
- **Database:** hosted Postgres via Supabase or Neon free tier — avoids any team member needing to manage a local DB server for the demo environment.

This keeps the entire v1 stack deployable with zero cost and minimal DevOps effort, appropriate for the team's timeline.

---

## 28. Local Development

- Each service (`apps/web`, `apps/api`, `services/risk`) runs independently via its own `npm run dev` / `uvicorn` command.
- Shared `.env.example` files define required environment variables (Etherscan API key, DB connection string, service URLs) per service.
- Full local setup steps are documented in Doc 06 (AI Development & Repository Specification), so a new team member (or AI agent) can get running without asking a teammate.

---

## 29. Production Architecture

v1's "production" environment is, in practice, a single deployed instance of each service (Section 27) sized for a live demo, not real user load. This is explicitly acceptable at this stage.

**v2 plan (documented, not built):** containerized services, load-balanced API instances, dedicated indexing layer, queue workers for async tracing — a natural evolution of the exact service boundaries already defined in Sections 3, 9, and 21, meaning v2 scaling is additive, not a rewrite.

---

## 30. Third-Party Services / APIs

| Service | Purpose | Tier |
|---|---|---|
| Etherscan API | Ethereum transaction history | Free tier |
| Open-source VASP address datasets (GitHub, Etherscan labels) | Seed data for `known_exchange_addresses` | Free/public |
| Vercel / Render / Railway | Hosting | Free tier |
| Supabase / Neon | Hosted Postgres | Free tier |

No paid blockchain forensics API (e.g., Chainalysis, TRM Labs) is used in v1 — consistent with Doc 01's cost constraints.

---

## 31. Cost Considerations

v1 is designed to run entirely on free tiers. The only meaningful constraint this introduces is API rate limits (Section 32), not cost. This should be stated plainly in the SIH presentation — it demonstrates resourcefulness, and the architecture (Section 10's `ChainProvider` interface, Section 3's service boundaries) is explicitly designed so that upgrading to paid data providers in v2 requires no redesign, only a config/provider swap.

---

## 32. Rate Limits

Etherscan's free tier is limited (approximately 5 requests/second, capped daily requests). Mitigations built into v1:
- In-memory caching (Section 20) to avoid redundant calls.
- Sequential (not parallel-burst) hop tracing, naturally pacing requests.
- Graceful degradation: if a rate limit is hit mid-trace, the investigation is marked `failed` with a clear reason (not a silent hang), and the partial trace already gathered is still shown rather than discarded (Doc 02, Section 12 error states).

---

## 33. Failure Handling

- **Transient API errors** (timeouts, 5xx from Etherscan): retried with exponential backoff (max 3 attempts) before failing the hop.
- **Hop-level failure:** a single failed hop marks the investigation as `failed` with the partial trace preserved and shown, rather than crashing the whole pipeline (aligns with Doc 02's "no dead ends" principle).
- **Risk service unavailable:** the investigation still completes and displays the trace/graph; risk level is shown as "unavailable" rather than blocking the entire result — tracing and risk scoring are decoupled failure domains by design (Section 3).
- **Report generation failure:** does not affect or hide the already-computed on-screen results; user can retry report generation independently.

---

*This document defines v1's actual build target. Every "v2 plan" note above exists so the v1 implementation never needs to be undone — only extended — as the system matures through the roadmap in Doc 04.*

# 04 — Roadmap & Execution Plan
## Real-Time Crypto Fraud Attribution System (RT-CFAS)
### SIH 2026 | v1 Scope

Today: **Aug 25, 2026**. Internal college hackathon: **Sept 7–14, 2026**. That gives the team **13 days** to go from zero to a working, demoable v1. This document turns that window into an executable plan — not just a list of phases, but who does what, in what order, and what "done" actually means at each step.

---

## 0. The Three-Stage Frame

Before the phase-by-phase breakdown, hold this shape in your head at all times — it's what prevents the classic hackathon failure mode of a polished-looking system that doesn't actually work when someone touches it live:

| Stage | Target Date | What "done" looks like |
|---|---|---|
| **MVP** | Sept 3 | The core tracing engine works end-to-end on the command line or a bare-bones API response — ugly UI or no UI at all is fine. If it can take a wallet address and correctly output a traced path + exchange match, MVP is done. |
| **SIH Prototype** | Sept 6 | Full pipeline integrated: real UI, risk scoring, visualization, report generation, all wired together and working on at least one real historical case. This is what walks into the internal hackathon on Sept 7. |
| **Final Polish** | Sept 12 (hard freeze) → Sept 14 | No new features after Sept 12. Remaining time goes to bug fixes, rehearsal, PPT narrative, and making sure the demo cannot fail live. |

**Rule that overrides everything else in this document:** if a phase is running late, cut scope (fewer hops, fewer edge cases, simpler UI) before you cut time from Final Polish. A working simple demo beats a broken ambitious one, every time, in front of judges.

---

## Phase 0 — Validation
**Dates:** Aug 25–26 (2 days)

**Objectives:** Prove the core assumptions behind the entire project are actually true before writing real code against them.

**Deliverables:**
- Confirmed working Etherscan API key with test calls returning real transaction data
- At least one real historical scam wallet address identified (from public writeups) with a traceable path to a known exchange, for use as the demo case throughout the project
- A first-pass known-exchange-address list (even 20–30 addresses is enough to validate matching logic)
- Confirmed team agreement on Doc 03's architecture (no open objections)

**Tasks:**
- Blockchain Lead: get Etherscan API key, make test calls, manually trace one real historical case by hand to confirm it's traceable within ~5 hops
- Junior 1: search public sources (scam-database writeups, Chainalysis/Crystal blog case studies, Reddit/Twitter threads on known scams) for 2–3 candidate demo wallets
- Junior 2: start compiling known exchange address list from Etherscan's public label exports
- AIML 1 & 2: review Doc 03 Section 12–17 (AI/ML architecture, feature engineering, risk rules) and flag any concerns before build starts
- MERN Dev: set up shared GitHub repo skeleton per Doc 03 Section 2 folder structure

**Dependencies:** None — this is the starting point.

**Owner:** Blockchain Lead (overall), with parallel individual tasks above.

**Acceptance Criteria:** The team can point to one real wallet address and manually describe its actual path to a real exchange, confirming the core concept is provably true before automating it.

**Risks:**
- *Risk:* No good real demo case found within 2 days. *Mitigation:* Fall back to constructing a synthetic-but-realistic test case using real exchange addresses and a small amount of real testnet activity if needed — documented honestly as such if used.
- *Risk:* Etherscan free tier limits are stricter than expected. *Mitigation:* Confirm limits now (Doc 03 Section 32), not on Sept 6.

**Definition of Done:** Demo wallet chosen, API access confirmed working, architecture sign-off from full team.

---

## Phase 1 — Foundation
**Dates:** Aug 27–29 (3 days)

**Objectives:** Stand up the skeleton of every service so all six people can work in parallel from Aug 30 onward without blocking each other.

**Deliverables:**
- Monorepo scaffolded per Doc 03 Section 2 (`apps/web`, `apps/api`, `services/risk`, `packages/types`, `data/vasp-addresses`)
- PostgreSQL schema (Doc 03 Section 4) created and migrated on a hosted instance (Supabase/Neon)
- Shared TypeScript types package (`packages/types`) defining the API contract from Doc 03 Section 6, so frontend and backend can build against the same shapes immediately
- Skeleton `apps/api` responding to a health-check endpoint
- Skeleton `services/risk` FastAPI app responding to a health-check endpoint
- `.env.example` files and local dev instructions drafted (feeds into Doc 06)

**Tasks:**
- MERN Dev: scaffold `apps/web` (React + TypeScript, routing for the 4 screens in Doc 02 Section 7) and `apps/api` (Express skeleton)
- Blockchain Lead: define `packages/types` based on Doc 03 Sections 5–6; set up Postgres schema and run migrations
- AIML 1: scaffold `services/risk` (FastAPI skeleton, health check, project structure for feature extraction + rule engine)
- AIML 2: begin drafting the rule engine logic (Doc 03 Section 16) against mock data, in parallel, without waiting for real trace data
- Junior 1 & 2: continue building out the known-exchange-address dataset (target: 100+ verified addresses by end of phase); set up the import script into Postgres

**Dependencies:** Phase 0 sign-off on architecture.

**Owner:** MERN Dev (repo/frontend/backend skeletons), Blockchain Lead (schema/types).

**Acceptance Criteria:** All three services (`web`, `api`, `risk`) run locally and respond to basic health checks; shared types compile and are imported by both frontend and backend without error.

**Risks:**
- *Risk:* Team members unfamiliar with monorepo tooling lose time on setup friction. *Mitigation:* Blockchain Lead or MERN Dev pairs with anyone stuck for >30 minutes rather than letting them debug tooling alone.

**Definition of Done:** A new team member (or AI agent) can clone the repo, follow the setup doc, and get all three services running locally within 15 minutes.

---

## Phase 2 — Blockchain Intelligence
**Dates:** Aug 30 – Sept 1 (3 days)

**Objectives:** Build the actual tracing engine — the heart of the entire project.

**Deliverables:**
- `ChainProvider` interface implemented (Doc 03 Section 10)
- `EthereumProvider` implementation fetching and normalizing real transaction data from Etherscan
- Single-hop and multi-hop greedy tracing logic (Doc 03 Section 17) working against the Phase 0 demo wallet
- Data normalization (EIP-55 checksumming, Wei→ETH, timestamp formatting — Doc 03 Section 19) applied consistently
- In-memory caching layer for Etherscan calls (Doc 03 Section 20)

**Tasks:**
- Blockchain Lead: implement `ChainProvider`/`EthereumProvider`, the hop-tracing loop, caching, and retry/backoff logic (Doc 03 Section 33)
- MERN Dev: build the `POST /api/investigations` and `GET /api/investigations/:id` endpoints in `apps/api`, calling into the blockchain module
- Junior 1: test the tracing logic against 3–5 different wallet addresses (not just the demo case) to catch edge cases early
- Junior 2: finalize the known-exchange-address dataset import; verify import script works cleanly against the schema from Phase 1

**Dependencies:** Phase 1 (schema, types, skeleton services) must be complete.

**Owner:** Blockchain Lead.

**Acceptance Criteria:** Given the Phase 0 demo wallet address, the system automatically traces the correct path and correctly identifies the known exchange endpoint — matching what was manually confirmed in Phase 0.

**Risks:**
- *Risk:* Real-world transaction graphs are messier than expected (e.g., dust transactions, failed transactions cluttering the "largest transfer" heuristic). *Mitigation:* Filter out failed/zero-value transactions explicitly; this should be handled here, not discovered during integration.
- *Risk:* Etherscan rate limits slow down iterative testing. *Mitigation:* Cache aggressively (already planned) and test against a small fixed set of wallets rather than random ones during development.

**Definition of Done:** The demo wallet trace runs correctly and repeatably through the API (not just a script), and at least 2 other test wallets produce sane, explainable results (even if inconclusive).

---

## Phase 3 — Graph & Attribution
**Dates:** Sept 2–3 (2 days)

**Objectives:** Turn raw trace data into the graph structure the frontend needs, and harden VASP matching.

**Deliverables:**
- `InvestigationGraph` structure (Doc 03 Section 5) correctly generated from trace data
- VASP attribution logic fully integrated into the tracing loop (stop-on-match behavior from Doc 03 Section 9.3 / Doc 02 Section 9.3)
- Persisted `trace_hops` records for every completed investigation

**Tasks:**
- Blockchain Lead: build the graph-generation step, converting the internal trace representation into the `InvestigationGraph` shape
- MERN Dev: persist investigation + trace_hop records to Postgres as the pipeline runs; wire `GET /api/investigations` (session history)
- Junior 1 & 2: expand test coverage — confirm inconclusive-trail cases are handled and clearly labeled, not silently treated as errors

**Dependencies:** Phase 2 tracing engine must be functionally complete.

**Owner:** Blockchain Lead.

**Acceptance Criteria:** The API returns a well-formed `InvestigationGraph` object for both a successful (exchange-matched) and an inconclusive trace, matching the schema in Doc 03 Section 5.

**Risks:**
- *Risk:* Graph shape mismatches between backend output and frontend expectations. *Mitigation:* This is exactly why `packages/types` was built in Phase 1 — enforce it strictly, don't let either side drift informally.

**Definition of Done:** **MVP milestone reached** — the full backend pipeline (wallet in → graph + attribution + persisted result out) works end-to-end via API calls, even with no real frontend yet.

---

## Phase 4 — AI/ML (Risk Scoring)
**Dates:** Sept 2–4 (3 days, runs in parallel with Phase 3)

**Objectives:** Deliver a working, explainable risk-scoring service, integrated with real trace data.

**Deliverables:**
- Feature extraction (Doc 03 Section 13) implemented, computing real features from `trace_hops`
- Rule engine (Doc 03 Section 16) fully implemented and unit tested
- `POST /risk/score` endpoint live and callable from `apps/api`
- Risk result correctly reflects the reasoning shown in Doc 02 Section 10 (never a bare score)

**Tasks:**
- AIML 1: implement feature extraction against real trace data (once Phase 2 output is available)
- AIML 2: implement and unit test each rule from Doc 03 Section 16 independently
- Both: integrate the endpoint call from `apps/api` once Phase 3's graph/persistence work is stable; validate against the Phase 0 demo case and at least 2 synthetic edge cases (e.g., a manufactured "3 hops within 10 minutes" case) to confirm rules trigger correctly

**Dependencies:** Needs trace data shape finalized from Phase 2 (can start building against mock data before that, per Phase 1 task).

**Owner:** AIML 1 & 2 jointly.

**Acceptance Criteria:** Given the demo wallet's real trace data, the risk service returns a risk level with a correct, human-readable reason matching one of the defined rules.

**Risks:**
- *Risk:* AIML teammates blocked waiting on real trace data. *Mitigation:* Explicitly build and test against mocked `trace_hops` data starting in Phase 1 (already scheduled above) so real integration in Phase 4 is just a data-source swap, not a first build.

**Definition of Done:** Risk scoring works standalone (via direct API call to `services/risk`) and integrated (via `apps/api` calling it as part of a full investigation).

---

## Phase 5 — Investigator Product (Frontend)
**Dates:** Sept 3–5 (3 days, overlaps Phases 3–4)

**Objectives:** Build the actual UI an investigator (and the judges) will use and see.

**Deliverables:**
- All 4 screens from Doc 02 Section 7 (Home/New Investigation, Progress, Results, Session History)
- Fund-flow visualization component (Cytoscape.js/vis-network) rendering `InvestigationGraph`
- Risk indicator UI component with expandable reasoning (Doc 02 Section 10)
- Report download flow (calls Doc 03 Section 6's report endpoint)

**Tasks:**
- MERN Dev: build all 4 screens, wire them to the real API endpoints as they become available from Phases 2–4
- Junior 1: implement report generation (`services/report` logic within `apps/api`, per Doc 03 Section 1) — PDF layout matching Doc 02 Section 6.5 contents
- Junior 2: implement loading/error/empty states exactly as specified in Doc 02 Section 12 — this is often skipped under time pressure and is exactly what makes a demo look unpolished if missing

**Dependencies:** Needs the API contract (`packages/types`) from Phase 1; can build against mocked API responses before Phases 2–4 finish, then swap to real calls.

**Owner:** MERN Dev.

**Acceptance Criteria:** A user can complete the full flow from Doc 02 Section 5 (Create Investigation → ... → Generate Report) using only the UI, no direct API calls.

**Risks:**
- *Risk:* Frontend work stalls waiting for backend endpoints. *Mitigation:* Build against mock API responses shaped exactly like `packages/types` from day one (standard frontend practice) — don't wait for Phase 2–4 completion to start.

**Definition of Done:** The full investigator journey works in a browser, styled adequately (not necessarily beautiful yet — that's Phase 7), using real backend data for at least the demo wallet.

---

## Phase 6 — Integration
**Dates:** Sept 6 (1 day — deliberately tight, because if earlier phases were done right, this should mostly be verification, not new building)

**Objectives:** Confirm the entire system works together, end-to-end, deployed (not just on individual laptops).

**Deliverables:**
- All services deployed per Doc 03 Section 27 (Vercel + Render/Railway + hosted Postgres)
- Full pipeline verified working on the deployed environment, not just localhost
- At least 3 test wallets run through the full deployed system with correct, expected results

**Tasks:**
- Blockchain Lead + MERN Dev: deploy all services, wire environment variables, confirm service-to-service communication works in the deployed environment
- AIML 1 & 2: verify risk service behaves identically once deployed (no localhost-only assumptions)
- Junior 1 & 2: run the full test wallet list through the deployed system and log any discrepancies from local behavior

**Dependencies:** Phases 2–5 must be functionally complete (not necessarily polished).

**Owner:** Blockchain Lead + MERN Dev jointly.

**Acceptance Criteria:** The Phase 0 demo case, run against the live deployed URL (not localhost), produces the correct end-to-end result — trace, attribution, risk, and downloadable report.

**Risks:**
- *Risk:* Environment-specific bugs appear only on deployment (CORS, env vars, timeouts). *Mitigation:* This is exactly why Phase 6 exists as its own day rather than being assumed away — do not skip it even if local demos look perfect.

**Definition of Done:** **SIH Prototype milestone reached** — a judge could be handed a live URL right now and successfully run an investigation themselves.

---

## Phase 7 — SIH Demo (Internal Hackathon Window)
**Dates:** Sept 7–14

**Objectives:** Walk into the internal hackathon with a working system, then spend the week converting "working" into "impressive and bulletproof," without breaking what already works.

**Deliverables:**
- PPT built around real screenshots/screen-recordings of the working system (not mockups)
- Rehearsed live demo script with a known-good wallet and a fallback recorded video in case of live API/network issues
- Polished UI pass (styling, copy, error message tone)
- Clearly presented v2+ roadmap slide (cross-chain, fan-out, DEX swaps, real ML model, SAHYOG/NCRP integration) showing the team understands the full problem even where v1 doesn't yet solve it

**Tasks — structured as a hard feature freeze on Sept 12:**
- **Sept 7–9:** Present initial progress per internal hackathon's schedule; continue closing any gaps from Phase 6; fix bugs found by wider testing; both AIML members start prototyping (not shipping) the v2 ML direction to have something credible to speak to, without touching the working v1 rule engine
- **Sept 10–12:** UI/UX polish pass; PPT drafted and refined; every team member tests the live demo flow themselves at least twice; **hard feature freeze at end of Sept 12** — no new functionality after this point
- **Sept 13:** Full team dry-run of the presentation + live demo, timed; fix only critical bugs found
- **Sept 14:** Final presentation; have the fallback recorded demo ready but present live first

**Dependencies:** Phase 6 (SIH Prototype) must be genuinely working, not "almost working," before this phase starts.

**Owner:** Whole team; Junior 1 & 2 own PPT narrative and demo script so senior members can stay focused on bug fixes through Sept 12.

**Acceptance Criteria:** The live demo has been successfully run start-to-finish by someone other than the Blockchain Lead (proving it isn't fragile or dependent on one person's machine/knowledge).

**Risks:**
- *Risk:* Live demo fails in front of judges due to network/API issues outside the team's control. *Mitigation:* Always have a recorded backup video of a successful run, ready to play immediately if live demo stalls.
- *Risk:* Feature creep past the freeze date. *Mitigation:* This is why the freeze is written down here explicitly — treat Sept 12 as immovable.

**Definition of Done:** **Final Polish milestone reached** — team is confident handing the live URL to a stranger and having it work, backed by a rehearsed narrative and a fallback plan if it doesn't.

---

## Quick-Reference Owner Map

| Phase | Primary Owner(s) |
|---|---|
| 0 — Validation | Blockchain Lead |
| 1 — Foundation | MERN Dev, Blockchain Lead |
| 2 — Blockchain Intelligence | Blockchain Lead |
| 3 — Graph & Attribution | Blockchain Lead |
| 4 — AI/ML | AIML 1 & 2 |
| 5 — Investigator Product | MERN Dev |
| 6 — Integration | Blockchain Lead + MERN Dev |
| 7 — SIH Demo | Whole team (Juniors own narrative/PPT) |

---

*This roadmap assumes phases 3–5 running partially in parallel (Sept 2–5) is achievable because Phase 1 deliberately front-loads shared types and mock data so no team member sits idle waiting on another's output. If any phase slips by more than 1 day, cut scope per the Stage 0 rule — not time from Phase 7.*

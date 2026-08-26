# 05 — Architecture Decision Records
## Real-Time Crypto Fraud Attribution System (RT-CFAS)
### SIH 2026 | v1 Scope

Each record below captures **why** a decision from Doc 03 was made, not what it is (that's Doc 03's job). This is the document to check whenever an AI coding agent — or a new teammate — suggests a different technology, so decisions aren't silently reversed without the team knowing why they were made in the first place.

---

### ADR-001: Blockchain Network for v1

**Status:** Accepted

**Context:** The system must trace fund flows on-chain. Supporting every chain from day one would multiply integration work before the core attribution concept is even proven.

**Options:**
1. Ethereum only
2. Ethereum + Bitcoin
3. Multi-chain from day one (Ethereum, Bitcoin, BSC, Polygon)

**Decision:** Ethereum only for v1.

**Why:** Ethereum has the richest free tooling (Etherscan API, ethers.js), the clearest address/transaction model for a first implementation, and is a fully representative proof of concept — the `ChainProvider` interface (Doc 03 Section 10) means adding chains later is additive, not a rewrite.

**Consequences:** v1 cannot trace Bitcoin or other chains even if a real case requires it; this is explicitly called out as a v1 limitation (Doc 01 Non-Goals) and a v2 roadmap item (Doc 04).

---

### ADR-002: Blockchain Data Provider

**Status:** Accepted

**Context:** Transaction history must come from somewhere — either a paid commercial forensics API or a public blockchain explorer API.

**Options:**
1. Etherscan API (free tier)
2. A commercial provider (Chainalysis, TRM Labs, Alchemy paid tier)
3. Self-run Ethereum node + custom indexer

**Decision:** Etherscan API, free tier.

**Why:** Zero cost, well-documented, sufficient data richness for single-path tracing, and fast to integrate within the team's 13-day window. Commercial providers and self-run nodes both require time or budget the team doesn't have for v1.

**Consequences:** Subject to free-tier rate limits (mitigated via caching, Doc 03 Section 20/32); no independence from Etherscan's uptime or data completeness. Revisit in v2 if scale demands it.

---

### ADR-003: Primary Database

**Status:** Accepted

**Context:** Investigation records, trace hops, and the exchange-address dataset need persistent storage.

**Options:**
1. PostgreSQL
2. MongoDB
3. PostgreSQL + a separate graph database from day one

**Decision:** PostgreSQL only.

**Why:** The data is inherently relational (investigations → hops, a lookup table of known addresses) and v1 never needs graph traversal *inside the database* — traversal happens once, in application code, while tracing. Postgres also has stronger consistency guarantees for structured records than MongoDB, with no added benefit from MongoDB's flexibility here.

**Consequences:** If v2 introduces heavy multi-path graph queries (fan-out, clustering), a dedicated graph database may become worth the added operational complexity — see ADR-004.

---

### ADR-004: Graph Database (Neo4j or Equivalent)

**Status:** Deferred (not adopted for v1)

**Context:** Multi-path fund tracing (fan-out, clustering of related wallets) is a natural fit for graph databases like Neo4j, but v1 only ever traces a single dominant path per investigation.

**Options:**
1. Adopt Neo4j alongside PostgreSQL now
2. Defer graph database entirely until v2 fan-out tracing is built
3. Use PostgreSQL's recursive CTEs to simulate light graph queries if ever needed short-term

**Decision:** Defer — no graph database in v1.

**Why:** Introducing Neo4j now adds real operational and learning overhead (a new query language, a new hosted service, another thing that can fail during a demo) with zero benefit until fan-out tracing actually exists. This is the single biggest complexity-avoidance decision in the v1 architecture.

**Consequences:** When v2 fan-out/clustering work begins (Doc 04 roadmap), this ADR should be revisited and likely superseded — Doc 03 Section 4 already flags this explicitly so it isn't forgotten.

---

### ADR-005: API Style

**Status:** Accepted

**Context:** The frontend needs a way to communicate with the backend.

**Options:**
1. REST
2. GraphQL

**Decision:** REST.

**Why:** The API surface is small and well-defined (Doc 03 Section 6) — a handful of endpoints with no complex nested-query needs that would justify GraphQL's added setup cost. REST is faster to build and easier for AI coding agents to generate correctly without additional schema tooling.

**Consequences:** If the API surface grows significantly more complex in v2 (many related resources, heavy client-side query flexibility needs), GraphQL could be reconsidered — not expected to be necessary at this scale.

---

### ADR-006: Backend Language(s)

**Status:** Accepted

**Context:** The team has strong Node/JavaScript skills (web3 lead, MERN developer) and separately strong Python skills (2 AIML members), but not necessarily overlapping.

**Options:**
1. Node/TypeScript for everything, including risk scoring
2. Python for everything, including the API and frontend tooling
3. Node/TypeScript for the main API and frontend; Python isolated to the risk-scoring service only

**Decision:** Hybrid — Node/TypeScript for `apps/web` and `apps/api`; Python/FastAPI for `services/risk` only.

**Why:** This maps the stack directly onto the team's actual skill distribution rather than forcing anyone into an unfamiliar language under time pressure, while keeping the ML-relevant work in the language where model training and inference tooling is strongest.

**Consequences:** Requires one clean HTTP boundary between the two languages (Doc 03 Section 3), which is a small amount of extra integration work compared to a single-language stack — accepted as worthwhile given the skill-matching benefit.

---

### ADR-007: ML Framework

**Status:** Deferred (not applicable to v1)

**Context:** v1's risk scoring is rule-based, not a trained model (Doc 03 Section 14). No ML framework is needed yet, but v2 will require one.

**Options (for v2, recorded now for continuity):**
1. scikit-learn (classical ML, e.g. gradient-boosted trees)
2. PyTorch / PyTorch Geometric (for graph neural network approaches)
3. TensorFlow

**Decision:** No framework adopted in v1. When v2 training begins, scikit-learn is the current lean, specifically for a gradient-boosted tree classifier — but this should be re-confirmed as an ADR update once real labeled data and v2 requirements are concrete.

**Why:** Interpretability matters more than raw predictive power here, since risk scores may need to be explained in an investigative or legal context — classical models like gradient-boosted trees are far easier to explain than deep learning approaches, at least as a starting point.

**Consequences:** If v2 requirements later demand graph-native learning (e.g., learning directly over the transaction graph structure), this decision should be revisited in favor of a graph neural network framework.

---

### ADR-008: Model Choice for Risk Scoring

**Status:** Deferred (not applicable to v1)

**Context:** Same as ADR-007 — v1 uses deterministic rules, not a trained model.

**Options (for v2):**
1. Rule-based system, hand-tuned indefinitely (no ML at all)
2. Classical supervised model (e.g., gradient-boosted trees) trained on labeled historical cases
3. Graph neural network trained on the transaction graph directly

**Decision:** v1 stays fully rule-based; v2 direction leans toward a classical supervised model once labeled data exists.

**Why:** A trained model requires labeled ground-truth data (confirmed fraud vs. legitimate patterns) that the team does not have access to yet. Committing to a specific model architecture before that data exists would be premature.

**Consequences:** The Doc 03 Section 12 architecture (shared feature vector, swappable decision function) ensures this decision can be made later without disrupting anything already built.

---

### ADR-009: Self-Hosted vs. API-Based AI/ML

**Status:** Accepted

**Context:** Some teams route "AI-assisted" features through a third-party LLM API (e.g., calling an external AI service for risk assessment) rather than building their own model or rule engine.

**Options:**
1. Call a third-party AI/LLM API for risk scoring
2. Build and host a self-owned rule engine / eventual trained model

**Decision:** Self-hosted, owned logic (rule engine now, trained model later) — no third-party AI API in the risk-scoring path.

**Why:** Risk scoring here needs to be fully explainable and reproducible for potential legal/investigative use (Doc 03 Section 26, Evidence Integrity) — a third-party black-box API call cannot guarantee this, adds an external dependency and potential cost, and would undermine the "explainable, court-usable" differentiation claimed in Doc 01.

**Consequences:** The team is fully responsible for the quality of the rule engine and, later, the trained model — no shortcut available via an external AI provider for this specific component. (Note: this does not restrict the team's use of AI coding assistants/IDEs for development itself — that's a tooling choice, not a product architecture choice.)

---

### ADR-010: Authentication Strategy

**Status:** Accepted (v1), Deferred (v2 detail)

**Context:** The product will eventually need real user accounts and access control, but v1 is a single-session demo tool.

**Options:**
1. Full authentication system (JWT + login) built in v1
2. No authentication in v1; lightweight session-only identifier
3. Third-party auth provider (e.g., Auth0) integrated in v1

**Decision:** No authentication in v1; a client-generated `sessionId` scopes session history only (Doc 03 Section 7).

**Why:** Building real authentication adds meaningful time cost with no payoff for a single-team demo where every user is, in effect, the same trusted operator. Time is better spent on the core tracing/attribution pipeline.

**Consequences:** v1 has zero access control — acceptable only because no real case or victim data is ever stored (Doc 03 Section 25, Privacy). This must be resolved before any real-world pilot deployment, and is explicitly scoped into v2 (Doc 03 Section 7/8).

---

### ADR-011: Cloud / Hosting Provider

**Status:** Accepted

**Context:** The team needs to deploy three services (frontend, API, risk service) plus a database, on a tight budget and timeline.

**Options:**
1. AWS/GCP/Azure directly (full control, more setup complexity)
2. Vercel (frontend) + Render/Railway (backend services) + Supabase/Neon (database), all free-tier PaaS
3. Fully local/offline demo only, no deployment

**Decision:** Vercel + Render or Railway + Supabase or Neon.

**Why:** Zero cost, minimal DevOps setup time, and each platform is purpose-built for exactly the kind of service being deployed (static/React frontend, containerized backend APIs, managed Postgres) — appropriate for a 13-day hackathon timeline where infrastructure management is not where the team's effort should go.

**Consequences:** Free-tier limitations (cold starts, request limits) are acceptable for a demo but would need re-evaluation for any real pilot deployment at scale.

---

### ADR-012: Queue Technology

**Status:** Deferred (not applicable to v1)

**Context:** Some pipelines need asynchronous background job processing; v1's pipeline runs synchronously within a single request.

**Options (for v2, when needed):**
1. BullMQ + Redis
2. A managed queue service (e.g., AWS SQS)
3. Continue without a queue, scaling vertically instead

**Decision:** No queue in v1. BullMQ + Redis is the current lean for v2 if/when async processing becomes necessary (Doc 03 Section 21).

**Why:** v1's target completion time (under 30 seconds, Doc 02 NFR) does not require async processing. Introducing a queue now would be infrastructure built ahead of an actual need.

**Consequences:** If v2's deeper multi-hop/cross-chain tracing pushes response times well past what's acceptable synchronously, this decision converts from "deferred" to "accepted" — the UI is already designed (Doc 02 Section 5, staged progress) to support this transition without a redesign.

---

### ADR-013: Caching Strategy

**Status:** Accepted (v1), Deferred (v2 detail)

**Context:** Repeated calls to the Etherscan API for the same address, within a session, waste rate-limit budget and slow down demos.

**Options:**
1. No caching
2. In-memory cache (single-instance, e.g. `node-cache`)
3. Distributed cache (Redis) from day one

**Decision:** In-memory caching in v1; Redis deferred to v2.

**Why:** v1 runs as a single instance per service (Doc 03 Section 27/29), so a distributed cache provides no benefit yet and adds operational overhead. In-memory caching solves the actual v1 problem (redundant calls within a session/demo) at zero additional infrastructure cost.

**Consequences:** Cache is lost on service restart and isn't shared across instances — both irrelevant at v1's single-instance demo scale, but must be revisited if v2 introduces multiple backend instances (Doc 03 Section 20).

---

*Every ADR above should be revisited, not silently overridden, if an AI coding agent or new contributor suggests a different technology. If a suggestion has genuine merit, update the relevant ADR's Status to "Superseded" and add a new one — never just change the code without updating the record.*

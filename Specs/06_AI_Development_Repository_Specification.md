# 06 — AI Development & Repository Specification
## Real-Time Crypto Fraud Attribution System (RT-CFAS)
### SIH 2026 | v1 Scope

**This document is written to be read by AI coding agents, not just humans.** If you are an AI agent working in this repository: read this document in full before writing or modifying any code. Every rule below exists because of a specific decision already made in Docs 01–05. If something you're about to do contradicts a rule here, stop and flag it instead of proceeding.

---

## 1. Repository Structure

This is the actual, final structure for the project — not a template, the real one, matching Doc 03 Section 2:

```
/apps
  /web              → React + TypeScript frontend (investigator UI)
  /api              → Node + Express + TypeScript backend (the orchestrator)

/services
  /blockchain       → Blockchain tracing logic. Used ONLY by apps/api, in-process
                       (not a separately deployed service in v1 — see ADR context
                       in Doc 03 Section 3). Structured as if it could become one.
  /risk             → Python + FastAPI risk-scoring service. A REAL separate
                       deployed service, called over HTTP by apps/api.

/packages
  /types            → Shared TypeScript types — the API contract between
                       apps/web and apps/api. SOURCE OF TRUTH for data shapes.
  /config           → Shared config/env schema definitions.

/data
  /vasp-addresses   → Known exchange/VASP address dataset (seed files + import script)

/ml                 → v2 placeholder ONLY. Do not build training pipelines here
                       in v1 — see Doc 03 Section 14. A README here states intent
                       for future /datasets, /features, /training, /models subfolders.

/docs               → Docs 01–06 (this specification set). READ BEFORE
                       making any architectural change.
```

**Deviation note for anyone comparing this to a generic template:** there is no `services/graph` or `services/ml` as separate top-level services in v1, and no `packages/ui`. Graph generation lives inside `services/blockchain` (it's a transformation step on trace data, not an independent service — Doc 03 Section 5), and there is no shared UI component library yet at v1's scale. Do not create these folders speculatively — see Rule 2 in Section 9.

---

## 2. Coding Conventions — TypeScript (`apps/web`, `apps/api`, `packages/*`, `services/blockchain`)

- **Strict mode on.** `tsconfig.json` must have `strict: true` across all TypeScript packages. Never disable strict checks to make something compile faster.
- **No `any`.** If a type is genuinely unknown, use `unknown` and narrow it — never `any` as a shortcut.
- **All shared data shapes live in `packages/types`.** Never redefine a type locally in `apps/web` or `apps/api` that already exists in `packages/types`. If a type needs to change, change it there first, then update both consumers.
- **Naming:**
  - Files: `camelCase.ts` for modules, `PascalCase.tsx` for React components.
  - Types/interfaces: `PascalCase` (e.g., `InvestigationGraph`, `ChainProvider`).
  - Functions/variables: `camelCase`.
  - Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_HOP_DEPTH`).
- **Folder structure within `apps/api`:** organize by domain (`investigations/`, `blockchain/`, `reports/`), not by technical layer (`controllers/`, `models/` scattered generically) — domain folders keep related logic together and are easier for both humans and agents to navigate.
- **Async/await only** — no raw `.then()` chains, for consistency and readability.

---

## 3. Coding Conventions — Python (`services/risk`)

- **Type hints required** on every function signature — this is a FastAPI service, and Pydantic models should define all request/response shapes explicitly, mirroring the shapes in `packages/types` conceptually even though it's a different language.
- **Naming:** `snake_case` for functions/variables, `PascalCase` for Pydantic models/classes.
- **One rule = one function.** Per Doc 03 Section 16, each risk rule must be its own small, independently testable function — never combine multiple rules into one large conditional block.
- **No hidden state.** The rule engine must be pure functions taking features in, returning a result out — no global mutable state, so v2's model-swap (Doc 03 Section 15) is a clean replacement.

---

## 4. Error Handling

- **Never fail silently.** Every catch block must either handle the error meaningfully or re-throw with added context — never an empty `catch {}`.
- **User-facing errors vs. internal errors are different things.** Internal errors (stack traces, raw API failures) are logged (Section 6) but never sent directly to the frontend. The frontend receives clear, human-readable messages matching Doc 02 Section 12.
- **Partial failure is a valid state, not a crash.** Per Doc 03 Section 33: a failed hop marks the investigation `failed` with the partial trace preserved — it does not throw an unhandled exception that crashes the request.
- **Retries belong at the integration boundary** (Etherscan calls), not scattered throughout business logic — implement retry/backoff once, in the `EthereumProvider`, not ad hoc elsewhere.

---

## 5. API Patterns

- **Match Doc 03 Section 6 exactly.** Do not invent new endpoints, rename fields, or change response shapes without first updating Doc 03 and `packages/types`.
- **REST, resource-oriented.** `/api/investigations` and its sub-resources — no RPC-style endpoint names like `/api/runInvestigation`.
- **All internal service-to-service calls** (API → risk service) use the exact contract in Doc 03 Section 6 — `POST /risk/score` — and never change shape without updating both sides together.
- **No endpoint returns mock or placeholder data** once real implementation exists — see Rule 5 in Section 9 (Never invent API responses).

---

## 6. Logging

- Structured JSON logs, always including `investigationId` when one exists, per Doc 03 Section 22.
- Node: use `pino` (or console with structured JSON format) consistently — do not mix logging libraries across modules.
- Python: use the standard `logging` module with structured output, matching the same correlation-ID pattern.
- Log at pipeline stage boundaries (entered/exited), external call latency, and all errors with context — never log secrets or full API keys, even at debug level.

---

## 7. Testing

- **Every risk rule (Section 3) has a unit test** — this is non-negotiable given how central explainability is to this project (Doc 01 Differentiation, Doc 03 Section 26).
- **Every hop-tracing edge case identified in Doc 04 Phase 2** (failed transactions, zero-value transactions, no-history wallets) must have a corresponding test.
- **New business logic requires a test before the task is considered done** — this is Rule 6 in Section 9, and applies to AI-agent-written code exactly as it applies to human-written code.
- UI components: focus tests on behavior (does clicking "Run Investigation" trigger the right API call), not on implementation detail or pixel-level rendering.

---

## 8. Validation

- **All external input is validated at the boundary**, before it reaches any business logic: wallet address format (Doc 02 Section 6.1) is checked in `apps/api` before any blockchain call is made.
- **Pydantic models validate all `services/risk` inputs** — no manually-parsed dictionaries passed around internally.
- **Never trust data from the frontend as pre-validated**, even if the frontend already validates it — always re-validate server-side.

---

## 9. Comments / Documentation

- **Code should be self-explanatory where possible; comments explain *why*, not *what*.** E.g., a comment on the greedy-traversal logic should reference *why* it's greedy (Doc 03 Section 17, v1 scope decision), not restate the code line by line.
- **Any deliberate v1 simplification must be commented with a reference back to the relevant Doc 01/03 section** — e.g., `// v1: single dominant path only, see Doc 03 §17. Fan-out is v2.` This is what keeps future contributors (and future AI agent sessions) from "fixing" an intentional simplification by accident.
- **Update the relevant doc (01–06) whenever behavior changes** — this is Rule 9 in Section 9 below, and it is not optional busywork; the whole point of this documentation set is that it stays true.

---

## 10. Security Requirements

- **No secrets in source code, ever** — Etherscan API key, database connection strings, and any future credentials live only in environment variables, never committed, never hardcoded even temporarily "to test something."
- **`.env` files are gitignored**; `.env.example` (no real values) is committed so setup is reproducible.
- **CORS is restricted** to the known frontend origin (Doc 03 Section 24) — never set to `*` even during development, to avoid the habit carrying into deployment.
- **Rate limiting** on public-facing API endpoints, per Doc 03 Section 24/32.
- **No victim PII or case data is ever stored in v1** (Doc 03 Section 25) — if any future change introduces such data, it must not proceed without a documented privacy review, referencing this section.

---

## 11. AI-Agent Rules

These rules apply to every AI coding agent working in this repository, without exception:

1. **Read `/docs` before modifying architecture.** If a task seems to require an architectural change (new service, new database, new major dependency), check Docs 01, 03, and 05 first — the decision and its reasoning may already exist.
2. **Never introduce a new dependency without justification.** If a new library is genuinely needed, state why the existing stack (Doc 03 Section 1) doesn't cover it, in a comment or commit message — don't silently add packages.
3. **Never modify the database schema without updating Doc 03 Section 4.** Schema and documentation change together, in the same task, never separately.
4. **Never expose secrets in source code.** See Section 10 above — no exceptions for "just testing."
5. **Never invent API responses.** If an endpoint's real implementation isn't ready, it should return a clear "not implemented" state or a `501`, never fabricated-looking data that could be mistaken for real functionality by a teammate or a judge.
6. **Write tests for new business logic.** Especially risk rules and tracing edge cases (Section 7) — no exceptions for "it's just a hackathon."
7. **Do not modify unrelated modules.** If a task is "fix the risk service," do not also refactor `apps/web` files unless explicitly asked — small, scoped changes are easier for six people (and multiple AI agent sessions) to review and merge.
8. **Follow existing patterns before creating new ones.** If `apps/api` already has a pattern for validation, error handling, or route structure, match it — don't introduce a second, different pattern for the same kind of problem.
9. **Update documentation when behavior changes.** If a change affects anything described in Docs 01–05, update the relevant doc in the same task — a doc that silently goes stale is worse than no doc.
10. **Run required checks before declaring a task complete.** Type checks, linter, and relevant tests must pass — "it looks right" is not the same as "it's verified."
11. **Respect the v1/v2 boundary explicitly drawn throughout Docs 01–05.** Do not build v2-scope features (cross-chain, fan-out, real ML model, auth/RBAC, case management) into v1 code paths, even if it seems like a small addition — this is a repeated, deliberate decision across every document in this set, not an oversight to "helpfully" fix.
12. **When uncertain, prefer asking over guessing.** If a task's requirements are ambiguous and Docs 01–05 don't resolve the ambiguity, flag the ambiguity rather than picking an assumption silently — architectural drift almost always starts with a well-intentioned but unstated assumption.

---

## 12. Local Development Setup (Operating Instructions)

1. Clone the repository.
2. Copy `.env.example` to `.env` in `apps/api` and `services/risk`; fill in the Etherscan API key and database connection string (obtained from a teammate or the team's shared secrets store — never from source control).
3. Install dependencies: `npm install` at the repo root (workspaces cover `apps/*` and `packages/*`); `pip install -r requirements.txt --break-system-packages` inside `services/risk`.
4. Run database migrations against the hosted Postgres instance (Doc 03 Section 4 schema).
5. Run the exchange-address import script (Doc 03 Section 11) once, to seed `known_exchange_addresses`.
6. Start each service independently: `npm run dev` in `apps/web`, `npm run dev` in `apps/api`, `uvicorn main:app --reload` in `services/risk`.
7. Confirm all three respond to their health-check endpoints before beginning work.

A team member (or an AI agent) should be able to go from a fresh clone to all services running in under 15 minutes, per the Definition of Done for Doc 04 Phase 1.

---

*This document is the operating manual referenced by Rule 1 above. Every other document in this set (01–05) is what this manual points back to — if this document and another disagree, the more specific technical document (03, 05) wins for implementation detail, but any such conflict should be resolved by updating this document, not silently overridden.*

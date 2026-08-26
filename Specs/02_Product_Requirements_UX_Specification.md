# 02 — Product Requirements & UX Specification
## Real-Time Crypto Fraud Attribution System (RT-CFAS)
### SIH 2026 | v1 Scope

This document defines exactly what the product must do and how a user interacts with it. It is written to be precise enough that an AI coding agent or a new team member can implement against it without guessing. Where a template section extends beyond v1 (e.g. full RBAC, multi-case management), the v1 behavior is stated explicitly and the fuller version is marked as deferred — this is intentional scoping, not an omission (see Doc 01, Non-Goals).

---

## 1. Functional Requirements (v1)

| ID | Requirement |
|---|---|
| FR-01 | User can input a single Ethereum wallet address into the system |
| FR-02 | System validates the address format before proceeding |
| FR-03 | System fetches the wallet's transaction history via a blockchain data provider (Etherscan API) |
| FR-04 | System automatically follows the dominant outgoing transaction path, hop by hop, up to a configurable max depth (default: 5 hops) |
| FR-05 | At each hop, system checks the destination address against a known exchange/VASP address dataset |
| FR-06 | If a match is found, system marks that hop as the trail's terminus and records the matched exchange name |
| FR-07 | If no match is found within max depth, system marks the trail as "inconclusive" and shows the furthest traced path |
| FR-08 | System computes a rule-based risk indicator (Low / Medium / High) for the traced wallet based on defined heuristics (Section 9.4) |
| FR-09 | System renders the traced path as a visual fund-flow diagram (nodes = wallets, edges = transactions with amount + timestamp) |
| FR-10 | System generates a downloadable investigation report (PDF or equivalent) summarizing the trace |
| FR-11 | User can view a list of past investigations run in the current session |
| FR-12 | User can re-open a past investigation's results without re-running the trace |

---

## 2. Non-Functional Requirements (v1)

| Category | Requirement |
|---|---|
| Performance | A trace of up to 5 hops should complete and render within 30 seconds under normal API rate limits |
| Reliability | Graceful handling of blockchain API failures/timeouts — no silent failures, no full page crash |
| Usability | A non-technical investigator should be able to complete a trace without training, based on on-screen guidance alone |
| Scalability | Not a v1 priority; architecture should not actively block future scaling (see Doc 03) |
| Availability | Demo-grade availability is sufficient for v1; no uptime SLA |
| Security | No real victim/case data is entered in v1 demo — wallet addresses are public blockchain data; no PII handling required for v1 |
| Auditability | Every generated report includes a timestamp and the exact data source/version used, for basic traceability |
| Portability | Runs on standard modern browsers; no special investigator-side software required |

---

## 3. User Personas (v1)

### Persona 1: Investigator (Primary)
- **Role:** Cybercrime cell officer handling individual fraud complaints
- **Technical comfort:** Low to moderate; not expected to understand raw blockchain data
- **Goal:** Get from "a reported wallet address" to "an actionable lead" as fast as possible
- **Needs from the product:** Simple input, clear visual output, a report they can attach to a legal request

### Persona 2: Reviewing Officer / Supervisor (Secondary)
- **Role:** Reviews investigator findings before authorizing action (e.g. legal request to an exchange)
- **Technical comfort:** Low
- **Goal:** Quickly validate that the trail and conclusion are credible
- **Needs from the product:** A clean, exportable report; visual clarity over technical depth

*(v1 does not implement distinct accounts or permissions for these personas — see Section 13. Both are served by the same single-user interface in v1.)*

---

## 4. User Journeys

### Journey: Investigator traces a reported wallet
1. Investigator receives a complaint containing a suspect wallet address.
2. Opens RT-CFAS, pastes the address into the input field.
3. Initiates the trace.
4. Watches the system progress through analysis (loading state with stage indicators).
5. Reviews the resulting fund-flow diagram and risk indicator.
6. If an exchange was identified, notes it and downloads the investigation report.
7. Attaches the report to the case file / legal request process (outside the system, v1).

### Journey: Supervisor reviews a completed trace
1. Supervisor is handed the exported report (or, in the same session, views the result on screen).
2. Reviews the visual trail and destination exchange.
3. Reviews the risk indicator and its stated reasoning.
4. Approves or requests further manual investigation.

---

## 5. Detailed User Flow (Core Investigation Flow)

This is the primary flow, matching the required system behavior end-to-end:

```
Create Investigation
       ↓
Enter Wallet Address
       ↓
Select Chain            (v1: Ethereum only, pre-selected, not user-changeable)
       ↓
Run Investigation
       ↓
Transaction Analysis     (fetch + parse transaction history)
       ↓
Graph Generation          (build hop-by-hop path)
       ↓
VASP Attribution          (match trail endpoint against known exchange dataset)
       ↓
Risk Analysis              (rule-based scoring)
       ↓
Investigator Review        (visual diagram + summary shown on screen)
       ↓
Generate Report            (export as downloadable file)
```

Each stage below maps to a visible system state so the investigator always knows what's happening (see Section 12, Loading States).

---

## 6. Feature Specifications

### 6.1 Wallet Input & Validation
- Single text input field accepting an Ethereum address.
- Client-side validation: correct format (`0x` + 40 hex characters).
- Invalid input shows an inline error immediately, before submission is allowed.

### 6.2 Investigation Execution
- "Run Investigation" button triggers the backend pipeline (Section 5 stages).
- Each stage shows a distinct progress indicator (not a single generic spinner) so long-running steps are transparent.
- User cannot submit a second investigation while one is running (button disabled during run).

### 6.3 Fund-Flow Visualization
- Directed graph: nodes represent wallet addresses, edges represent transactions.
- Each edge labeled with amount (ETH) and timestamp.
- The terminal node (if an exchange was matched) is visually distinguished (e.g. distinct color/icon) with the exchange name labeled.
- Nodes are clickable, revealing the full address and a link to a public block explorer for manual double-checking.

### 6.4 Risk Indicator
- Displayed as a single Low / Medium / Green-Amber-Red style badge, plus a short plain-language explanation (e.g. "3 hops within 40 minutes — rapid movement pattern").
- Never shown as a bare unexplained number — always paired with the reasoning (see Section 10).

### 6.5 Investigation Report
- Auto-generated on demand from a completed trace.
- Contains: source wallet address, full traced path (addresses, amounts, timestamps), identified exchange (if any), risk indicator + reasoning, data source and generation timestamp.
- Downloadable as a single file (PDF for v1).

### 6.6 Session Investigation History
- A simple list of investigations run in the current session (wallet address, timestamp, outcome summary).
- Clicking an entry reloads that investigation's results view without re-running the trace.
- v1: session-scoped only, not persisted across browser sessions (see Non-Goals, Doc 01) — persistent storage is a v2 item.

---

## 7. Screens / Pages (v1)

1. **Home / New Investigation** — wallet input field, chain indicator (fixed to Ethereum), Run Investigation button, brief instructional copy.
2. **Investigation Progress** — stage-by-stage progress view (can be a state on the same page rather than a separate route).
3. **Investigation Results** — fund-flow diagram, risk indicator, summary panel, Download Report button.
4. **Session History** — list of past investigations this session, each linking back to its Results view.

No login/auth screens in v1 (see Section 13).

---

## 8. Dashboard Requirements

v1 does not include a full analytics dashboard (multi-case statistics, trends, agency-wide metrics) — that is a v2+ item, since v1 is single-investigation-at-a-time by design. The closest v1 equivalent is the **Session History** screen (Section 7.4), which gives the investigator a lightweight overview of what they've run so far in the current session.

---

## 9. Investigation Workflow (Detailed)

### 9.1 Wallet Investigation Flow
1. Address submitted and validated.
2. System confirms the address exists on-chain (has at least one transaction) before proceeding; if not, show a clear "no transaction history found" empty state rather than a generic error.

### 9.2 Fund-Tracing Flow
1. Fetch outgoing transactions for the input wallet, ordered by time.
2. Select the dominant path: for v1, this means following the largest single outgoing transfer at each hop (documented simplification — true fan-out handling is v2, see Doc 01 Non-Goals).
3. Repeat at each subsequent wallet, up to max hop depth.
4. Stop early if: an exchange match is found (Section 9.3), max depth is reached, or a wallet has no further outgoing transactions.

### 9.3 VASP Attribution Flow
1. At every hop, check the destination address against the curated known-exchange-address dataset (exact match).
2. On match: mark this as the trail terminus, record exchange name, stop tracing.
3. On no match through max depth: mark trail as "inconclusive," display the furthest path traced, and clearly state this in the UI (not silently treated as failure).

### 9.4 Risk / Explanation Logic (v1, rule-based)
Risk is computed from simple, transparent rules — not a black-box model in v1:
- **High:** 3+ hops occur within 1 hour of each other, OR destination wallet has no prior transaction history before receiving these funds.
- **Medium:** 2 hops within a few hours, OR trail is inconclusive (exchange not identified) but multiple hops occurred.
- **Low:** Direct or near-direct transfer to a known exchange with no unusual timing pattern.

Each risk level is always shown with the specific rule(s) that triggered it — this is required, not optional, so investigators and courts can trust the output (ties to Doc 01 Differentiation).

---

## 10. Risk / Explanation UX

- Risk badge is never shown alone. It is always accompanied by a one-line, plain-language reason (see Section 9.4 examples).
- Hovering/tapping the badge (or an adjacent "why?" link) expands to show the exact rule(s) triggered.
- No jargon in the explanation text — written for a non-technical investigator, not a blockchain analyst.

---

## 11. Reports

- **Trigger:** User clicks "Download Report" from the Results screen.
- **Format:** PDF (v1).
- **Contents:** As specified in Section 6.5.
- **Naming:** Auto-named using wallet address + timestamp for easy filing.
- **No editing:** v1 reports are generated, read-only outputs — no in-app annotation/editing (v2 item).

---

## 12. Notifications / Error / Empty / Loading States

### Loading States
- Distinct progress indicator per pipeline stage (Section 5) — not a single opaque spinner. Example labels: "Fetching transaction history…", "Tracing fund flow…", "Checking against known exchange wallets…", "Calculating risk…".

### Empty States
- No transaction history found for the input wallet → clear message, no dead end (offer to try another address).
- Trail traced but no exchange match found within max depth → explicitly labeled "inconclusive," not treated as an error.

### Error States
- Invalid address format → inline validation error, submission blocked.
- Blockchain API failure/timeout → user-facing message explaining the system couldn't complete the trace, with a retry option; underlying error logged for debugging, not shown raw to the user.
- Report generation failure → user-facing message with retry; investigation results remain visible on screen regardless.

### Notifications
- v1 is a synchronous, single-session tool — no email/SMS/push notifications required. All feedback happens in-app, in real time, during the active session.

---

## 13. Permissions / RBAC

**v1:** Single-user, no authentication, no role separation. This is a deliberate scope decision (see Doc 01 Non-Goals) — v1 is built to prove the core attribution pipeline, not a multi-user access system.

**Deferred to v2+ (documented here so the eventual build has a target):**
- Investigator / Supervisor / Admin roles
- Authentication (agency SSO or equivalent)
- Per-case access control and audit logging of who viewed/exported what
- Multi-agency data isolation

---

## 14. Case-Management Workflow

**v1:** No persistent case management. Each investigation is a standalone run; the Session History (Section 7.4) is the only continuity, and it is not saved beyond the browser session.

**Deferred to v2+:**
- Persistent case records linked to NCRP complaint IDs
- Multiple wallets/investigations grouped under a single case
- Case status tracking (open, under review, action taken, closed)
- Collaboration features (assigning cases, comments, escalation)

This is called out explicitly so the v1 architecture (Doc 03) doesn't need to be redesigned when case management is added — data models should anticipate this even though the UI doesn't expose it yet.

---

## 15. Acceptance Criteria (Per Major Feature)

**Wallet Input & Validation**
- Given a malformed address, the system shows an inline error and does not allow submission.
- Given a valid, well-formed address, the system allows submission.

**Fund-Tracing**
- Given a wallet with at least one outgoing transaction, the system produces a traced path of at least one hop.
- Given a wallet with no transactions, the system shows the empty state (Section 12), not an error.
- The trace never exceeds the configured max hop depth.

**VASP Attribution**
- Given a trail that reaches an address present in the known-exchange dataset, the system correctly labels that node with the exchange name and stops tracing.
- Given a trail that does not reach any known exchange address within max depth, the system labels the result "inconclusive" and still displays the traced path.

**Risk Indicator**
- Every completed trace produces exactly one risk level (Low/Medium/High), always paired with a stated reason drawn from Section 9.4's rules.

**Fund-Flow Visualization**
- The diagram renders all traced hops in correct order with amount and timestamp on each edge.
- The terminal exchange node (if found) is visually distinguished from intermediate wallet nodes.

**Report Generation**
- A downloaded report contains all fields listed in Section 6.5.
- Report generation failure does not clear or hide the on-screen results.

**Session History**
- Every completed investigation (successful or inconclusive) appears in the session history list.
- Selecting a history entry reproduces the exact same results view without re-running the trace against live APIs.

---

*This document defines v1 UX and functional scope only. Sections 8, 13, and 14 intentionally describe v1's minimal behavior alongside the deferred full version, so the v2+ team (or AI agents) can extend rather than redesign.*

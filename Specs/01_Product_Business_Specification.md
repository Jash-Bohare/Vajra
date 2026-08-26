# 01 — Product & Business Specification
## Real-Time Crypto Fraud Attribution System (RT-CFAS)
### SIH 2026 | Ministry of Home Affairs | v1 Scope

---

## 1. Problem Statement

Victims of cyber-enabled financial crime — investment scams, task-based frauds, sextortion, ransomware, phishing, and darknet transactions — are frequently instructed to send funds to cryptocurrency wallet addresses controlled by fraudsters. When victims report these incidents (via NCRP and related channels), investigators are left with a single, isolated data point: a wallet address.

These reported wallets are almost never the fraudster's "final" wallet. They are typically:

- **Non-custodial wallets** created solely to receive scam proceeds
- **Temporary burner wallets** discarded after a single use
- **Intermediary/layering wallets** used to break the trail before funds reach a cash-out point

The actual destination — a real, regulated cryptocurrency exchange or VASP (Virtual Asset Service Provider) — is where the money can still be frozen, and where KYC records could reveal the fraudster's identity. Reaching that destination requires manually tracing a chain of on-chain transactions, a process that today depends on individual investigator skill, is slow, and does not scale with case volume.

**Core problem in one line:** Investigators need to go from *"a victim reported this wallet address"* to *"here is the exchange that received the funds, and here is the evidence trail"* — automatically, and fast enough to act before funds are withdrawn.

---

## 2. Current Investigation Workflow

1. Victim reports a fraud case via NCRP; complaint includes a suspect wallet address (often embedded in free-text, screenshots, or chat logs).
2. A cybercrime cell investigator manually copies the address into a public blockchain explorer (e.g., Etherscan).
3. The investigator manually inspects outgoing transactions, one at a time, trying to identify where funds moved next.
4. This is repeated hop by hop — a fully manual, linear process — until either:
   - The trail reaches a wallet the investigator recognizes as belonging to a known exchange, or
   - The investigator loses the trail (multiple wallets, unfamiliar chains, swaps, or simply running out of time/expertise).
5. If an exchange is identified, the investigator manually drafts a legal request (freeze/KYC disclosure) to that exchange or VASP.
6. There is no standardized, shareable, auditable record of how the trail was derived — the "evidence" is often just a set of browser tabs or screenshots.

This workflow does not scale, is entirely dependent on individual analyst skill, and has no built-in urgency mechanism even though crypto withdrawals can happen within hours of a scam.

---

## 3. Pain Points

| Pain Point | Impact |
|---|---|
| Manual, hop-by-hop tracing on public block explorers | Extremely slow; minutes-to-hours per wallet even for simple cases |
| No centralized list of known exchange/VASP deposit addresses at the investigator's fingertips | Investigators may not recognize an exchange wallet even when they've reached one |
| No visual representation of fund flow | Hard to communicate findings to seniors, courts, or VASPs |
| No standardized evidence/report output | Weakens legal requests sent to exchanges; inconsistent documentation across cases |
| No risk prioritization across cases | High-value, time-sensitive cases are not triaged differently from low-value ones |
| Tracing expertise concentrated in few individuals | Does not scale as case volume grows; bottleneck on specific personnel |
| Delay directly enables fund withdrawal | By the time a trail is manually completed, funds are frequently already withdrawn from the exchange |

---

## 4. Proposed Solution (v1 Scope)

A web-based platform where an investigator submits a **single Ethereum wallet address** and receives, within seconds:

1. An automatically traced chain of direct fund transfers from that wallet, hop by hop, along a single dominant path.
2. Identification of whether the trail terminates at a **known exchange/VASP deposit wallet**, using a curated address-attribution dataset.
3. A **visual fund-flow diagram** showing the path, amounts, and timestamps.
4. A **rule-based risk indicator** flagging suspicious patterns (e.g., rapid hop sequences, wallets with no prior history).
5. A **downloadable, standardized investigation summary** (source wallet, path, destination exchange, risk indicator, timestamp) suitable for attaching to a legal request.

This is explicitly a **v1 / MVP scope**, built to demonstrate the core attribution concept end-to-end on real, verifiable historical data. It intentionally excludes cross-chain tracing, multi-branch (fan-out) tracing, DEX swap resolution, and ML-based clustering — these are documented as an explicit v2+ roadmap (see Doc 04), not omissions the team is unaware of.

---

## 5. Target Users / Personas (High Level)

- **Cybercrime Cell Investigator** (primary user) — frontline officer handling individual complaints; needs speed and a usable output, not raw blockchain data.
- **Financial Intelligence / Cyber Forensics Analyst** — handles more complex or high-value cases; benefits from the visual trail and exportable report as evidence.
- **Reviewing Officer / Supervisor** — consumes the generated report to authorize legal requests to exchanges; needs the output to be clear and standardized, not technical.

*(Detailed personas with goals, technical comfort level, and workflows are developed in Doc 02 — Product Requirements & UX Specification.)*

---

## 6. Value Proposition

For law enforcement agencies investigating cyber-enabled financial crime, RT-CFAS replaces hours of manual, expertise-dependent blockchain tracing with an automated, near-instant attribution result — reducing the time between a fraud report and actionable intelligence from hours to seconds, directly increasing the likelihood that proceeds of crime can be frozen before withdrawal.

---

## 7. Goals (v1)

- Automatically trace a single-path chain of Ethereum transactions from a reported wallet address.
- Correctly identify when the trail reaches a known exchange/VASP deposit address.
- Present the trail as a clear visual fund-flow diagram.
- Generate a standardized, exportable investigation report.
- Demonstrate the full pipeline on at least one real, historical, verifiable scam case.
- Produce a system credible enough, and demonstrably functional enough, to be shortlisted at the SIH internal round and beyond.

---

## 8. Non-Goals (v1)

Explicitly out of scope for v1 (deferred to later phases, see Doc 04):

- Cross-chain tracing (bridges, wrapped assets)
- Multi-branch / fan-out tracing (one wallet splitting funds across many destinations)
- DEX swap detection and resolution (token A → token B mid-route)
- Mixer/tumbler and privacy-coin analysis
- ML-based wallet clustering or entity resolution
- Live integration with SAHYOG / NCRP production systems (a stubbed/mock integration only)
- Case management, multi-user accounts, or role-based access control
- Support for chains other than Ethereum

---

## 9. Key Use Cases (v1)

1. **Single-wallet trace:** Investigator enters a wallet address reported by a victim → system returns the fund-flow trail and destination exchange (if found within the traced hop depth).
2. **Evidence export:** Investigator downloads a report summarizing the trace for use in a legal request to the identified exchange.
3. **Visual review:** Investigator or supervisor visually inspects the fund-flow diagram to quickly understand the case without reading raw blockchain data.
4. **Risk triage:** Investigator sees a basic risk indicator to gauge urgency/suspicion level of the wallet at a glance.

---

## 10. Competitive / Alternative Solutions

- **Manual tracing via public explorers** (Etherscan, Blockchair) — the current baseline; free but entirely manual and slow.
- **Commercial blockchain forensics platforms** (e.g., Chainalysis, TRM Labs, Elliptic) — powerful and comprehensive, but expensive, require procurement cycles, and are not tailored to India-specific investigation workflows (NCRP/SAHYOG integration, MHA reporting formats).
- **Generic open-source blockchain explorers/APIs** — provide raw data but no attribution intelligence, risk scoring, or investigator-facing workflow.

---

## 11. Differentiation

- **Purpose-built for the Indian LEA workflow**, with a roadmap toward direct NCRP/SAHYOG integration rather than a generic international tool.
- **Investigator-first output** — a report and visual, not a raw data dump.
- **Transparent, explainable risk logic** rather than a black-box score, building investigator and court trust.
- **Incrementally deployable**: v1 solves the single most common, highest-leverage case (simple direct trail to an exchange) before tackling the long tail of complex laundering techniques — reducing time-to-value.

---

## 12. Success Metrics (v1)

- **Correctness:** System correctly identifies the destination exchange for a known, verified historical scam case.
- **Speed:** Trace + report generation completes in well under a minute for a moderate-length hop chain.
- **Demonstrability:** A live, working demo (not slides-only) can be shown to judges end-to-end.
- **Clarity of output:** A non-technical reviewer can understand the fund-flow diagram and report without explanation.
- **Round 1 outcome:** Selection for the next stage of SIH 2026.

---

## 13. Assumptions

- Blockchain transaction data (via public APIs such as Etherscan) is available, sufficiently reliable, and free/low-cost for the volumes needed in a demo/prototype context.
- A usable, reasonably current dataset of known exchange/VASP deposit addresses can be compiled from open sources within the v1 timeline.
- Ethereum is a representative and sufficient chain to prove the core concept for v1; other chains follow the same architectural pattern in later phases.
- Judges evaluate working prototypes with real/realistic data more favorably than purely conceptual presentations.

---

## 14. Constraints

- **Timeline:** v1 must be functional and demoable before the internal college hackathon (Sept 7–14, 2026); today's date is Aug 25, 2026.
- **Team composition:** 6 members — 2 AI/ML, 1 MERN stack, 1 web3/blockchain + fullstack, 2 juniors with foundational coding skills.
- **Tooling:** Primarily AI-assisted IDEs, to accelerate development within a compressed timeline.
- **Budget:** Free-tier APIs and open datasets only for v1; no paid blockchain forensics data providers.
- **Data access:** No access to production NCRP/SAHYOG systems — integration must be mocked/stubbed for v1.

---

## 15. SIH-Specific Requirements

Mapping back to the original problem statement (Ministry of Home Affairs), v1 must visibly address:

- Automated (not manual) blockchain tracing from a victim-reported wallet address ✅ core v1 feature
- Identification of the associated exchange/VASP receiving funds ✅ core v1 feature
- Fund-flow visualization ✅ core v1 feature
- Generation of an investigation-ready report ✅ core v1 feature
- Reduction in investigation response time ✅ demonstrated via speed metric
- A clear articulation (not yet built) of how the system will extend to multi-chain, DeFi, mixers, and SAHYOG/NCRP integration — presented explicitly as the v2+ roadmap, showing the team understands the full problem scope even where v1 does not yet solve it

---

*This document defines the v1 product and business scope only. Full-scale personas, competitive depth, and expanded goals for later phases will be addressed in subsequent revisions of this document as the project progresses beyond v1.*

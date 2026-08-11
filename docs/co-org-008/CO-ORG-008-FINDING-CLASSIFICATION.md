# CO-ORG-008 — Finding Classification Matrix

**Date:** 2026-08-07  
**Sources:** CO-ORG-003…007 · CO-ORG-004 · CO-UX-021 · CO-PROD-READY-001 · CO-QA open items  
**Rule:** Production Blockers stop go-live claims. Go-Live Required items must close for an honest limited pilot. Phase 2 / Future do not block a scoped Soft Go-Live if PO accepts caveats.

---

## 1. Production Blockers

Must be cleared (or explicitly accepted as out-of-scope with surfaces disabled/labeled) before **any** production claim of Enterprise Operating System readiness.

| ID | Finding | Why blocking | Evidence |
|----|---------|--------------|----------|
| PB-01 | **No Product Owner production approval** | Constitutional deploy gate | PO instruction; all recent certs |
| PB-02 | **Live E2E Scenario Pack not executed / not Pass** | CO-QA-001 — engineering verify ≠ Business Certified | `docs/co-org-006/CO-ORG-006-E2E-SCENARIO.md` |
| PB-03 | **Prisma persistence + migrations not confirmed on target** | Without prisma, Deal/EAR/Notes/Org durability degrades to Soft Go-Live / 202 | Env + migration ops |
| PB-04 | **Demo / seed invent must not be on in production** | CAD-2026-001 / data integrity — decisions from fake data | `isDemoSeedEnabled`; CO-ORG-004 |
| PB-05 | **Document Registry browser-local durability** | Documents can be lost across devices / serverless isolates | `src/lib/document-registry/store.ts`; CO-PROD-READY C6 |
| PB-06 | **Accounting commercial SSOT unbound** | Cannot go live claiming Accounting / commission truth | `ACCOUNTING_SSOT_PENDING_MESSAGE`; CO-ORG-006 |
| PB-07 | **Platform engines still default in-memory for Tasks / Dialogue / EDL** | Cross-session business memory loss if marketed as durable | ETE / EDC / EDL composition ports; CO-PROD-READY C1 |

> **Scoped Soft Pilot exception (PO-only):** PB-05…PB-07 and PB-06 may be deferred if Documents durability, durable Tasks/Dialogue/EDL, and Accounting are **explicitly out of pilot scope**, nav/labels say so, and Contact→Opportunity→Deal is the only certified path.

---

## 2. Go Live Required

Required for an **honest limited Soft Go-Live** (Contact → Opportunity → Opportunity Workspace → Lender Pipeline) even if Accounting / Investments / full MC are deferred.

| ID | Finding | Action |
|----|---------|--------|
| GL-01 | Apply EAR + Business Notes (+ Deal/Opportunity/ECM) migrations | Ops |
| GL-02 | `ENTERPRISE_PERSISTENCE_MODE=prisma` (+ public mirror) on BAT & prod | Ops |
| GL-03 | Execute `CO-ORG-006-E2E-001` on live URL → Pass log | BAT |
| GL-04 | Soft Go-Live Deal dual-path: document single active path or retire dual-write | Architecture cleanup |
| GL-05 | Hide or finish Mission Control **enabled scaffold** rail modules | Nav honesty (CO-ORG-007) |
| GL-06 | Resolve Investments **Soon**: keep labeled **or** remove from primary | Product policy |
| GL-07 | Align ADMIN vs SUPER_ADMIN for Organization tiles / layout / command palette | Permissions |
| GL-08 | Business Notes PO acceptance if Notes shipped in pilot | CO-UX-021 |
| GL-09 | Close or waive CO-QA open Deal-path items (Kanban delete, lender search, Move-to-Deal) for pilot scope | CO-QA-* |
| GL-10 | Confirm Production Reset / dangerous admin flags default OFF in prod | Ops safety |
| GL-11 | EAR Document upload emit gap — accept as known OR patch before claiming Activity completeness | CO-ORG-003 |

---

## 3. Phase 2

Post Soft Go-Live programmes — required for **full** enterprise commercial / supervision readiness.

| ID | Finding | Programme |
|----|---------|-----------|
| P2-01 | Accounting Deal-keyed ledger (invoices, GST, payouts, commissions) | Accounting Registry |
| P2-02 | Document Registry Postgres + binary durability + EAR document emits | Document Platform |
| P2-03 | ETE Prisma ports + Recovery adapters for tasks | Task durability |
| P2-04 | EDL Prisma ports | Governance durability |
| P2-05 | EDC durable ports (or permanent projection-only policy) | Dialogue platform |
| P2-06 | Dashboard / Mission Control → EBI certified snapshot consumers | EBI / EME |
| P2-07 | Partner Gateway / Partner Business → Opportunity Registry cutover | WP journey |
| P2-08 | Soft Go-Live / LoanFile dual-path Phase C retirement | CO-ARCH-006 |
| P2-09 | Soft-delete adapters for remaining stubs | Recovery Center |
| P2-10 | FS-01 Product Owner “FS-01 Approved” freeze | Opportunity runtime |
| P2-11 | Observability / Security Operations live probes | Mission Control ops |
| P2-12 | Horizon strategic SSOT (replace mock providers) | Horizon |
| P2-13 | C360 Financial Profile SSOT | Customer finance |
| P2-14 | Analyze Deal eligibility engine (no fake confidence) | Credit / Product–Lender |

---

## 4. Future Enhancements

Not required for Soft Go-Live or Phase 2 commercial close — roadmap.

| ID | Finding | Notes |
|----|---------|-------|
| FE-01 | Investments product line | Primary nav Soon by design |
| FE-02 | Dedicated Disbursement Workspace | Today = Deal pipeline stage |
| FE-03 | Enterprise AI Orchestrator Hybrid Cutover | ADR-022 — not authorised |
| FE-04 | SARATHI production voice (STT/TTS) | Stub ports today |
| FE-05 | Chanakya Radar direct EAR reader | Indirect via Deal Timeline dual-write OK |
| FE-06 | EAR historical backfill | Pre-EAR chronology |
| FE-07 | Action Center non-email channels | Coming soon |
| FE-08 | ENCE external delivery enablement | Flag hard-off |
| FE-09 | Relationship Heat Map algorithm completion | Scaffold / demo tiles |
| FE-10 | Credit Risk Engine admin section completion | Many placeholders |
| FE-11 | MFA / Break Glass production hardening | Security debt |
| FE-12 | Legal Terms public page replacement | Public launch only |
| FE-13 | Administration catalogue sync (`administrationChildren` vs console) | Hygiene |
| FE-14 | Settings Preferences / Notifications content | Soft stubs |

---

## Classification rules used

| Bucket | Definition |
|--------|------------|
| **Production Blockers** | Prevent truthful production claim; data loss, invent, missing approval/BAT, or unbound commercial SSOT in claimed scope |
| **Go Live Required** | Needed for scoped Soft Go-Live honesty and safe ops |
| **Phase 2** | Full enterprise commercial + durable platforms + executive SSOT bind |
| **Future Enhancements** | Roadmap / optional / explicitly deferred ADRs |

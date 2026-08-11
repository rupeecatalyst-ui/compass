# CO-ORG-004 — Production Readiness Report

**Sprint:** CO-ORG-004  
**Date:** 2026-08-07  
**Scope:** Full-application review — remove mock / demo / placeholder / invented KPI surfaces  
**Deployment:** **Not performed** (PO instruction)

---

## 1. Executive verdict

| Area | Status |
|------|--------|
| Blocking invented KPI surfaces (Accounting, Situation Room, EDW, Observability %, Security %, Horizon portfolio, C360 random finance, Partner seeds, Analyze Deal mock %) | **Quarantined / emptied** |
| Demo-seed policy (`isDemoSeedEnabled`) | **Sound** for prisma / Vercel / production builds |
| Universal Activity chronology | **EAR live** (CO-ORG-003) |
| Full enterprise replacement for every emptied surface | **Not complete** — empty / awaiting SSOT (honest) vs fake-as-truth |
| Ready for production go-live without BAT | **No** — see gaps + BAT |
| Engineering gate | `npm run verify:co-org-004` |

**Verdict:** 🟡 **Partially production-ready for truthfulness** — invented decision-critical numbers removed from primary Mission Control / Accounting / Horizon / Partner seed paths. Several modules now show empty / “awaiting SSOT” instead of fake data. Remaining Soft Go-Live dual-books, ETE in-memory, EDL in-memory, and dashboard seed widgets (demo-gated) still require follow-up before full Go-Live certification.

---

## 2. What was removed / replaced (this sprint)

| Surface | Before | After |
|---------|--------|-------|
| Accounting Workspace | Hardcoded ₹ crores / invoices | Empty model + SSOT-pending message |
| Situation Room health/domains/alerts | Fake healthy/warning + critical SLA rows | Unknown health · empty domains/alerts · EAR activity retained |
| Executive Decision Workspace | Mock priority / watch / approvals / highlights | Empty arrays |
| Observability Center | 99.4% uptime · invented p95 latency · fake engines | Empty registries · “Not instrumented” availability |
| Security Operations | 86% controls · fake threats/sessions | Empty / not assessed |
| Horizon | Sample lease/initiative portfolio | Empty portfolio providers |
| Executive intelligence mockInsights | Fake ops/credit narratives | Empty insights |
| Customer 360 financial refresh | `Math.random()` income invent + seed HDFC/stub opp | No random invent · no seed bank/opp invent |
| Partner Business | Deterministic 6 opportunity seeds | Seeds disabled · empty customers when unset |
| Analyze Deal | Fake 87% confidence + lender rows | Empty recommendations + honest improvement copy |
| Dashboard `scaleCount` | `Math.max(1,…)` invent floor | `Math.max(0,…)` |
| Org KPI grid | Seed flash / seed fallback | Load live · empty on failure |
| EDL admin | Looked durable | In-memory Phase 1 amber banner |

---

## 3. Inventory — remaining production-risk items

### HIGH (follow-up sprints)

| Item | Path / notes |
|------|----------------|
| User Home dashboard widgets still *can* consume `src/data/catalyst-one/dashboard.ts` when demo seeds on | Keep `CATALYST_DEMO_SEEDS_ENABLED=false` + prisma mode; wire EBI certified snapshot |
| Accounting Deal-keyed ledger SSOT not built | Empty until Accounting Registry |
| Partner Business Map still not Opportunity Registry cutover | Seeds off; full projection pending |
| ETE / EDC still in-memory for tasks/dialogue composition | EAR dual-write exists; durable ETE ports pending |
| Soft Go-Live Deal dual-write residual | Rollback-only when prisma primary |
| Soft-delete stubs (tasks/notes/workflow) | Empty / throw — Recovery Center must label “not implemented” |

### MEDIUM

| Item | Notes |
|------|-------|
| Horizon dead sample helpers still in file (unused when providers empty) | Cleanup sprint |
| OW `workspace-placeholder-provider` compose helpers | Dialogue compose UX only; timeline hydrates EAR |
| Alert Center `mockAlerts` | Already gated by `isDemoSeedEnabled` |
| RIC mock dataset | Quarantined export; live Network uses ECM |
| Math.random for IDs / UX jitter | Acceptable — not KPI invent |
| AI stub LLM/STT providers | Shadow / non-KPI |

### LOW / policy

| Item | Notes |
|------|-------|
| Master seed catalogs (products, cities, document types) | Config masters — OK when labelled |
| Demo auth without DATABASE_URL | Local-only path |

---

## 4. Enterprise replacements used

| Capability | SSOT / approach |
|------------|-----------------|
| Activity feeds | Enterprise Activity Registry (CO-ORG-003) |
| Org KPIs | Organization Workspace APIs |
| Analyze Deal | Empty until Product–Lender Matrix + Credit engines bind; Manual / Lender Registry for ops |
| Partner list | Persisted WP profile slice only — no auto-seed invent |
| Mission Control posture | Honest empty / unknown until EBI / Ops / Alert bind |

---

## 5. Verification

```bash
npm run verify:co-org-004
```

Engineering gate only — **not** Business Certification (CO-QA-001).

---

## 6. Manual / ops checklist before claiming Go-Live

1. `ENTERPRISE_PERSISTENCE_MODE=prisma` + public mirror  
2. `CATALYST_DEMO_SEEDS_ENABLED=false` (or unset; policy disables on Vercel/prisma)  
3. Apply pending migrations (incl. EAR CO-ORG-003)  
4. BAT: Mission Control empty ≠ fake; Accounting empty; Horizon empty; no Partner seed invent  
5. Confirm Soft Go-Live Deal dual-write not default-read  

---

## 7. Related artefacts

- Architecture / gaps: this report  
- Prior: `docs/co-org-003/*`, `docs/co-prod-ready-001/*`, `docs/co-esp-001/*`  
- Verify: `scripts/co-org-004-verify.mjs`

---

## 8. Constitutional Health Check

**GREEN** for quarantine of invented KPIs and empty/honest SSOT-pending states.  
Does not redesign workspace chrome. Does not invent replacement formulas. Chanakya remains non-blocking.

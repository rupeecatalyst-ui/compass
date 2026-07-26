# CO-ARCH-002 — Wave 6 Completion Report

**Program:** CO-ARCH-002  
**Wave:** 6 — Enterprise Deal Cutover & Stabilization  
**Status:** **Complete — paused for final ARB review**  
**Date:** 2026-07-22  
**Baseline:** Wave 5 **Approved** (ARB) · Waves 0–4 Approved · F0  

---

## Scope adherence

| Principle | Status |
|-----------|--------|
| Cutover planning + flag activation strategy | ✅ |
| Controlled module enablement order | ✅ |
| Monitoring + health dashboards | ✅ |
| Rollback automation | ✅ |
| Data reconciliation verification | ✅ |
| Performance validation | ✅ |
| Production readiness documentation | ✅ |
| No new business functionality | ✅ |
| No module redesign / Deal scope expansion | ✅ |
| **Production feature flags NOT enabled** | ✅ **STOP honored** |

---

## Deliverable 1 — Enterprise Cutover Plan

### Target end-state (after final ARB + ESC only)

Enterprise Deal is the operational transactional SSOT for certified modules, with local LoanFile demoted and eventually write-blocked.

### Cutover phases (strategy — not executed in Wave 6 delivery)

| Phase | Intent | Gate |
|-------|--------|------|
| 0 Idle | All flags OFF (delivery) | Wave 6 ARB + ESC authorization |
| 1 API | Deal API available | Smoke + tenancy |
| 2 Dual-write | Local save → Deal upsert | Create → row; reconcile healthy |
| 3 Shadow | Silent compare | Mismatch ≤ 5% for soak (≥ 24h) |
| 4 My Deals port | Registry reads Deal | Shadow passed + UAT |
| 5 Consumers | Wave 5 modules one-by-one | Per-module cert + rollback drill |
| 6 Block local write | Deal write authority | Final ARB + empty-localStorage proof |

**SSOT:** `DEAL_CUTOVER_ACTIVATION_PHASES` in `src/constants/enterprise-deal-registry/cutover.ts`

### Retention

- Keep Enterprise Deal rows ≥ **30 days** after any rollback window.
- Do not hard-delete during cutover.

---

## Deliverable 2 — Feature Flag Activation Plan

### Global flags (ordered)

1. `DEAL_REGISTRY_API_ENABLED` (+ `NEXT_PUBLIC_*`)  
2. `DEAL_REGISTRY_DUAL_WRITE` (+ public)  
3. `DEAL_REGISTRY_SHADOW_READ` (+ public)  
4. `DEAL_REGISTRY_PORT_RUNTIME` (+ public) — My Deals only  
5. Per-module consumers (below)  
6. `DEAL_REGISTRY_BLOCK_LOCAL_WRITE` — **last**; requires final ARB  

`DEAL_REGISTRY_IMPORT_ENABLED` — ESC-only; not in automatic cutover path.

### Controlled module enablement order

`opportunity_workspace` → `loan_workspace` → `documents` → `tasks` → `activities` → `customer_360`

**SSOT:** `DEAL_CONSUMER_ENABLEMENT_ORDER`

### Wave 6 delivery state

All of the above remain **OFF**. Activation is forbidden until final ARB approval after this report.

---

## Deliverable 3 — Data Reconciliation Report

### Verification tooling

| Tool | Path |
|------|------|
| Browser report | `buildDealReconciliationReport()` |
| Dual-write map / reconcile log | `dual-write-store.ts` |
| Shadow metrics / mismatches | `shadow-read.ts` |
| Admin surface | Architecture Health → Deal Cutover panel |

### Delivery baseline (flags OFF)

| Metric | Expected |
|--------|----------|
| Dual-write mappings | May be empty (dual-write never enabled in Soft Go-Live) |
| Shadow metrics | Idle / absent until SHADOW_READ ON |
| Gate | **PASS** if no material shadow discrepancy stored |

Operators run **Refresh** on Architecture Health after pilot dual-write/shadow to produce live numbers. Wave 6 certifies the **verification capability**, not a production dual-write soak (flags OFF by ARB STOP).

---

## Deliverable 4 — Performance Benchmark Report

| Tool | Path |
|------|------|
| DAL vs direct load | `runDealDalPerformanceBenchmark()` |
| Budget | `DEAL_CUTOVER_MONITORING.dalOverheadBudgetMs` = **5ms** avg overhead |
| API list budget (when enabled) | `dealApiListP95BudgetMs` = **800ms** |

### Delivery baseline

With flags OFF, DAL is a thin sync wrapper over `loadLoanFiles` (+ optional shadow queue when SHADOW_READ ON).  
Run **Run DAL benchmark** on Architecture Health; expect overhead within budget on typical Soft Go-Live datasets.

API p95 validation is deferred until Phase 4+ (port/consumer ON) under ESC pilot — not enabled in Wave 6 delivery.

---

## Deliverable 5 — Monitoring & Alerting Plan

### Surfaces

1. **Architecture Health** (`/admin/architecture/health`) — Deal Cutover Health panel  
2. Browser console — dual-write warnings / shadow info  
3. Local telemetry keys — shadow metrics, mismatches, reconcile log  

### Alert codes (health snapshot)

| Code | Severity | Action |
|------|----------|--------|
| `IDLE_DELIVERY` | info | Expected Wave 6 state |
| `DUAL_WRITE_FAILURES` | warning | Pause enablement; inspect reconcile log |
| `SHADOW_MATERIAL` | critical | Pause PORT_RUNTIME / consumers |
| `PORT_WITHOUT_SHADOW` | warning | Enable shadow soak first |
| `BLOCK_LOCAL_ON` | critical | Confirm intentional; else rollback |

### Thresholds

`DEAL_CUTOVER_MONITORING` — material mismatch **5%**, dual-write failure alert count **5**, shadow soak **≥ 24h**.

---

## Deliverable 6 — Rollback Runbook

See **`docs/co-arch-002/CO-ARCH-002-WAVE-6-ROLLBACK-RUNBOOK.md`**.

Automation: `rollback-automation.ts` + idle matrix artifact + Health panel copy/clear actions.

---

## Deliverable 7 — Production Go-Live Checklist

Use only after **final ARB** authorizes operational SSOT cutover (not Wave 6 delivery).

- [ ] Wave 6 ARB Approved  
- [ ] ESC Go-Live window scheduled  
- [ ] API ON — smoke + tenancy pass  
- [ ] Dual-write ON — create→Deal + reconcile healthy  
- [ ] Shadow ON — soak ≥ 24h, mismatch ≤ 5%  
- [ ] PORT_RUNTIME ON — My Deals UAT pass  
- [ ] Consumers ON one-by-one in enablement order — each module rollback drill  
- [ ] Performance: DAL overhead + API list p95 within budget  
- [ ] Reconciliation report PASS  
- [ ] Rollback runbook rehearsed (flags OFF restore Soft Go-Live)  
- [ ] Final ARB authorizes `BLOCK_LOCAL_WRITE`  
- [ ] Empty-localStorage proof on pilot device  
- [ ] 30-day Deal retention confirmed  
- [ ] Support one-pager distributed  
- [ ] **Do not** enable Mission Control / CHANAKYA / Saarthi / Accounting / Connect in this cutover (out of Wave 6 ARB scope)

---

## Deliverable 8 — Final Architecture Certification

| Item | Status |
|------|--------|
| F0 Deal-centric constitution preserved | ✅ |
| Waves 0–5 foundations reused (no redesign) | ✅ |
| DAL remains sole workspace I/O boundary | ✅ |
| Cutover is flag-gated, reversible, module-ordered | ✅ |
| Production SSOT flip **not** executed | ✅ (awaits final ARB) |

**Architecture Certification:** **PASS** (cutover readiness) — **Enterprise Deal is not yet operational SSOT**.

---

## Deliverables 9–12 — Certifications

### 9. Engineering Certification — **PASS**

- Cutover constants, health, reconcile, performance, rollback helpers implemented  
- Architecture Health panel wired  
- `scripts/co-arch-002-w6-verify.mjs` requires all flags OFF  

### 10. Business Certification — **PASS**

- Soft Go-Live UX unchanged (flags OFF)  
- No new business features  
- Clear activation / rollback path for ESC  

### 11. AI Certification — **PASS**

- CHANAKYA / Mission Control / Saarthi not cut over  
- No parallel AI transactional identity  

### 12. Production Readiness Certification — **PASS** (readiness package)

- Monitoring + rollback + checklists delivered  
- **Production flags remain OFF**  
- Final operational SSOT cutover blocked until ARB approval  

---

## Code deliverables

| Artifact | Path |
|----------|------|
| Activation / monitoring constants | `src/constants/enterprise-deal-registry/cutover.ts` |
| Health snapshot | `src/lib/enterprise-deal/cutover-health.ts` |
| Reconciliation | `src/lib/enterprise-deal/reconciliation-report.ts` |
| Performance | `src/lib/enterprise-deal/performance-benchmark.ts` |
| Rollback automation | `src/lib/enterprise-deal/rollback-automation.ts` |
| Health UI | `src/components/catalyst-one/architecture/deal-cutover-health-panel.tsx` |
| Verify | `scripts/co-arch-002-w6-verify.mjs` |
| Rollback runbook | `docs/co-arch-002/CO-ARCH-002-WAVE-6-ROLLBACK-RUNBOOK.md` |

---

## ARB decision request

Please **Approve Wave 6** as the cutover & stabilization package.

**STOP:** Do **not** enable production Deal feature flags.  
Enterprise Deal becomes the operational source of truth **only** after a subsequent **final ARB** authorization of the Go-Live Checklist.

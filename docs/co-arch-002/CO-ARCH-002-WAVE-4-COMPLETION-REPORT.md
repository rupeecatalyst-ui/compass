# CO-ARCH-002 — Wave 4 Completion Report

**Program:** CO-ARCH-002  
**Wave:** 4 — Dual-Read / Shadow Read (My Deals first)  
**Status:** **Approved by ARB**  
**Date:** 2026-07-22  
**Baseline:** Wave 3 Approved (authorization) · Wave 2 Approved · F0  
**ARB decision:** Wave 4 Certified — Wave 5 authorized  

---

## Scope adherence

| Principle | Status |
|-----------|--------|
| Shadow Read first | ✅ |
| Compare results | ✅ |
| Log mismatches | ✅ `compass:deal-shadow-read-mismatches` |
| No user-visible changes during Shadow Read | ✅ Shadow never feeds table rows |
| Feature flags OFF by default | ✅ |
| Enable Deal reads only after consistency proven | ✅ `PORT_RUNTIME` blocked until shadow passes |
| Migrate one module at a time | ✅ **My Deals only** |
| Pause on material discrepancies | ✅ >5% mismatch → `paused_discrepancy` / port blocked |
| Wave 5 modules | ✅ Authorized after this wave’s ARB approval (see Wave 5 report) |

---

## 1. Shadow Read Architecture

```
[My Deals mount / loan-files tick]
        │
        ├─► listDealRegistryRows(loadLoanFiles())  → UI table (PRIMARY always when flags OFF)
        │
        └─► queueMyDealsShadowRead(files)          [SHADOW_READ flag]
                 │
                 ├─ OFF → no-op (idle_flag_off)
                 └─ ON  → GET /api/enterprise-deals (lending, not archived)
                          compare by legacyLoanFileId
                          log mismatches + metrics
                          NEVER setState(rows)
```

**Active Dual-Read (prepared, OFF):**

```
PORT_RUNTIME OFF → localRows only (Soft Go-Live identical)
PORT_RUNTIME ON  → loadMyDealsDealRegistryRows()
                     ├─ success → enterprise_deal rows
                     └─ error   → local_fallback (same UX as today)
```

---

## 2. Read Equivalence Report

| Equivalence field | Local (`LoanFile`) | Enterprise Deal | Compare |
|-------------------|--------------------|-----------------|---------|
| Identity | `file.id` | `legacyLoanFileId` | Join key |
| Stage | `migrateLegacyStage(stage)` | `grossStage` | Exact |
| Borrower | `customerName` | `primaryContactName` | Exact |
| Product | `loanProduct` | `productLabel` | Exact |
| Amount | `requiredAmount \|\| loanAmount` | `requestedAmount` | ±1 INR |
| Presence | Non-archived local | Non-deleted Deal with legacy id | Set compare |

**UI projection when PORT_RUNTIME ON:** `mapEnterpriseDealToDealRegistryRow` → `DealRegistryRow` (filter/sort reuse unchanged).

---

## 3. Consistency Metrics

Stored at `compass:deal-shadow-read-metrics` per module:

| Metric | Meaning |
|--------|---------|
| `localCount` | Active local LoanFiles |
| `dealCount` | Deal API lending rows with legacy id |
| `matched` | Exact field match |
| `missingOnDeal` | Local without Deal |
| `missingOnLocal` | Deal without local |
| `fieldDrift` | Joined but fields differ |
| `mismatchRate` | `(missingOnDeal + fieldDrift) / max(localCount,1)` |
| `materialDiscrepancy` | `mismatchRate > 5%` |
| `durationMs` | Shadow run time |

Helpers: `getLatestShadowMetrics()`, `listShadowMismatches()`, `getModuleMigrationStatus()`.

---

## 4. Mismatch Analysis

| Kind | Cause | Action |
|------|-------|--------|
| `missing_on_deal` | Dual-write not yet populated / flag OFF historically | Enable dual-write + re-save; do not enable PORT_RUNTIME |
| `missing_on_local` | Deal without browser LoanFile (multi-device / import) | Expected in hybrid; track rate |
| `field_drift` | Stage/name/product/amount out of sync | Investigate dual-write path; pause port |
| `api_error` | API disabled / auth / network | Shadow status `error`; port blocked |

**Material threshold:** `SHADOW_READ_MATERIAL_MISMATCH_RATE = 0.05` → module status `paused_discrepancy`, `portRuntime: blocked`.

---

## 5. Feature Flag Matrix

| Flag | Default | Effect |
|------|---------|--------|
| `DEAL_REGISTRY_API_ENABLED` (+ public) | OFF | Deal API 404 when OFF |
| `DEAL_REGISTRY_DUAL_WRITE` (+ public) | OFF | Secondary write |
| `DEAL_REGISTRY_SHADOW_READ` (+ public) | OFF | Compare + log only |
| `DEAL_REGISTRY_PORT_RUNTIME` (+ public) | OFF | My Deals reads Deal API |
| `DEAL_REGISTRY_IMPORT_ENABLED` | OFF | Import (later) |
| `DEAL_REGISTRY_BLOCK_LOCAL_WRITE` | OFF | Cutover (Wave 6) |

**Recommended enable order (pilot, after ARB):**  
1. API ON → 2. Dual-write ON → 3. Shadow Read ON → prove metrics → 4. Port runtime ON.

---

## 6. Module Migration Status

| Module | Shadow | Port runtime | Wave |
|--------|--------|--------------|------|
| **My Deals** | Ready (flag OFF / idle) | Ready but **blocked** until shadow passes | **4** |
| Opportunity Workspace | Not started | — | 5 |
| Loan / Deal Workspace | Not started | — | 5 |
| Documents / Tasks | Not started | — | 5 |
| Mission Control / CHANAKYA | Not started | — | 6 |

---

## 7. Rollback Strategy

| Issue | Action |
|-------|--------|
| Shadow noise / API errors | `DEAL_REGISTRY_SHADOW_READ=OFF` |
| Bad active reads | `DEAL_REGISTRY_PORT_RUNTIME=OFF` → immediate localRows |
| Dual-write defects | `DEAL_REGISTRY_DUAL_WRITE=OFF` |
| Full idle | All Deal flags OFF (Wave 4 delivery state) |

No schema rollback required. Soft Go-Live localStorage remains authoritative while flags OFF.

---

## Code deliverables

| Artifact | Path |
|----------|------|
| Shadow Read | `src/lib/enterprise-deal/shadow-read.ts` |
| Dual-read port | `src/lib/enterprise-deal/deal-registry-port.ts` |
| API → row mapper | `src/lib/enterprise-deal/map-deal-to-registry-row.ts` |
| My Deals wire | `src/components/catalyst-one/my-deals/my-deals-workspace.tsx` |
| Flags | `src/constants/enterprise-deal-registry/flags.ts` |
| Verify | `scripts/co-arch-002-w4-verify.mjs` → **PASSED** |

---

## Certifications

### Engineering
- [x] Shadow Read + port infrastructure; TypeScript clean  
- [x] Flags default OFF; UI uses `portRows ?? localRows`  

### Data
- [x] Compare join on `legacyLoanFileId`; metrics + mismatch log  
- [x] Material threshold pauses port recommendation  

### Business
- [x] Soft Go-Live My Deals UX unchanged while flags OFF  
- [x] One module (My Deals) only  

### AI
- [x] No CHANAKYA / Mission Control read swap  
- [x] No parallel AI case identity  

### Production readiness
- [x] Idle by default  
- [x] Rollback = flags OFF  
- [x] **STOP honored historically** — Wave 5 proceeded only after ARB Approved Wave 4  

---

## ARB decision (recorded)

**Approved / Certified** — Wave 5 (Workspace Consumers) authorized.

See `CO-ARCH-002-WAVE-5-COMPLETION-REPORT.md`.

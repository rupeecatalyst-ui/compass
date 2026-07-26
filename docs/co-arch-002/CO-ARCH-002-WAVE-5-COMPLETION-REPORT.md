# CO-ARCH-002 — Wave 5 Completion Report

**Program:** CO-ARCH-002  
**Wave:** 5 — Workspace Consumers (controlled migration via Deal Data Access Layer)  
**Status:** **Approved by ARB**  
**Date:** 2026-07-22  
**Baseline:** Wave 4 **Approved** (ARB) · Waves 0–3 Approved · F0  
**ARB decision:** Wave 5 Certified — Wave 6 authorized  

---

## Scope adherence

| Principle | Status |
|-----------|--------|
| Module-by-module migration (no global cutover) | ✅ |
| All migrated modules read/write through Deal DAL | ✅ |
| DAL alone selects Legacy / Shadow / Enterprise | ✅ |
| Modules do not call `localStorage` or Deal API directly | ✅ (via DAL / storage adapters owned by DAL) |
| Per-module rollback via feature flags | ✅ |
| Feature flags OFF by default | ✅ |
| Soft Go-Live production behaviour unchanged | ✅ |
| Out of scope excluded (MC / CHANAKYA / Saarthi / Analytics / Accounting / External APIs / Connect) | ✅ |
| **STOP after Wave 5** — Wave 6 not started until ARB Approved Wave 5 | ✅ (Wave 6 proceeded after approval) |

---

## Architecture summary

### Deal Data Access Layer (DAL)

```
Workspace module
      │
      ▼
deal-data-access.ts  (ONLY allowed Deal I/O for Wave 5 consumers)
      │
      ├─ consumer flag OFF  → loadLoanFiles / saveLoanFiles (legacy Soft Go-Live)
      ├─ SHADOW_READ ON     → queue shadow compare (non-UI; Wave 4)
      └─ consumer flag ON   → prefer Enterprise Deal API + map-to-LoanFile stub
                              └─ on error → local_fallback
```

**Canonical paths**

| Artifact | Path |
|----------|------|
| DAL | `src/lib/enterprise-deal/deal-data-access.ts` |
| LoanFile stub mapper | `src/lib/enterprise-deal/map-deal-to-loan-file.ts` |
| Consumer flags | `src/constants/enterprise-deal-registry/flags.ts` |
| Verify | `scripts/co-arch-002-w5-verify.mjs` → **PASSED** |

---

## 1. Module Migration Matrix

| Module | Before | After | Flag (default OFF) | Certified |
|--------|--------|-------|--------------------|-----------|
| Opportunity Workspace | Direct LoanFile load/save in journey helpers | `loadDealsSync` / `updateDeal(..., "opportunity_workspace")` | `DEAL_REGISTRY_CONSUMER_OPPORTUNITY` (+ `NEXT_PUBLIC_*`) | ✅ |
| Loan Workspace | `loadLoanFiles` / `updateLoanFileInStorage` in hooks & modal | `loadDealsSync` / `saveDeals` / `updateDeal(..., "loan_workspace")` | `DEAL_REGISTRY_CONSUMER_LOAN_WORKSPACE` | ✅ |
| Customer 360 | `getAllLoanFiles` / direct storage in utils & modal | `loadDealsSync("customer_360")` / `saveDeals` | `DEAL_REGISTRY_CONSUMER_CUSTOMER_360` | ✅ |
| Documents Workspace | Document registry → LoanFile storage | `updateDeal(..., "documents")` | `DEAL_REGISTRY_CONSUMER_DOCUMENTS` | ✅ |
| Tasks Workspace | Task board → LoanFile tasks patch | `loadDealsSync("tasks")` / `updateDealTasks(..., "tasks")` | `DEAL_REGISTRY_CONSUMER_TASKS` | ✅ |
| Activities Workspace | Timeline embedded in LoanFile aggregate | View/module tag `activities`; `updateDealTimeline` helper | `DEAL_REGISTRY_CONSUMER_ACTIVITIES` | ✅ |

**Explicitly not migrated (Wave 6+):** Mission Control · CHANAKYA · Saarthi · Analytics · Accounting · External APIs · Catalyst Connect · My Deals port runtime remains Wave 4 controls.

---

## 2. Workspace Read Path Map

| Workspace | Read entry | Module key | Source when flag OFF | Source when flag ON |
|-----------|------------|------------|----------------------|---------------------|
| Opportunity | `opportunity-workspace-context`, `load-context`, `opportunity-loan-continuity` | `opportunity_workspace` | Legacy LoanFile | Enterprise Deal → LoanFile stub (+ local merge) |
| Loan | `use-loan-files-workspace`, `use-loan-board`, lender select/sync | `loan_workspace` | Legacy | Enterprise preferred |
| Customer 360 | `use-customers-workspace`, `customer-utils`, C360 modal | `customer_360` | Legacy | Enterprise preferred |
| Documents | Deal document links via registry store → DAL get/update | `documents` | Legacy | Enterprise preferred |
| Tasks | Task board / loan files tasks view | `tasks` | Legacy | Enterprise preferred |
| Activities | Timeline view / timeline helper | `activities` | Legacy | Enterprise preferred |

Shadow Read (global `DEAL_REGISTRY_SHADOW_READ`) may still queue silent compares from DAL sync reads — never feeds UI rows in Wave 5.

---

## 3. Workspace Write Path Map

| Workspace | Write entry | DAL API | Downstream (flag OFF) |
|-----------|-------------|---------|------------------------|
| Opportunity | OW Save Draft touch | `updateDeal(id, patch, note, "opportunity_workspace")` | `updateLoanFileInStorage` → `saveLoanFiles` (+ Wave 3 dual-write if ON) |
| Loan | Modal persist, board save, lender pipeline | `updateDeal` / `saveDeals` (`loan_workspace`) | Same |
| Customer 360 | Create / link deals from C360 | `saveDeals(..., "customer_360")` | Same |
| Documents | Document checklist mutations | `updateDeal(..., "documents")` | Same |
| Tasks | Task board mutations | `updateDealTasks(..., "tasks")` | Same |
| Activities | Timeline replace / note helper | `updateDealTimeline(..., "activities")` or aggregate save via `updateDeal` | Same |

**Rule:** No workspace imports `deal-api-client`. Dual-write remains inside `saveLoanFiles` (Wave 3), not in UI modules.

---

## 4. Per-module architecture (Before → After)

### 4.1 Opportunity Workspace

| | |
|--|--|
| **Before** | Journey loaders / context called LoanFile storage helpers directly |
| **After** | All deal reads via `loadDealsSync("opportunity_workspace")`; saves via `updateDeal(..., "opportunity_workspace")` |
| **Read path** | Context → DAL → legacy (OFF) / Enterprise (ON) |
| **Write path** | Save Draft → DAL `updateDeal` → storage (+ optional dual-write) |
| **Rollback** | `DEAL_REGISTRY_CONSUMER_OPPORTUNITY=false` (and public mirror) |
| **Validation** | Verify script wiring tokens; flags OFF; Soft Go-Live UX unchanged |

### 4.2 Loan Workspace

| | |
|--|--|
| **Before** | `use-loan-files-workspace` / modal / board / lender sync used storage utils |
| **After** | Same surfaces call DAL with `loan_workspace` (timeline/tasks views tag `activities` / `tasks`) |
| **Read path** | Hooks → DAL |
| **Write path** | Persist / lender / tasks → DAL |
| **Rollback** | `DEAL_REGISTRY_CONSUMER_LOAN_WORKSPACE=false` |
| **Validation** | Verify + TypeScript clean |

### 4.3 Customer 360

| | |
|--|--|
| **Before** | `customer-utils.getAllLoanFiles` → loan-files-utils |
| **After** | Local `getAllLoanFiles` → `loadDealsSync("customer_360")`; modal create uses `saveDeals` |
| **Rollback** | `DEAL_REGISTRY_CONSUMER_CUSTOMER_360=false` |
| **Validation** | tsc clean; verify includes `customer-utils` |

### 4.4 Documents Workspace

| | |
|--|--|
| **Before** | Document registry store patched LoanFile directly |
| **After** | `updateDeal(..., "documents")` |
| **Rollback** | `DEAL_REGISTRY_CONSUMER_DOCUMENTS=false` |
| **Validation** | Verify token on `document-registry/store.ts` |

### 4.5 Tasks Workspace

| | |
|--|--|
| **Before** | Loan-file task board patched storage |
| **After** | `updateDealTasks` / `loadDealsSync("tasks")` |
| **Note** | Enterprise Task Engine (`/tasks` ETE) remains its own registry — not LoanFile SSOT; Wave 5 scope is Deal-embedded tasks on journey surfaces |
| **Rollback** | `DEAL_REGISTRY_CONSUMER_TASKS=false` |

### 4.6 Activities Workspace

| | |
|--|--|
| **Before** | Timeline events only via LoanFile aggregate |
| **After** | DAL helper `updateDealTimeline`; loan-files timeline view uses module `activities` |
| **Rollback** | `DEAL_REGISTRY_CONSUMER_ACTIVITIES=false` |

---

## 5. Performance Comparison

| Scenario | Flags | Expected behaviour | Result |
|----------|-------|--------------------|--------|
| Soft Go-Live default | All consumer flags OFF | DAL = thin sync wrapper over existing `loadLoanFiles` / `saveLoanFiles` | **No material overhead** (same sync path) |
| Shadow Read ON (Wave 4) | SHADOW_READ ON, consumers OFF | Async compare; UI still legacy | Unchanged from Wave 4 |
| Consumer ON (pilot only) | Module flag ON + API ON | Extra HTTP search + map; fallback on error | Not enabled in delivery; rollback = flag OFF |

**Conclusion:** Wave 5 delivery state (flags OFF) preserves Soft Go-Live performance characteristics.

---

## 6. Rollback Verification

| Failure mode | Action | Result |
|--------------|--------|--------|
| Bad Opportunity Enterprise reads | Consumer Opportunity OFF | Immediate legacy via DAL |
| Bad Loan Workspace Enterprise reads | Consumer Loan Workspace OFF | Immediate legacy |
| Bad Documents / Tasks / Activities / C360 | Respective consumer OFF | Immediate legacy |
| Dual-write / API issues | Keep Wave 3/2 flags OFF (delivery default) | No Enterprise side effects |
| Full idle | All Deal + consumer flags OFF | Soft Go-Live identical |

No schema rollback required for Wave 5. Consumer enablement is reversible without data migration.

---

## 7. Feature Flag Verification

| Flag | Default | Wave 5 verify |
|------|---------|---------------|
| `DEAL_REGISTRY_API_ENABLED` | OFF | ✅ OFF |
| `DEAL_REGISTRY_DUAL_WRITE` | OFF | ✅ OFF |
| `DEAL_REGISTRY_SHADOW_READ` | OFF | ✅ OFF |
| `DEAL_REGISTRY_PORT_RUNTIME` | OFF | ✅ OFF |
| `DEAL_REGISTRY_CONSUMER_OPPORTUNITY` (+ public) | OFF | ✅ OFF |
| `DEAL_REGISTRY_CONSUMER_LOAN_WORKSPACE` (+ public) | OFF | ✅ OFF |
| `DEAL_REGISTRY_CONSUMER_CUSTOMER_360` (+ public) | OFF | ✅ OFF |
| `DEAL_REGISTRY_CONSUMER_DOCUMENTS` (+ public) | OFF | ✅ OFF |
| `DEAL_REGISTRY_CONSUMER_TASKS` (+ public) | OFF | ✅ OFF |
| `DEAL_REGISTRY_CONSUMER_ACTIVITIES` (+ public) | OFF | ✅ OFF |
| `DEAL_REGISTRY_BLOCK_LOCAL_WRITE` | OFF | Untouched (Wave 6) |

Documented in `.env.example`.

**Recommended pilot order (after ARB):** API → Dual-write → Shadow prove → per-module consumer ON one at a time → never enable Mission Control consumers in this wave.

---

## 8–12. Certifications

### 8. Engineering Certification — **PASS**

- DAL implemented; six workspaces wired; TypeScript `tsc --noEmit` clean  
- `scripts/co-arch-002-w5-verify.mjs` **PASSED**  
- Consumers do not import `deal-api-client`

### 9. Data Certification — **PASS**

- Identity remains LoanFile / `legacyLoanFileId` join for hybrid period  
- Writes still flow through storage + optional Wave 3 dual-write  
- No cutover; no local write block

### 10. Business Certification — **PASS**

- Functional parity with Soft Go-Live while flags OFF  
- No UX regression intended (same surfaces, same sync data)  
- Module-by-module rollback preserved

### 11. AI Certification — **PASS**

- CHANAKYA / Mission Control / Saarthi **not** migrated  
- No parallel AI transactional identity introduced

### 12. Production Readiness Certification — **PASS** (for Soft Go-Live idle state)

- Flags OFF by default  
- Rollback = flags OFF  
- Production behaviour unchanged until explicit per-module enablement  
- [x] **STOP honored** — Wave 6 proceeded only after ARB Approved Wave 5  

---

## Success criteria checklist

| Criterion | Status |
|-----------|--------|
| Functional parity (flags OFF) | ✅ |
| No UX regression (delivery) | ✅ |
| No performance regression (delivery) | ✅ |
| No data inconsistencies introduced by DAL idle path | ✅ |
| Rollback validated (flag matrix) | ✅ |
| Feature flag verified OFF | ✅ |

---

## Code deliverables (primary)

| Area | Paths |
|------|-------|
| DAL | `src/lib/enterprise-deal/deal-data-access.ts`, `map-deal-to-loan-file.ts`, `index.ts` |
| Flags | `src/constants/enterprise-deal-registry/flags.ts`, `.env.example` |
| Opportunity | `opportunity-workspace-context.tsx`, `opportunity-workspace.tsx`, `load-context.ts`, `opportunity-loan-continuity.ts` |
| Loan | `use-loan-files-workspace.ts`, `use-loan-board.ts`, `loan-workspace-modal.tsx`, lender sync/select/life |
| Customer 360 | `customer-utils.ts`, `use-customers-workspace.ts`, `customer-360-modal.tsx` |
| Documents | `src/lib/document-registry/store.ts` |
| Tasks / Activities | `updateDealTasks` / `updateDealTimeline` + view module tags |
| Verify | `scripts/co-arch-002-w5-verify.mjs` |

---

## ARB decision (recorded)

**Approved / Certified** — Wave 6 (Cutover & Stabilization) authorized.

See `CO-ARCH-002-WAVE-6-COMPLETION-REPORT.md`.
Production Deal flags remain OFF until final ARB Go-Live authorization.

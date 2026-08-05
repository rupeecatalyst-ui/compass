# CO-LENDER-HIERARCHY-REMEDIATION-001 — Completion Report

**Status:** Implementation Complete · Deployed · Awaiting Product Owner BAT  
**Priority:** P0  
**Date:** 2026-08-05

---

## Root cause resolved

Lender Workspace Hierarchy consumed **localStorage + hardcoded vacant ranks + demo seed**, not ECM lender employees. Occupied employees (e.g. Piramal) never appeared; card actions were stubs.

**Fix:** Hierarchy is now a **live projection** of Enterprise Contact Registry contacts with role `lender_employee`, linked by `institution` = Enterprise Lender ID, structured by `reports_to`.

---

## Registry / SSOT confirmation

| Layer | Owner |
|-------|--------|
| Institution | Enterprise Lender Registry (`enterprise_lenders.id`) |
| Employees | ECM `ecm_contacts` · role `lender_employee` |
| Reporting | ECM `reports_to` relationships |
| Hierarchy UI | Projection only — **no parallel store** |

**Retired from production paths:**

- `catalyst.elw.hierarchy-assignments.v1` (purge-only)
- localStorage hierarchy assign/read
- Hardcoded `ELW_HIERARCHY_RANKS` occupancy
- Demo hierarchy seed

**Live data:** No deletes, recreates, reseeds, or ID mutations.

---

## Behaviour

- Occupied cards: name, designation, department (branch), status, reporting manager + Open Workspace / Profile / Edit / Change RM / Performance / Pipeline / Communication / Add Report  
- Empty institution: Assign Existing Employee · Create Employee (ECM)  
- No static vacant rank placeholders  
- Contacts / Hierarchy / Performance / Pipeline tabs share the same employee compose  
- `subscribeEcmContactRegistry` refreshes without manual page reload  

---

## Files changed (primary)

- `src/lib/enterprise-lender-directory/compose-hierarchy.ts` (new)
- `src/lib/enterprise-lender-directory/hierarchy-actions.ts` (new)
- `src/types/enterprise-lender-hierarchy.ts` (new)
- `src/components/catalyst-one/enterprise-lender-workspace/eld-hierarchy-chart.tsx` (new)
- `src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx`
- `src/components/catalyst-one/enterprise-lender-directory/eld-employee-slide-over.tsx`
- `src/components/catalyst-one/enterprise-lender-workspace/enterprise-lender-workspace.tsx`
- `src/lib/enterprise-lender-workspace/hierarchy.ts` (retired localStorage)
- `src/constants/enterprise-lender-workspace/hierarchy.ts`
- `scripts/co-lender-hierarchy-remediation-001-verify.mjs`
- `package.json` (`verify:co-lender-hierarchy-remediation-001`)

---

## Deployment

| Field | Value |
|-------|--------|
| Status | ✅ Ready |
| Live URL | https://catalyst-one-two.vercel.app |
| Deployment URL | https://catalyst-79yfkjooh-rupee-catalyst.vercel.app |
| Build / Deployment ID | `dpl_CcCxZVZQgmse1ratME7kfNb9fTgN` |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/CcCxZVZQgmse1ratME7kfNb9fTgN |
| Deployment time | 2026-08-05 ~19:55 IST (Vercel build ~4m) |

OOM note: first attempt SIGKILL’d; retry with `webpackMemoryOptimizations` + heap 6144 on Vercel buildCommand succeeded.

---

## STOP

Await Product Owner BAT.

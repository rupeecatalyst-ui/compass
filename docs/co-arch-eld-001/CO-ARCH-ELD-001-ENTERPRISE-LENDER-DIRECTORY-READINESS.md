# CO-ARCH-ELD-001 — Enterprise Lender Directory Readiness Report

**Priority:** CRITICAL  
**Date:** 2026-08-04  
**Route:** `/lenders` (unchanged — backward compatible)  
**Nav label:** Enterprise Lender Directory  
**CO-ARCH-002:** Additive UI only — no data destruction · Enterprise Lender Registry remains SSOT

---

## Constitutional Health Check

| Check | Result |
|-------|--------|
| No parallel lender registry | **GREEN** |
| Route preserved `/lenders` | **GREEN** |
| Product params from registry programmes | **GREEN** |
| No hardcoded ROI/LTV/CIBIL | **GREEN** |
| Landing charts removed | **GREEN** |
| Live data untouched | **GREEN** |

**CHC: GREEN**

---

## Deliverables

| Item | Status |
|------|--------|
| Rename Lending Programs → Enterprise Lender Directory | ✅ Nav + page chrome |
| Full-width operational table | ✅ |
| Top filters: Category · Product · Region · Search | ✅ |
| Dynamic product parameter columns | ✅ from published programmes |
| Smart default sort (Pinned → Active → Recent → Performing → A–Z) | ✅ |
| Column selector | ✅ via EnterpriseDataGrid |
| Export CSV | ✅ |
| Right slide-over ~65% (250ms) | ✅ |
| Hierarchy / Contacts / Products / Docs / Chanakya tabs | ✅ |
| Analytics only after lender selected | ✅ Performance tab in panel |
| FOIR | Shows **Not Specified** until registry field exists (no invention) |

---

## SSOT

- Registry: `lenderRegistryClient` / Prisma `enterprise_lenders` + `enterprise_lender_programs`
- Compose: `src/lib/enterprise-lender-directory/compose-directory.ts`
- UI: `src/components/catalyst-one/enterprise-lender-directory/`
- Legacy Lending Programs dashboard remains in codebase but **unmounted** from `/lenders` (CO-ARCH-002 — not deleted)

---

## Validation

| Check | Status |
|-------|--------|
| TypeScript | ✅ |
| Build | ✅ |
| Verify | ✅ `npm run verify:co-arch-eld-001` |
| Production | (see certification) |

---

## BAT

1. Open `/lenders` — no donut charts on landing.  
2. Filter by Bank / Home Loan / region; search by short name.  
3. Click row — panel slides ~65%; table visible behind.  
4. Close panel — full directory restored, no reload.  
5. Export CSV · toggle columns · Smart sort.  
6. Hierarchy / Contacts / Product Programmes tabs load from registry.

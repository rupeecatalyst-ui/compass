# CO-BUG-ELD-CONTACT — Lender Contact Persistence + Products Handled

**Status:** Implementation Complete · Ready for BAT  
**Priority:** CRITICAL (P1 persistence + product responsibility)  
**CO-ARCH-002:** READ · EXTEND · NEVER DESTROY — no live data reset / reseed

---

## Root cause (Defect 1)

Lender Contacts (Bankers) are **ECM Contacts** with role `lender_employee`.

Contact Workspace was calling **memory-only** `registerEcmContact` / `updateEcmContact`.

In Prisma mode, session hydrate from PostgreSQL **overwrites** the in-memory registry. Role-profile fields (`institution`, city, branch, designation, RM cache) appeared saved, then vanished on reopen.

Canonical path already existed for Lender Sales Contact (CO-LR-013):  
`persistRegisterEcmContact` / `persistUpdateEcmContact` → REST → ECM API → Prisma.

Secondary UX: Institution display needed `institutionLabel` / `lenderName` when the value is an Enterprise Lender Registry UUID (not ECM lender catalog).

---

## Fix implemented

1. Contact Workspace saves via `persistRegisterEcmContact` / `persistUpdateEcmContact`.
2. `setBankerReportingManager` persists RM profile cache via `persistUpdateEcmContact`.
3. Institution label hydration: `institutionLabel || lenderName || institutionName`.
4. **Products Handled** multi-select (`product_multi`) from Enterprise Product Master; stored as CSV of product **codes** on `roleProfiles.lender_employee.productsHandled` (additive; empty = no mapping).
5. ELD: banker product codes enrich directory product filter; Contacts slide-over lists ECM bankers with products.

---

## Backward compatibility

- No migration that rewrites contacts.
- No reset / recreate of lender records.
- Missing `productsHandled` → empty multi-select; contact remains fully usable.
- Additive JSON key only on role profile map.

---

## Verification

```bash
node scripts/co-bug-eld-contact-verify.mjs
```

---

## Manual BAT checklist

1. Open Contacts → Banker role → select Institution + City + Branch + Designation → Save.
2. Close and reopen the same contact — Institution (and linked fields) remain.
3. Set Products Handled (multi) → Save → reopen — selections remain.
4. Open Enterprise Lender Directory → filter by a product mapped on a banker — lender remains findable; Contacts tab shows banker + products.

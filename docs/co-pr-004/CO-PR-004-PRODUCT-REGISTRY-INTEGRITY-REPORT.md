# CO-PR-004 — Enterprise Product Registry Data Integrity

**Status:** Implementation complete (presentation SSOT) · Physical row merge **blocked** pending PO  
**Date:** 2026-07-30  
**Production Data Protection:** No delete / disable / truncate of live Product rows in this sprint

---

## 1. Root cause

Historical multi-catalogue seeding inserted multiple `EnterpriseProduct` rows for the same retail products:

| Catalogue | Example codes | Example labels |
|-----------|---------------|----------------|
| Canonical Product Master | `HOME_LOAN`, `LAP`, `BUSINESS_LOAN_UNSECURED`, `PERSONAL_LOAN`, `WORKING_CAPITAL_SECURED` | Home Loan · Loan Against Property (LAP) · Business Loan (Unsecured) · … |
| Product Library defs | `HL_STD`, `LAP_STD`, `BL_STD`, `PL_STD`, `WC_STD` | Home Loan · Loan Against Property · Business Loan · … |
| ECM legacy picker (stopped) | `home-loan`, `business-loan`, … | Same labels |

Postgres uniqueness is `(organizationId, code)` only — different codes = valid duplicate business products.

CO-BUG-002 already:

- Stopped new ECM / same-label seeds
- Exact-label dedupe on some dropdowns

**Still open before CO-PR-004:**

- Near-label pairs still both appeared (`Business Loan` vs `Business Loan (Unsecured)`, `LAP` vs `Loan Against Property`)
- Product–Lender Matrix listed **every** enabled DB row as a column
- Dual-read used exact-label only

---

## 2. Duplicate Product records identified

Canonical family groups (legacy → survivor for **presentation**):

| Family (survivor code) | Legacy / alias codes typically present |
|------------------------|----------------------------------------|
| `HOME_LOAN` | `HL_STD`, `HOME-LOAN`, `home-loan` |
| `PERSONAL_LOAN` | `PL_STD`, `PERSONAL-LOAN` |
| `LAP` | `LAP_STD`, `loan_against_property` |
| `BUSINESS_LOAN_UNSECURED` | `BL_STD`, `BUSINESS_LOAN`, `BUSINESS-LOAN` |
| `WORKING_CAPITAL_SECURED` | `WC_STD`, `WORKING_CAPITAL` |

`WORKING_CAPITAL_UNSECURED` remains a **distinct** canonical product (not collapsed into Secured).

**Live inventory (read-only):**

```bash
npm run inventory:co-pr-004
```

Emits JSON grouped by family. Does **not** mutate data.

---

## 3. Migration performed

| Action | Status |
|--------|--------|
| Presentation dedupe (selectors, matrix, dual-read) | ✅ Done |
| Seed blocks library codes that resolve to canonical | ✅ Done |
| Keep real Registry `id` / `code` on survivor (label only unified) | ✅ Done |
| Physical merge / soft-disable of legacy Product rows | ❌ **Not performed** (PDP) |
| Opportunity / Deal FK remapping | ❌ Not required for presentation fix |

**Live inventory (Rupee Catalyst org):** 13 active Product rows → **5 duplicate families** (Home, LAP, Business, Personal, Working Capital). Rows preserved.

**Rationale:** Existing Opportunities / Deals / programs may reference `HL_STD`, `HOME-LOAN`, `BL_STD`, etc. Disabling those rows without remapping would break workflows. Physical cleanup requires a dedicated PO-approved remediation with FK remapping.

---

## 4. Files modified

| Path | Change |
|------|--------|
| `src/constants/enterprise-product-master/canonical-catalog.ts` | `resolveProductSelectionFamilyKey`, `productCodesShareSelectionFamily` |
| `src/lib/enterprise-product-master/dedupe-selection.ts` | Shared canonical-family dedupe |
| `src/lib/enterprise-product-master/options.ts` | Uses shared dedupe |
| `src/app/api/admin/product-lender-matrix/route.ts` | Matrix columns deduped; PUT normalizes to canonical codes |
| `src/components/catalyst-one/admin/product-lender-matrix-workspace.tsx` | Alias-aware checkboxes |
| `src/lib/enterprise-tier2-ports/ports/dual-read-ports.ts` | Family dedupe |
| `server/services/tier2-registry/seed-catalog.ts` | Skip library defs that resolve to canonical |
| `scripts/co-pr-004-verify.mjs` | Static verify |
| `scripts/co-pr-004-inventory.mjs` | Read-only inventory |
| `.cursor/rules/enterprise-product-lender-master.mdc` | CO-PR-004 note |

---

## 5. BAT results

```bash
npm run verify:co-pr-004
npm run verify:co-bug-002
npm run inventory:co-pr-004   # optional live DB report
```

Manual BAT:

- [ ] Lead Information / Opportunity / Deal product dropdowns — each product once
- [ ] Product–Lender Matrix — no duplicate columns for Home / LAP / Business / Personal / WC
- [ ] Existing Deals / Opportunities still open and keep their product codes
- [ ] Admin Product Master may still list historical rows (intentional until PO merge)

---

## 6. Sole Product SSOT confirmation

| Consumer | Source |
|----------|--------|
| Operational product selectors | Product Registry API → family dedupe (canonical fallback only if API empty) |
| Product–Lender Matrix | Product Registry query → family dedupe |
| Tier-2 dual-read products | DB cache only + family dedupe (no constants merge when runtime active) |
| Seed (new rows) | Canonical master primary; library only for non-canonical extras |
| Admin Product Master list | Full Registry (shows historical codes for remediation visibility) |

**Confirmation:** For all **selection / matrix / matching** surfaces, the Enterprise Product Registry is the sole runtime Product SSOT, with **one visible product per canonical family**. Historical duplicate rows are preserved in the database until Product Owner approves physical merge.

---

## Final status

🟡 Ready for Business Certification (presentation integrity)  
Physical master-data consolidation: **blocked** until PO approval + FK remapping plan

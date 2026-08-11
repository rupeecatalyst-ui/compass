# CO-MASTER-004 — Enterprise Lender Directory Product Filter Fix

**Status:** Implementation Complete · Local verification only · **Not deployed**  
**Date:** 2026-08-09  
**Scope:** Product filter identity / query correction only — no master-data mutations

---

## A. Root cause

The Directory Product dropdown used **hardcoded** `ELW_DIRECTORY_PRODUCTS` slugs (`home-loan`, …).  
`filterEnterpriseLenderDirectoryRows` then mapped `home-loan` → legacy `home_loan` and compared with **case-sensitive** `===` / `includes` against Lender Registry `productsSupported`.

Live Matrix / Registry stores canonical codes such as **`HOME_LOAN`**.

| Selected UI value | Legacy filter lookup | Live `productsSupported` | Result |
|-------------------|----------------------|--------------------------|--------|
| `home-loan` | `home_loan` | `HOME_LOAN` | **0 lenders** |

Product–Lender Matrix already matched via `productCodesShareSelectionFamily` — Directory did not.

Live diagnostic (read-only):

- Active lenders: **280**
- Home Loan Product Master row: id `cmrusok03000lwe60yjtcgvak`, code **`HL_STD`**, label Home Loan  
- Home Loan family mapped lenders: **197**  
- Legacy filter with `home-loan`: **0**

---

## B. Product filter value before fix

| Field | Value |
|-------|--------|
| UI display | Home Loan |
| UI selected value | `home-loan` (hardcoded directory id) |
| Product ID | not used |
| Product code used in filter | `home_loan` (legacy mapper) |
| API parameter | n/a (client-side filter on composed rows) |
| DB lookup field | `enterprise_lenders.productsSupported` via composed row |

---

## C. Correct canonical product identity

| Field | Value |
|-------|--------|
| UI display | Product Master `label` (e.g. Home Loan) |
| UI selected value | Product Master **`code`** (e.g. `HL_STD` / canonical family) |
| Product ID | available on option (`id`) — filter key is **code** (same as Matrix) |
| Match helper | `productCodesShareSelectionFamily` (Product Master SSOT) |

---

## D. API/query behaviour before fix

```text
ELW_DIRECTORY_PRODUCTS SelectItem value=home-loan
→ filters.product = "home-loan"
→ mapDirectoryProductIdToRegistryCode → "home_loan"
→ productsSupported.some(p === "home_loan" | includes("home_loan"))
→ 0 rows when storage is HOME_LOAN
```

No Matrix family helper. No Product Master options.

---

## E. API/query behaviour after fix

```text
useProductMasterOptions() → SelectItem value={p.code}
→ filters.product = Product Master code (e.g. HL_STD / HOME_LOAN)
→ productsSupported.some(productCodesShareSelectionFamily(p, filters.product))
→ same lender set as Product–Lender Matrix family
```

Still client-side on Enterprise Lender Registry projection (unchanged data load).  
No second product identity. No hardcoded `if (product === "Home Loan")`.

---

## F–K. Product counts (live, read-only verify)

| Product | Product ID | Product Code | Matrix mapped | Directory displayed | Result |
|---------|------------|--------------|---------------|---------------------|--------|
| Home Loan | `cmrusok03000lwe60yjtcgvak` | `HL_STD` | **197** | **197** | PASS |
| Loan Against Property | `cmrusok5d000nwe60ustevx6i` | `LAP_STD` | **161** | **161** | PASS |
| Personal Loan | `cmrusok8q000pwe604if33dg4` | `PL_STD` | **197** | **197** | PASS |
| Unsecured Business Loan | `cmrusokc4000rwe60vduvzymu` | `BL_STD` | **236** | **236** | PASS |
| Commercial Purchase | `cms7h885v000zld04kqn6imfc` | `COMM_PURCHASE` | **3** | **3** | PASS |

(`HOME_LOAN` / `HL_STD` / `home-loan` all resolve to the same 197 via family match.)

---

## L. Search + product filter

Home Loan + search code containing `PNB` → **2** lenders (PASS).  
Home Loan + category `bank` → **76** lenders (combination still applies product ∩ category).

---

## M. Clear filter

Clear still resets to `EMPTY_FILTERS` (`product: "all"`) and `setPage(1)` — full directory returns. No stale product id retained.

---

## N. Pagination

`patchFilters` already resets `page` to 1 on product change. Pagination continues to slice `filteredSorted` (filtered set), not the unfiltered book.

---

## Files changed

| File | Change |
|------|--------|
| `src/lib/enterprise-lender-directory/compose-directory.ts` | Family-match product filter + program ROI pick |
| `src/components/catalyst-one/enterprise-lender-directory/enterprise-lender-directory-workspace.tsx` | Product dropdown ← Product Master codes |
| `scripts/co-master-004-diagnose.mjs` | Read-only live diagnostic |
| `scripts/co-master-004-verify.mjs` | Regression: Master → family → Matrix counts |
| `package.json` | `verify:co-master-004` |
| `docs/co-master-004/CO-MASTER-004-PRODUCT-FILTER-FIX-REPORT.md` | This report |

**Not changed:** Lender identities · Product Master rows · mappings · programs · priorities · schema · APIs · seeds

---

## Verification

| Gate | Result |
|------|--------|
| `npm run verify:co-master-004` | ✅ PASS |
| `co-admin-005-verify` (Matrix) | ✅ PASS |
| `verify:co-master-003` | ✅ PASS |
| TypeScript | ✅ PASS |
| Production build (`npm run build`) | ✅ PASS |
| Vercel deploy | **Skipped per PO** |

---

## STOP

Await Product Owner approval before deployment.

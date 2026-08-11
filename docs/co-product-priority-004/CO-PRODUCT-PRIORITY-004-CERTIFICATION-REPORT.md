# CO-PRODUCT-PRIORITY-004 — Certification Report

**Sprint:** CO-PRODUCT-PRIORITY-004  
**Scope:** Lender priority configuration for LAP + Commercial Purchase  
**Deploy:** NOT performed (PO instruction)  
**Programs / Matrix / Lender Registry:** Unchanged  

**Principle:** PRIORITY = ORDER · PRIORITY ≠ ELIGIBILITY · PRIORITY ≠ MAPPING · PRIORITY ≠ WHITELIST

---

## Identity validation (PO candidates)

| # | Institution | Lender ID | Code | Type | Active | LAP | Commercial Purchase |
|---|---|---|---|---|---|---|---|
| 1 | Standard Chartered Bank | `cms8hq3nz0003wed804dmj3ou` | STANDARD_CHARTERED | bank | Yes | Yes | No |
| 2 | Saraswat Cooperative Bank | `cms4cnp84003zwen42y73iquu` | SARASWAT | cooperative_bank | Yes | Yes | No |
| 3 | HDFC Bank | `cmrusopl1003lwe601zac0dvs` | HDFC | private_sector_bank | Yes | Yes | No |
| 4 | IndusInd Bank | `cms4cmrsd000pwen4n938ri4v` | INDUSIND | private_sector_bank | Yes | Yes | No |
| 5 | Jio Financial Services | `cmsg6x2c10001wegs7bkdzt3k` | LND000001 | nbfc | Yes | **No** | **No** |
| 6 | Kotak Mahindra Bank | `cmrusoprt003pwe60kshcazu7` | KOTAK | private_sector_bank | Yes | Yes | No |
| 7 | Axis Bank | `cmrusopch003hwe60phw80i5i` | AXIS | private_sector_bank | Yes | Yes | No |
| 8 | Yes Bank | `cms4cmtp4000vwen44q8r6ajy` | YES | private_sector_bank | Yes | Yes | No |
| 9 | Federal Bank | `cms4cmsvt000twen4qf3d6wok` | FEDERAL | private_sector_bank | Yes | Yes | No |
| 10 | Piramal Finance | `cms4cnkz5003lwen4jfhr97rd` | PIRAMAL_FINANCE | nbfc | Yes | Yes | No |
| 11 | Deutsche Bank | `cms8hq5320009wed8mkd9nu57` | DEUTSCHE_BANK | bank | Yes | Yes | No |
| 12 | Bajaj Finance | `cms4cnfmd0033wen4dd25gl97` | BAJAJ_FINANCE | nbfc | Yes | Yes | No |
| 13 | Aditya Birla Finance | `cms4cngrl0037wen43lkirriv` | ADITYA_BIRLA_FINANCE | nbfc | Yes | Yes | No |

**Duplicate attention:** Each PO name resolved to a single live lender record (no multi-match among these 13). Bajaj Finance = `BAJAJ_FINANCE` (not housing duplicates). No merge performed.

**Jio Financial Services:** Live lender exists (`LND000001`) with `productsSupported: []`.  
Status: **NOT CURRENTLY PRODUCT-MAPPED — PRIORITY NOT PERSISTED**  
No lender created · No LAP mapping created · No Commercial Purchase mapping created.

---

## SECTION A — LAP

| Field | Value |
|---|---|
| Canonical Product Master | Loan Against Property (`LAP`) |
| Product ID | `cmrusol1t0015we60srmgtbnc` |
| Alias note | `LAP_STD` (`cmrusok5d000nwe60ustevx6i`) also live — not duplicated; family key = `LAP` |
| Total LAP-eligible lenders | **160** (unchanged) |
| Priority lenders successfully assigned | **12** |
| Priority candidates not mapped | **1** — Jio Financial Services |
| Remaining eligible lenders | **148** (OTHER LAP LENDERS) |
| Persistence | `enterprise_product_lender_priorities` · `productFamily=LAP` · OK |
| Verification | `npm run verify:co-product-priority-004` · PASSED |

### LAP priority table (dense 1…12)

| Priority | Institution | Lender ID | Code |
|---|---|---|---|
| 1 | Standard Chartered Bank | `cms8hq3nz0003wed804dmj3ou` | STANDARD_CHARTERED |
| 2 | Saraswat Cooperative Bank | `cms4cnp84003zwen42y73iquu` | SARASWAT |
| 3 | HDFC Bank | `cmrusopl1003lwe601zac0dvs` | HDFC |
| 4 | IndusInd Bank | `cms4cmrsd000pwen4n938ri4v` | INDUSIND |
| 5 | Kotak Mahindra Bank | `cmrusoprt003pwe60kshcazu7` | KOTAK |
| 6 | Axis Bank | `cmrusopch003hwe60phw80i5i` | AXIS |
| 7 | Yes Bank | `cms4cmtp4000vwen44q8r6ajy` | YES |
| 8 | Federal Bank | `cms4cmsvt000twen4qf3d6wok` | FEDERAL |
| 9 | Piramal Finance | `cms4cnkz5003lwen4jfhr97rd` | PIRAMAL_FINANCE |
| 10 | Deutsche Bank | `cms8hq5320009wed8mkd9nu57` | DEUTSCHE_BANK |
| 11 | Bajaj Finance | `cms4cnfmd0033wen4dd25gl97` | BAJAJ_FINANCE |
| 12 | Aditya Birla Finance | `cms4cngrl0037wen43lkirriv` | ADITYA_BIRLA_FINANCE |

---

## SECTION B — COMMERCIAL PURCHASE

| Field | Value |
|---|---|
| Canonical Product Master | Commercial Purchase (`COMM_PURCHASE`) |
| Product ID | `cms7h885v000zld04kqn6imfc` |
| Total Commercial Purchase–eligible lenders | **1** (unchanged) |
| Only eligible lender | **UCO Bank** · `UCO` · `cms4cmou6000jwen4z4e6t25z` |
| Priority lenders successfully assigned | **0** |
| Priority candidates not mapped | **13 / 13** (all PO candidates) |
| Remaining eligible lenders | **1** (OTHER COMMERCIAL PURCHASE LENDERS — UCO Bank) |
| Persistence | `productFamily=COMM_PURCHASE` · empty set · `OK_EMPTY_NO_MAPPED_CANDIDATES` |
| Verification | PASSED |

Commercial Purchase Priority Candidates → Not currently mapped → **Priority pending until Product–Lender mapping exists.**  
No mappings created. No lenders created. No forced priority.

---

## Integrity

| Check | Result |
|---|---|
| Lender Registry unchanged | ✅ fingerprint identical |
| Product–Lender Matrix unchanged | ✅ |
| LAP eligible count | ✅ 160 before / after |
| Commercial Purchase eligible count | ✅ 1 before / after |
| No duplicate priority rows | ✅ |
| No new / deleted lenders | ✅ |
| No eligibility artificially created | ✅ |
| No Product Programs created/modified | ✅ |
| Deploy | ❌ Not performed |

---

## UI

- Desk: `/admin/product-lender-priority`
- Tabs: LAP · Commercial Purchase
- Sections: PRIORITY … LENDERS · OTHER … LENDERS
- Search / reorder / save / reload wired via `GET|PUT /api/admin/product-lender-priority?family=`

---

## Artifacts

- `docs/co-product-priority-004/RESOLVE-LAP-COMM-PURCHASE.json`
- `docs/co-product-priority-004/CO-PRODUCT-PRIORITY-004-APPLY-RESULT.json`
- `scripts/co-product-priority-004-resolve.mjs`
- `scripts/co-product-priority-004-apply.mjs`
- `scripts/co-product-priority-004-verify.mjs`

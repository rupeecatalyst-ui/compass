# CO-UBL-PRIORITY-001 — Certification Report

**Sprint:** CO-UBL-PRIORITY-001  
**Scope:** Unsecured Business Loan lender priority configuration only  
**Deploy:** NOT performed (PO instruction)  
**Programs / Matrix / Lender Registry:** Unchanged  

**Principle:** UBL PRIORITY = RANKING ONLY · PRIORITY ≠ ELIGIBILITY · PRIORITY ≠ MAPPING · PRIORITY ≠ WHITELIST

---

## A. Final priority table

| Priority | Institution | Lender ID | Lender Code | UBL Mapping | Status |
|---|---|---|---|---|---|
| 1 | Axis Bank | `cmrusopch003hwe60phw80i5i` | AXIS | Yes | active |
| 2 | Bajaj Finance | `cms4cnfmd0033wen4dd25gl97` | BAJAJ_FINANCE | Yes | active |
| 3 | Clix Capital | `cms8hrzug00ajwed8qwz7d961` | CLIX_CAPITAL | Yes | active |
| 4 | Credit Saison India | `cms8hs06p00alwed8uj1in1tl` | CREDIT_SAISON | Yes | active |
| 5 | DCB Bank | `cms4cmwz20017wen412c85bwt` | DCB | Yes | active |
| 6 | Deutsche Bank | `cms8hq5320009wed8mkd9nu57` | DEUTSCHE_BANK | Yes | active |
| 7 | Edelweiss Finance | `cms4cnm68003pwen4f9zoqxtd` | EDELWEISS | Yes | active |
| 8 | SMFG India Credit | `cms8hqswj003zwed82nroc47c` | SMFG_INDIA | Yes | active |
| 9 | HDFC Bank | `cmrusopl1003lwe601zac0dvs` | HDFC | Yes | active |
| 10 | HDB Financial Services | `cms8hru7f009pwed8w8c1qs28` | HDB_FINANCIAL | Yes | active |
| 11 | ICICI Bank | `cmrusopoe003nwe60331ytwfx` | ICICI | Yes | active |
| 12 | Tata Capital | `cms4cng5z0035wen4tirf9gtk` | TATA_CAPITAL | Yes | active |
| 13 | Standard Chartered Bank | `cms8hq3nz0003wed804dmj3ou` | STANDARD_CHARTERED | Yes | active |
| 14 | Yes Bank | `cms4cmtp4000vwen44q8r6ajy` | YES | Yes | active |
| 15 | L&T Finance | `cms4cnhcu0039wen4z8cd7mva` | LT_FINANCE | Yes | active |
| 16 | IDFC FIRST Bank | `cms4cmsbt000rwen4q9tdyqfh` | IDFC_FIRST | Yes | active |
| 17 | FlexiLoans | `cms8hqhp40025wed8exph7i4r` | FLEXILOANS | Yes | active |

**Product Master:** Business Loan (Unsecured) (`BUSINESS_LOAN_UNSECURED`) · Product ID `cms7h8o3j0017ld04r3ga1q5x`  
**Storage:** `enterprise_product_lender_priorities` · `productFamily=BUSINESS_LOAN_UNSECURED`

---

## B / C. Eligible population

| Metric | Before | After |
|---|---|---|
| Total UBL-eligible lenders | **236** | **236** |
| Matrix fingerprint | `fcd7e625…3829` | identical |
| Lender Registry count | 283 | 283 |

Before === After ✅

---

## D. All 17 priority lenders UBL mapped

✅ Confirmed.

---

## E. Selected lenders that could not be UBL-mapped

None. All 17 PO selections resolved to existing UBL-mapped live records.

---

## F. Other UBL lenders remain available

✅ **219** OTHER UNSECURED BUSINESS LOAN LENDERS remain active, searchable, and selectable.

---

## G. Persistence verification

✅ Dense ranks 1–17 · unique · order exact · desk `GET /api/admin/product-lender-priority?family=BUSINESS_LOAN_UNSECURED`

---

## H. Verification script

```text
npm run verify:co-ubl-priority-001
→ PASSED (ok: true, priorityCount: 17, ublEligible: 236, other: 219)
```

---

## I. Exceptions / identity resolution

| Requested name | Resolved live record | Note |
|---|---|---|
| Tata Capital Finance | **Tata Capital** (`TATA_CAPITAL` / `cms4cng5z0035wen4tirf9gtk`) | Live registry label is Tata Capital. No new lender created. `TATA_CAPITAL_HFL` (Tata Capital Housing Finance) is not UBL-mapped and was not prioritized. |

Normalized names (Deutsche Bank, SMFG India Credit, HDB Financial Services, IDFC FIRST Bank, FlexiLoans) each matched a single live UBL-mapped record.

---

## UI / BAT

- Desk: `/admin/ubl-lender-priority`
- Sections: PRIORITY UNSECURED BUSINESS LOAN LENDERS · OTHER UNSECURED BUSINESS LOAN LENDERS

---

## Explicit non-goals

- No UBL Product Programs created/modified  
- No Product–Lender mappings changed  
- No Vercel deploy  

**STOP — awaiting Product Owner approval.**

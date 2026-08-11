# CO-PERSONAL-LOAN-PRIORITY-001 — Certification Report

**Sprint:** CO-PERSONAL-LOAN-PRIORITY-001  
**Scope:** Personal Loan lender priority configuration only  
**Deploy:** NOT performed (PO instruction)  
**Programs / Matrix / Lender Registry:** Unchanged  

**Principle:** PERSONAL LOAN PRIORITY = RANKING ONLY · PRIORITY ≠ ELIGIBILITY · PRIORITY ≠ MAPPING · PRIORITY ≠ WHITELIST

---

## A. Final priority table

| Priority | Institution | Lender ID | Lender Code | Mapping | Status |
|---|---|---|---|---|---|
| 1 | ICICI Bank | `cmrusopoe003nwe60331ytwfx` | ICICI | Yes | active |
| 2 | HDFC Bank | `cmrusopl1003lwe601zac0dvs` | HDFC | Yes | active |
| 3 | Axis Bank | `cmrusopch003hwe60phw80i5i` | AXIS | Yes | active |
| 4 | IDFC FIRST Bank | `cms4cmsbt000rwen4q9tdyqfh` | IDFC_FIRST | Yes | active |
| 5 | Kotak Mahindra Bank | `cmrusoprt003pwe60kshcazu7` | KOTAK | Yes | active |
| 6 | RBL Bank | `cms4cmu8v000xwen4q8migqib` | RBL | Yes | active |
| 7 | DCB Bank | `cms4cmwz20017wen412c85bwt` | DCB | Yes | active |
| 8 | Aditya Birla Finance | `cms4cngrl0037wen43lkirriv` | ADITYA_BIRLA_FINANCE | Yes | active |
| 9 | Federal Bank | `cms4cmsvt000twen4qf3d6wok` | FEDERAL | Yes | active |
| 10 | Bajaj Finance | `cms4cnfmd0033wen4dd25gl97` | BAJAJ_FINANCE | Yes | active |
| 11 | Yes Bank | `cms4cmtp4000vwen44q8r6ajy` | YES | Yes | active |

**Product Master:** Personal Loan (`PERSONAL_LOAN`) · Product ID `cms7h8uzb001fld04qr6rkuuh`  
**Storage:** `enterprise_product_lender_priorities` · `productFamily=PERSONAL_LOAN`

---

## B / C. Eligible population

| Metric | Before | After |
|---|---|---|
| Total Personal Loan–eligible lenders | **197** | **197** |
| Matrix fingerprint | `fcd7e625…3829` | identical |
| Lender Registry count | 283 | 283 |

Before === After ✅

---

## D. All 11 priority lenders Personal Loan mapped

✅ Confirmed — each of the 11 codes is live Personal Loan–mapped before and after persistence.

---

## E. Other Personal Loan lenders remain available

✅ **186** OTHER PERSONAL LOAN LENDERS remain active, searchable, and selectable (not deleted, hidden, deactivated, or unmapped).

---

## F. Persistence verification

✅ Dense ranks 1–11 · no duplicate priority rows · order matches PO list exactly · reload via desk API `GET /api/admin/product-lender-priority?family=PERSONAL_LOAN`

---

## G. Verification script

```text
npm run verify:co-personal-loan-priority-001
→ PASSED (ok: true, priorityCount: 11, personalLoanEligible: 197, other: 186)
```

---

## H. Exceptions

None. All 11 PO candidates resolved to single live lender records and were Personal Loan–mapped. No lenders created, merged, or remapped.

---

## UI / BAT path

- Desk: `/admin/personal-loan-lender-priority` (opens on Personal Loan tab)
- Also available under Product Lender Priority tabs
- Sections: PRIORITY PERSONAL LOAN LENDERS · OTHER PERSONAL LOAN LENDERS

**BAT checklist:** Open desk → confirm 1–11 order → search a non-priority PL lender (e.g. Abhyudaya) → still available → Reload → order unchanged.

---

## Explicit non-goals (this wave)

- No Personal Loan Product Programs created/modified  
- No commercials / FOIR / DBR / ROI / LTV / tenure / policy / documents  
- No Vercel deploy  

**STOP — awaiting Product Owner approval.**

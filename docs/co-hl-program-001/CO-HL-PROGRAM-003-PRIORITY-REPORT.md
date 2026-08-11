# CO-HL-PROGRAM-003 — Home Loan Lender Priority Configuration Report

**Status:** Priority configured · awaiting Product Owner review  
**Deploy:** ❌ Not deployed  
**Home Loan Product Program:** ❌ Not created (intentional)

## Principle

PRIORITY ≠ FILTER · PRIORITY ≠ ELIGIBILITY · PRIORITY ≠ MAPPING · PRIORITY = ORDER OF PRESENTATION / SELECTION

## A. Final Priority Table

| Priority | Institution | Lender ID | Lender Code | Status |
|---:|---|---|---|---|
| 1 | Central Bank of India | cms4cmnqu000fwen42ygnftpi | CBI | active |
| 2 | HSBC Bank | cms8hq4540005wed8g8qwfida | HSBC | active |
| 3 | HDFC Bank | cmrusopl1003lwe601zac0dvs | HDFC | active |
| 4 | Shinhan Bank | cms8hq6hx000fwed8xiqblfnz | SHINHAN_BANK | active |
| 5 | State Bank of India | cmrusopva003rwe60cjyga2va | SBI | active |
| 6 | Bank of India | cms4cmn6x000dwen4ppiw05e0 | BOI | active |
| 7 | Axis Bank | cmrusopch003hwe60phw80i5i | AXIS | active |
| 8 | ICICI Bank | cmrusopoe003nwe60331ytwfx | ICICI | active |
| 9 | Bajaj Housing Finance | cms4cn7yv002bwen44z7wjg6l | BAJAJ_HOUSING | active |
| 10 | Bank of Baroda | cms4cmkgh0003wen4racfsmj4 | BOB | active |
| 11 | Federal Bank | cms4cmsvt000twen4qf3d6wok | FEDERAL | active |
| 12 | IIFL Home Finance | cms4cnb9c002nwen43l915ak6 | IIFL_HOME | active |
| 13 | Kotak Mahindra Bank | cmrusoprt003pwe60kshcazu7 | KOTAK | active |
| 14 | LIC Housing Finance | cms4cn6vi0027wen4a2xv1vsq | LIC_HFL | active |
| 15 | Piramal Housing Finance | cms4cndg1002vwen4eqlooub2 | PIRAMAL_HOUSING | active |
| 16 | PNB Housing Finance | cms4cn7f30029wen4i24wovpa | PNB_HOUSING | active |
| 17 | Saraswat Cooperative Bank | cms4cnp84003zwen42y73iquu | SARASWAT | active |
| 18 | South Indian Bank | cms4cmusj000zwen4x47m61qh | SIB | active |
| 19 | Standard Chartered Bank | cms8hq3nz0003wed804dmj3ou | STANDARD_CHARTERED | active |
| 20 | Tata Capital Housing Finance | cms4cnbsz002pwen4ahfno9va | TATA_CAPITAL_HFL | active |
| 21 | Yes Bank | cms4cmtp4000vwen44q8r6ajy | YES | active |

## B. Duplicate Resolution

### Central Bank of India

| Field | Selected (`CBI`) | Other record (`BF_CENTRAL`) |
|---|---|---|
| Lender ID | cms4cmnqu000fwen42ygnftpi | cms0zh7lo0005we64kzu4jay1 |
| Institution Type | public_sector_bank | bank |
| Active | Yes | Yes |
| Home Loan Mapped | Yes | Yes |
| Products | HOME_LOAN (+ family) | HL_STD, LAP_STD |

**Selected for priority:** `CBI`  
**Why:** Canonical public-sector bank record with `HOME_LOAN` codes aligned to the live matrix majority.  
**Not merged.** `BF_CENTRAL` remains fully available under **Other Home Loan Lenders**.

### Bajaj Housing Finance

| Field | Selected (`BAJAJ_HOUSING`) | Other record (`BAJAJ`) |
|---|---|---|
| Lender ID | cms4cn7yv002bwen44z7wjg6l | cmrusophn003jwe60hymttfjn |
| Institution Type | housing_finance_company | hfc |
| Active | Yes | Yes |
| Home Loan Mapped | Yes | Yes |
| Products | HOME_LOAN (+ family) | HOME-LOAN, LAP |

**Selected for priority:** `BAJAJ_HOUSING`  
**Why:** Canonical HFC record with `HOME_LOAN` codes.  
**Not merged.** `BAJAJ` remains fully available under **Other Home Loan Lenders**.

### State Bank of India / SBI

| Field | Selected (`SBI`) | Other record (`LND-P2A-SBI`) |
|---|---|---|
| Institution Name | State Bank of India | SBI |
| Lender ID | cmrusopva003rwe60cjyga2va | cfad8cfb2ac7ed62bc57def10 |
| Active | Yes | Yes |
| Home Loan Mapped | **Yes** | **No** (`productsSupported = null`) |

**Selected for priority:** `SBI` (State Bank of India) — one priority entry only.  
**Why:** Only HL-mapped record for this institution. `LND-P2A-SBI` is not Home Loan eligible and cannot receive HL priority.

## C / D. Home Loan-eligible population

| Checkpoint | Count |
|---|---:|
| Before priority save | **195** |
| After priority save | **195** |

Unchanged.

## E. Priority persistence

| Check | Result |
|---|---|
| 21 priority rows persisted | ✅ |
| Exact codes match PO order | ✅ |
| No duplicate priority lender IDs | ✅ |
| Reload via `enterprise_product_lender_priorities` | ✅ |

## F. Product–Lender Matrix integrity

| Check | Result |
|---|---|
| Matrix fingerprint before = after | ✅ `fcd7e625…3829` |
| No lender created | ✅ (283 before/after) |
| No lender deleted | ✅ |
| No lender deactivated | ✅ (280 enabled before/after) |
| No Home Loan mapping removed | ✅ |

## G. Verification

```text
npm run verify:co-hl-program-003
→ CO-HL-PROGRAM-003 verify PASSED
```

## H. Issues

None blocking. Notes:

1. Duplicate-name records were **not** merged; non-selected duplicates remain HL-eligible.
2. Desk UX now separates **Priority Lenders** vs **Other Home Loan Lenders** (search covers both).
3. No Vercel deploy performed.
4. No Home Loan Product Program / commercials / FOIR / DBR / policy / documents configured.

## BAT path (local)

1. Open `/admin/home-loan-lender-priority`
2. Confirm first 21 match the table above
3. Search a non-priority lender (e.g. Aavas Financiers) — still listed under Other
4. Select / deselect without affecting eligibility
5. Reload — priority unchanged; Other section intact

## Artifacts

- Apply result: `docs/co-hl-program-001/CO-HL-PROGRAM-003-PRIORITY-APPLY-RESULT.json`
- Apply script: `scripts/co-hl-program-003-apply-priority.mjs`
- Verify: `npm run verify:co-hl-program-003`

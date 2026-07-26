# CO-ARCH-003 Phase 2B — Opportunity–Deal Data Integrity Report

**Executed:** 2026-07-23T20:55:51.544Z  
**Organization:** `rupee-catalyst`  
**Overall:** ✅ PASS (41 PASS / 0 FAIL)

> Validation only. No application or schema changes.

---

## Summary

| Field | Value |
|-------|-------|
| Contact ID | `c046aba9970e18705c0fb7ae0` |
| Opportunity ID | `c1a30bd30b054f8901c107df5` |
| Opportunity Business Reference | `OPP-2026-000005` |
| Number of Deals created | **4** |

## Deals

| # | Deal ID | Deal Number | Stage | Lender | Program | Invoice Party | Amount | Product |
|---|---------|-------------|-------|--------|---------|---------------|--------|---------|
| 1 | `c8ffcf6f457dc46c81f4d8f30` | `DEAL-2026-000016` | identified | HDFC | HDFC — Home Loan | P2B Integrity Invoice Party 1 1784840145684 | 8000000 | Home Loan |
| 2 | `c711425bf4aeea0c4489184bb` | `DEAL-2026-000017` | logged_in_wip | SBI | SBI — Home Loan | P2B Integrity Invoice Party 2 1784840145684 | 7500000 | Home Loan |
| 3 | `cdee1d55a8f716c866acf991f` | `DEAL-2026-000018` | credit_wip | Bajaj Housing Finance | Bajaj Housing Finance — Loan Against Property | P2B Integrity Invoice Party 3 1784840145684 | 5000000 | Loan Against Property |
| 4 | `cb8afd3c3396b5978a7baf8be` | `DEAL-2026-000019` | soft_approved | ICICI | ICICI — Home Loan | P2B Integrity Invoice Party 4 1784840145684 | 4500000 | Home Loan |

---

## Database verification

- ✅ PASS — One Contact exists (c046aba9970e18705c0fb7ae0)
- ✅ PASS — One Opportunity exists (c1a30bd30b054f8901c107df5 / OPP-2026-000005)
- ✅ PASS — No duplicate Opportunity records (1)
- ✅ PASS — Four Deal records exist (4)
- ✅ PASS — Every Deal references the same Opportunity (c1a30bd30b054f8901c107df5)
- ✅ PASS — Every Deal has unique Deal ID (c8ffcf6f457dc46c81f4d8f30, c711425bf4aeea0c4489184bb, cdee1d55a8f716c866acf991f, cb8afd3c3396b5978a7baf8be)
- ✅ PASS — Every Deal has unique Deal Number (DEAL-2026-000016, DEAL-2026-000017, DEAL-2026-000018, DEAL-2026-000019)
- ✅ PASS — Lender relationships are correct (FK + distinct) (HDFC | SBI | Bajaj Housing Finance | ICICI)
- ✅ PASS — Lender Program relationships are correct (program ∈ lender)
- ✅ PASS — Invoice Party relationships are correct (P2B Integrity Invoice Party 1 1784840145684 | P2B Integrity Invoice Party 2 1784840145684 | P2B Integrity Invoice Party 3 1784840145684 | P2B Integrity Invoice Party 4 1784840145684)
- ✅ PASS — No orphan Deals (Opportunity FK valid) ([])
- ✅ PASS — No Deal with invalid lender FK
- ✅ PASS — No Deal with invalid Invoice Party FK
- ✅ PASS — UUIDs/IDs unique across created set (n=18 unique=18)

## API / repository verification

- ✅ PASS — Opportunity displays correctly (repository findById parity) (OPP-2026-000005)
- ✅ PASS — All four Deals are visible (4)
- ✅ PASS — Deal counts match the database (app=4 db=4)
- ✅ PASS — Relationship integrity preserved (opp + lender + program + invoice party)
- ✅ PASS — Duplicate Opportunity+Lender rejected (Option A uniqueness) (P2002)

## Data consistency

- ✅ PASS — Foreign keys valid (opportunity, lender, program, invoice party)
- ✅ PASS — No orphan records in test set
- ✅ PASS — No duplicate Deal IDs or Deal Numbers
- ✅ PASS — Opportunity–Deal relationship intact
- ✅ PASS — Deals have distinct stages (identified, logged_in_wip, credit_wip, soft_approved)
- ✅ PASS — Deals have distinct loan amounts

## Clean-up

- ✅ PASS — Test Deals soft-deleted
- ✅ PASS — Test Opportunity soft-deleted
- ✅ PASS — Pre-existing lenders retained when reused (not force-deleted) (createdLenders=0; createdPrograms=4)

Test records were **soft-deleted** with reason `p2b_opp_deal_integrity_cleanup`.  
IDs retained in evidence JSON for audit. Soft-delete is appropriate here because Deal/Opportunity FKs use `onDelete: Restrict` and enterprise list queries exclude `isDeleted=true`.

---

## Final recommendation

**PASS — Opportunity–Deal data integrity validated. One Opportunity correctly stores four independent Deals with distinct lenders, programs, Invoice Parties, amounts, products, and stages. Relationships hold in both database and application repository-parity reads. No duplicate Opportunity. Duplicate Opportunity+Lender rejected. Test data cleaned up.**

Evidence: `docs/co-arch-003/CO-ARCH-003-PHASE-2B-OPP-DEAL-INTEGRITY-EVIDENCE.json`

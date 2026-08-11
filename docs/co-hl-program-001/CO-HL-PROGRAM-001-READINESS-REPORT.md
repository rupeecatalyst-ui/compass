# CO-HL-PROGRAM-001 — Readiness Report

**Sprint:** Home Loan Program — Lender Selection & Priority Order  
**Date:** 2026-08-08  
**Deploy:** **Blocked** pending Product Owner priority order  

## Scope completed (this step only)

1. Loaded active institutions from **Enterprise Lender Registry**
2. Filtered to **Home Loan–mapped** via Product–Lender Matrix (`productsSupported` / `HOME_LOAN` family)
3. Product Owner desk: search · filter · select · reorder · save · reload
4. Priority persisted in **separate** table `enterprise_product_lender_priorities`
5. **Did not** create Home Loan programs
6. **Did not** create/duplicate lenders or use seed as production SSOT
7. **Did not** deploy

## Live eligible list

- Artifact: `docs/co-hl-program-001/HOME-LOAN-ELIGIBLE-LENDERS-LIVE.json`
- Product Owner table: `docs/co-hl-program-001/CO-HL-PROGRAM-001-HOME-LOAN-ELIGIBLE-LENDERS.md`
- Count: see live JSON `homeLoanMappedCount` (195 at capture)

## Architecture

| Concern | Path |
|---|---|
| Compose | `src/lib/enterprise-product-lender-priority/compose-home-loan-eligible.ts` |
| Service | `server/services/product-lender-priority/home-loan-priority.service.ts` |
| API | `GET/PUT /api/admin/home-loan-lender-priority` |
| UI | `/admin/home-loan-lender-priority` |
| Migration | `prisma/migrations/20260808180000_co_hl_program_001_product_lender_priority/` |

## Certification checklist

| Check | Result |
|---|---|
| List from live Enterprise Lender Registry | ✅ |
| HL eligibility from Product–Lender Matrix | ✅ |
| No duplicate lenders created | ✅ |
| Priority persists (separate attribute) | ✅ (ready; awaiting PO order to populate) |
| Lender/product master identity unchanged | ✅ |
| Home Loan programs created | ❌ intentionally out of scope |
| Deployed | ❌ blocked until PO approval |

## STOP

Await Product Owner priority order. Do not configure Home Loan programs until order is confirmed.

# CO-ADMIN-006 — Product Master Functional Completion

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-27  
**Builds on:** CO-ADMIN-005 Product & Lender Master

## Root cause (Part 1)

`Failed to query products` was a **masked** API failure. Primary causes:

1. `ENTERPRISE_PERSISTENCE_MODE` not `prisma` (Product Registry requires Postgres)
2. Incomplete schema / missing migrations (`sort_order` and related columns)
3. Empty Category/Group tables → empty Product Master dropdowns (Categories UI was in-memory only)

### Fixes
- Actionable API errors via `productRegistryErrorResponse` (persistence / schema / real message)
- Admin list queries default `status=all` so drafts are visible in management
- Create Category/Group defaults to **active** when enabled
- Soft-delete blocked while child groups/products exist

## Parts 2–3 — Category & Group Master

`/admin/product-library/categories` is now API-backed CRUD:

- Create / Edit / Activate / Deactivate / Delete (when allowed)
- Groups belong to Categories
- Seed taxonomy: Loan Products · Investment Products · Insurance Products · Deposits · Others
- Groups: Secured / Unsecured / MSME / Housing / Professional / Corporate Loans + Investment / Insurance / Deposits / Others

## Part 4 — Product Master

- Category & Group dropdowns populate from registry (no manual IDs)
- Parent Product is a product picker (not a raw id field)
- Seed / Sync Catalog + empty-state guidance

## Part 5 — Commercial Purchase seed

| Field | Value |
|-------|--------|
| Category | Loan Products (`LOAN_PRODUCTS`) |
| Group | Secured Loans (`SECURED_LOANS`) |
| Product | Commercial Purchase |
| Code | `COMM_PURCHASE` |
| Active | Yes |
| Secured | Yes |
| Segment | business, msme, company |

Aliases: `COMMERCIAL_PURCHASE`, `commercial_purchase`, …

## Part 6 — Consumers

Operational product dropdowns consume `useProductMasterOptions` / Product Registry:

- Lead Information · Credit Bench modify · Chanakya gap product · Lender wizard · Policy/Rule builders

Canonical catalog remains **offline fallback only** when registry is empty/unavailable.

## Manual ops (required for live)

1. Set `ENTERPRISE_PERSISTENCE_MODE=prisma` and `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma`
2. Apply Product Registry migrations (CO-ARCH-001 + CO-ADMIN-005)
3. Open Product Master → **Seed / Sync Catalog**
4. Confirm `COMM_PURCHASE` appears in Opportunity Creation and other registry-fed surfaces

## Verify

```bash
npm run admin:product-master:verify
```

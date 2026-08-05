# CO-PROG-004 — Enterprise Default Lender Program Seeding

**Status:** Implementation Complete (code) · **No migrate** · **No deploy**  
**Date:** 2026-07-29

## Change control

- No live transactional Opportunity / Deal / Document data modified.
- No destructive SQL.
- No Vercel / production deploy.
- No database migration required (uses existing `EnterpriseLender` / `EnterpriseLenderProgram` tables).
- No website auto-sync.

## Objective delivered

Populate Product & Commercial Program Library with a one-time baseline:

1. **Supported Products (capability)** — canonical Product Master codes per lender from the Lender Master catalog (public retail / MSME families).
2. **Commercial Programs** — one Active stub program per (lender × supported product), commercial numerics left blank for administrators.

After seeding, Catalyst One is the SSOT; admins activate/deactivate lenders or programs and edit commercials without automatic overwrite.

## Root cause fixed (wizard empty products)

Lender Master historically stored snake_case (`home_loan`) while the Program Wizard filters against Product Master codes (`HOME_LOAN`).  
CO-PROG-004 normalizes capability to canonical codes and makes the wizard resolve aliases defensively.

## Admin control

| Action | Where |
|--------|--------|
| Seed Default Programs | Lender Registry → **Seed Default Programs** |
| Soft Go-Live fallback | Local store create-missing path |
| Prisma path | `POST /api/lender-registry/seed-baseline-programs` |
| Activate / deactivate lender or program | Existing Lender Registry APIs / UI |
| Add / retire / edit commercials | New Product Program wizard + program edit |

## Idempotency (create-missing)

- Empty `productsSupported` → fill from baseline.
- Non-empty → normalize aliases only; **never** add/remove admin selections.
- Programs: skip if program `code` exists **or** same `(lenderId, productCode)` exists.
- Second run: skipped counts only.
- Routine `POST /api/product-registry/seed` (Tier-2) does **not** create or sync commercial programs.

## Product Master addition

- `GOLD_LOAN` added to canonical Product Master (required for gold NBFC baseline products).

## Prisma program persistence fix

`createProgram` / `updateProgram` / `mapProgramRow` now persist `productCode` and commercial fields (wizard was previously dropping them on Prisma path).

## Verify

```bash
npm run verify:co-prog-004
```

## BAT checklist

1. Seed / Refresh Master (lenders present).
2. Seed Default Programs once.
3. Open New Product Program → choose seeded lender → Supported Products list is **non-empty**.
4. Confirm baseline programs appear Active with blank ROI/LTV.
5. Edit a program commercial → re-run Seed Default Programs → edit preserved.
6. Deactivate a program / lender → remains under admin control.
7. Re-run seed → no duplicate programs.
8. Upload Files / Deal / Opportunity flows unaffected.

## Regression assessment

| Area | Risk |
|------|------|
| Deal / Opportunity transactional data | None |
| Tier-2 product seed | Low — programs still empty in that loop |
| Admin capability edits | Protected (create-missing / normalize-only) |
| Program wizard | Improved (canonical codes) |

## Approval gates

No migration required. Deploy only when Product Owner approves BAT environment update (explicitly out of scope for this change-control sprint).

# CO-PR-005 — Product Registry Canonicalisation

**Status:** Implementation complete (presentation-layer)  
**Date:** 2026-07-30  
**Production Data Protection:** No delete · No Product ID changes · No Deal/Opportunity relationship changes

---

## Objective

The Enterprise Product Registry must **present only canonical Products** to administrators and all selectors. Historical duplicate rows remain in the database for backward compatibility until Product Owner approves physical consolidation.

---

## Rules enforced

| Surface | Behaviour |
|---------|-----------|
| Admin Product Master | Canonical products only; badge **Canonical** |
| Product–Lender Matrix | Canonical columns only (CO-PR-004 family dedupe) |
| Opportunity / Deal / Lead selectors | Canonical options only |
| Legacy duplicates | Annotated **Legacy / Historical** when `presentation=all`; hidden from normal admin |
| Create / Edit / Archive / Soft-delete | Blocked for Legacy / Historical rows |
| Physical DB rows | **Unchanged** |

---

## Implementation

1. `presentation-canonical.ts` — classify each row as `canonical` | `legacy` (read-path).
2. `GET /api/product-registry/products` — default `presentation=canonical`; `presentation=all` for read-only inventory.
3. Admin client + Product Master UI — canonical list; legacy not editable if ever shown.
4. `presentation-guards.ts` — block create of new legacy duplicates; block mutate/delete of legacy rows.
5. Selectors / matrix continue to use family dedupe (CO-PR-004).

---

## What was NOT done

- No Product rows deleted or disabled
- No Product IDs changed
- No Opportunity / Deal FK remapping
- No physical consolidation programme

---

## Validation

```bash
npm run verify:co-pr-005
npm run verify:co-pr-004
npm run inventory:co-pr-004   # read-only DB inventory
```

Manual BAT:

- [ ] Admin Product Master shows one Home / LAP / Business / Personal / Working Capital
- [ ] No `_STD` duplicate next to hyphen codes in admin list
- [ ] Product–Lender Matrix has no duplicate columns
- [ ] Selectors show each product once
- [ ] Existing Deals / Opportunities still open with their stored product codes

---

## Final status

🟡 Ready for Business Certification (presentation canonicalisation)  
Physical consolidation: **blocked** until PO-approved migration strategy

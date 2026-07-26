# CO-ARCH-003 Phase 2B Sprint 1 Amendment — Invoice Party Architecture

**Status:** Ready for Business Certification  
**Date:** 2026-07-24  
**Supersedes:** Commission Payer / Accounting Payee Master naming

---

## Terminology

| Former | Current |
|--------|---------|
| Payee / Commission Payer | **Invoice Party** |
| Payee Master | **Invoice Party Master** |
| `/api/accounting-payees` | `/api/invoice-parties` (old path kept as alias) |
| `EnterpriseAccountingPayee` | `EnterpriseInvoiceParty` (`@@map` → `enterprise_accounting_payees`) |
| `commissionAccountingPayeeId` | `invoicePartyId` (`@map` → `commission_accounting_payee_id`) |

Physical DB table/column names retained for Sprint 1 backward compatibility.

---

## Architecture

```
Contact / Company (ECM)  —1:0..1→  Invoice Party Master  —1:N→  Deals
```

- Every Invoice Party links exactly one Contact **or** Company (no duplicate party data).
- Unique partial indexes enforce one active Master row per Contact / Company per org.
- Deal Workspace dropdown reads **only** active Invoice Party Master records.

---

## Configurable Chanakya gate

SSOT: `src/constants/invoice-party.ts`

- `INVOICE_PARTY_REQUIRED_FROM_STAGE = "logged_in"` (change this constant — not hard-coded in UI/services)
- UI requires Invoice Party at that stage and beyond
- Progression **beyond** that stage is blocked until assigned
- Message: *"This Deal does not have an Invoice Party assigned. Please select an Invoice Party from the Accounting Master before proceeding."*

---

## Navigation

Accounting → **Invoice Party Master** → + Add Invoice Party

---

## Out of scope (unchanged)

Invoice generation · GST calculations · Accounting workflows · Payout / commission / reconciliation / collections

---

## Verification

- Schema verify: `scripts/co-arch-003-p2b-s1-verify.mjs` → **ALL PASS**
- TypeScript: clean
- Phase 2A Opportunity–Deal model: intact

---

## Next

Await Business Certification before Phase 2B Sprint 2.

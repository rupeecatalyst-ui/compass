# CO-DWS-001C — Remove Accounting Dependency from Lender Pipeline

**Status:** Implementation complete (static verify)  
**Change control:** No database migrations · No live-data modifications · No deployment  
**Parent:** CO-DWS-001 Deal Workspace Validation Stabilization

---

## Business decision (approved)

The Lender Pipeline is an **operational workflow**. It must **not** depend on the Accounting Module.

Invoice Party / Payee / Accounting Master validation shall **not** execute during any Lender Pipeline stage transition.

---

## New behaviour

| Missing Invoice Party | Result |
|---|---|
| Lender Pipeline stage move | Allowed — no reject, no rollback, no blocking error |
| Action Center | Non-blocking item: **Accounting Setup Pending** |
| Detail | Invoice Party has not yet been configured. |
| Action | Configure Invoice Party |
| Invoice / commission / payment / accounting post | Hard gate via `assertInvoicePartyForAccountingOperation` |

---

## Validation removed (pipeline)

Removed / confirmed absent as hard gates on:

- Logged In → Soft Approved  
- Soft Approved → Final Approved  
- Final Approved → Closure WIP  
- Closure WIP → Disbursed  
- Any other Lender Pipeline stage transition (`transitionDeal`, pipeline board drag)

Mechanisms confirmed non-blocking:

| Mechanism | Behaviour |
|---|---|
| `invoicePartyRequiredToProgressTo` | Always `false` |
| `assertInvoicePartyForDealStage` | No-op |
| `transitionDeal` | No Invoice Party assert |
| `loan-validation` | No `LOAN_MISSING_INVOICE_PARTY` |
| Edit Deal / Loan modal `InvoicePartyField` | `required={false}` |
| Lender Pipeline board | No payee / Invoice Party gate |

---

## Accounting validation preserved

Hard require Invoice Party **only** for accounting-oriented operations via:

- `assertInvoicePartyForAccountingOperation` (`src/constants/invoice-party.ts` + server wrapper)
- Optional `requireInvoiceParty: true` on Deal edit validation (accounting flows only)

---

## Files modified

| Path | Change |
|---|---|
| `src/constants/invoice-party.ts` | Action Center copy SSOT (`Accounting Setup Pending`, hint, action) |
| `src/lib/deal-workspace/deal-workflow-validation.ts` | Readiness uses Action Center labels; inventory marks accounting as warning |
| `src/components/catalyst-one/action-center/deal-action-center.tsx` | Non-blocking readiness notice with approved copy |
| `src/components/catalyst-one/deal-workspace/deal-executive-header.tsx` | Readiness strip CTA uses same SSOT copy |
| `server/services/enterprise-deal/enterprise-deal.service.ts` | Comment lock: no Invoice Party on `transitionDeal` |
| `src/components/catalyst-one/execution/lender-pipeline-board.tsx` | Comment lock: never block drag on Invoice Party |
| `scripts/co-dws-001-verify.mjs` | Align with Action Center title |
| `scripts/co-dws-001c-verify.mjs` | New static verify |
| `package.json` | `verify:co-dws-001c` |

---

## Regression report

| Check | Result |
|---|---|
| Stage transition independence from Accounting | ✅ |
| No rollback hook after move for Invoice Party | ✅ |
| Action Center non-blocking item when party missing | ✅ |
| Accounting assert still present for accounting ops | ✅ |
| No migrate / no deploy / no live-data | ✅ |

Verify:

```bash
npm run verify:co-dws-001
npm run verify:co-dws-001c
```

---

## BAT confirmation (checklist)

1. Open Deal Workspace with **no** Invoice Party assigned.  
2. Move Lender Pipeline through Logged In → Soft Approved → Final Approved → Closure WIP → Disbursed (as permitted by stage rules).  
3. Confirm: **no** blocking toast / API reject / stage rollback for Invoice Party.  
4. Open Action Center → see **Accounting Setup Pending** with detail and **Configure Invoice Party**.  
5. Attempt an accounting operation (invoice / commission / payment) without party → expect accounting gate only.  
6. Assign Invoice Party → Action Center accounting warning clears; pipeline behaviour unchanged.

---

## Success criteria

- [x] Lender stage transitions never depend on Accounting  
- [x] No rollback after moving stages due to Invoice Party  
- [x] Invoice Party validation preserved for Accounting workflows only  
- [x] No intentional regressions under change control (no migrate / deploy)

# CO-DWS-001 — Deal Workspace Stabilization & Workflow Validation Framework

**Status:** Implementation Complete (code) · **No migrate** · **No deploy**  
**Date:** 2026-07-29

## 1. Root Cause Analysis

**Symptom:** Deal Workspace / Lender Pipeline showed:

> This Deal does not have an Invoice Party assigned. Please select an Invoice Party from the Accounting Master before proceeding.

**Primary cause:** Invoice Party was implemented as a **stage-gated hard block**:

| Layer | Behaviour (before) |
|-------|-------------------|
| `invoicePartyRequiredToProgressTo` | True when moving beyond `logged_in` |
| `assertInvoicePartyForDealStage` | Thrown inside `transitionDeal` → Kanban/stage moves fail |
| `validateLoanFile` | Emitted `LOAN_MISSING_INVOICE_PARTY` → Business Completion dialog / save gate |
| `validateDealEditFields` | `requireInvoiceParty` defaulted on → Edit Deal blocked |
| UI `InvoicePartyField` | `required` + destructive error at stage threshold |

Accounting configuration (Invoice Party Master) was incorrectly coupled to **lender execution**.

## 2. Validation Inventory (classified)

| Validation Name | Module | Purpose | Trigger | Severity (after) |
|-----------------|--------|---------|---------|------------------|
| Invalid stage transition | Lender Pipeline | Lifecycle integrity | Stage move | **Blocking** |
| Missing lender on Deal edit | Deal Edit | One-lender negotiation identity | Save Deal edit | **Blocking** |
| Missing loan amount | Deal Edit | Amount integrity | Save Deal edit | **Blocking** |
| Missing product / BT fields (LoanFile path) | Loan save | Journey integrity | Save loan | **Blocking** (unchanged) |
| Invoice Party missing | Accounting | Commission invoice party | Load / readiness / **accounting ops only** | **Warning** (pipeline) · **Blocking** (accounting ops) |
| Commercial / docs gaps | Commercial / Docs | Completeness | Load | **Warning** |
| Chanakya recommendations | CHANAKYA | Mentoring | Load | **Informational** |

Full rule list: `DEAL_WORKFLOW_VALIDATION_INVENTORY` in `src/lib/deal-workspace/deal-workflow-validation.ts`.

## 3. Classification Matrix

| Class | Rule |
|-------|------|
| **A Blocking** | Only when data integrity would be corrupted (illegal stage, missing lender on create/edit identity, invalid amounts where required) |
| **B Warning** | Invoice Party, incomplete commercial, document gaps → Readiness strip / Action Center messaging |
| **C Informational** | Chanakya recommendations, best practices |

## 4. Changes Implemented

1. **`invoicePartyRequiredToProgressTo` → always `false`** (pipeline never blocked).  
2. **`assertInvoicePartyForDealStage` → no-op**; removed from `transitionDeal`.  
3. **`assertInvoicePartyForAccountingOperation`** — hard gate for invoice/commission/payment/posting.  
4. Removed Invoice Party from **`validateLoanFile`** blockers.  
6. **`validateDealEditFields`**: Invoice Party only when `requireInvoiceParty === true` (Edit Deal uses `false`; field `required={false}`).  
7. Loan Workspace Invoice Party field: non-required + amber **hint**, not destructive error.  
8. **`deriveDealReadiness` + `DealReadinessStrip`** on Deal executive header (Accounting Ready warning + Configure CTA).  
9. **Action Center** surfaces Accounting Ready notices (`readinessNotices`) — non-blocking.  
10. Chanakya guidance copy updated to accounting-scoped language.  
11. Consolidated SSOT validation inventory + readiness derive (single implementation).  
12. Phase 2B BFV script T4 updated to CO-DWS-001 expectations (pipeline no-op; accounting assert).

## 5. Regression Report

| Area | Expectation | Risk |
|------|-------------|------|
| Open / view Deal Workspace | No Invoice Party blocker | Low |
| Lender Pipeline stage moves | Allowed without Invoice Party | Low (intentional behaviour change) |
| Save Deal / Edit Deal | No Invoice Party requirement | Low |
| Upload documents / timeline | Unaffected | None |
| Action Center communications | Unaffected | None |
| Future accounting ops | Must call `assertInvoicePartyForAccountingOperation` | Medium — wire when those ops ship |
| Stage transition rules | Still enforced via `validateStageTransition` | None |

## 6. Business Certification / BAT Checklist

1. Open Deal Workspace without Invoice Party → loads.  
2. Move Lender Pipeline stages across Logged In – WIP and beyond → **succeeds**.  
3. Save Deal / Edit Deal without Invoice Party → **succeeds** (lender/program/amount still validated).  
4. Readiness strip shows **Accounting Ready** warning when stage ≥ Logged In and party missing.  
5. Assign Invoice Party → warning clears.  
6. Upload documents / timeline / Action Center email → unaffected.  
7. When accounting action APIs exist → missing party returns accounting-scoped error only.

## 7. Verify

```bash
npm run verify:co-dws-001
```

## 8. Change-control attestation

| Action | Done? |
|--------|-------|
| Live data modified | No |
| Migrations executed | No |
| Vercel / production deploy | No |
| Application code updated | Yes (validation behaviour only) |

---

*End of CO-DWS-001 report*

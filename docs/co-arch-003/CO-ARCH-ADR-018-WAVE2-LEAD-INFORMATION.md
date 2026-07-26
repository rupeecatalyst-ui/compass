# ADR-018 Wave 2 — Lead Information Workspace

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-25  
**Route:** `/lead-information?opportunityId=<cuid>`  
**SSOT:** Opportunity Registry only (CAD-2026-001 / ADR-018)

---

## Business flow (this wave)

```
Draft Opportunity (Wave 1)
  → Open Lead Information Workspace (?opportunityId=)
  → Capture Product* + Required Amount* (+ optional fields)
  → Save → PATCH Opportunity Registry
  → Auto transition Draft → Requirement Captured (Wave 1 persistence)
  → Save & Continue enabled when Requirement Captured
  → (Wave 3) Journey routing — not in this wave
```

**Not changed:** Start Loan Journey, Execution Hub, Opportunity Workspace entry, Documents/LIFE/Pipeline.

---

## Component architecture

| Piece | Path |
|-------|------|
| Page | `src/app/(dashboard)/lead-information/page.tsx` |
| Workspace | `src/components/catalyst-one/lead-information/lead-information-workspace.tsx` |
| Constants | `src/constants/lead-information-workspace.ts` |
| Validation | `src/lib/lead-information/validate-lead-information.ts` |
| Route | `ROUTES.LEAD_INFORMATION` |
| API | `enterpriseOpportunityApiClient.updateOpportunity` (PATCH) |

**Forbidden imports:** LoanFile storage, Deal DAL, `LoanCreateFormDialog`, `ensure-loan-workspace`, `map-deal-to-loan-file`.

---

## Validation rules

| Rule | Behaviour |
|------|-----------|
| Product * | Required for Save & Continue / Requirement Captured |
| Required Amount * | Required, valid number &gt; 0 |
| Save (partial) | Allowed for optional fields; invalid amount string blocked |
| Transition | Server Wave 1: both Product + Amount → `requirement_captured` |
| Continue | Enabled only when Requirement Captured (or form ready before save) |

---

## Field provenance matrix (CAD-2026-001)

| Field | Classification | Source table.column / store | Runtime origin |
|-------|----------------|-----------------------------|----------------|
| Product | User Entered → Persisted Opportunity | `enterprise_opportunities.product_code` / `product_label` | Lead Information Select |
| Required Amount | User Entered → Persisted Opportunity | `enterprise_opportunities.requested_amount` | Lead Information Input |
| Transaction Type | User Entered → Persisted Opportunity | `enterprise_opportunities.transaction_type` | Select (nullable) |
| Employment Type | User Entered → Persisted Opportunity | `enterprise_opportunities.employment_type_code` | Select (nullable) |
| Purpose | User Entered → Persisted Opportunity | `enterprise_opportunities.lending_extension.purpose` | Select (nullable) |
| City / State | User Entered → Persisted Opportunity | `city_label` / `state_label` | Inputs (nullable) |
| Notes | User Entered → Persisted Opportunity | `lending_extension.remarks` | Textarea (nullable) |
| Opportunity Number | System Metadata | `opportunity_number` | Registry |
| Lifecycle | System Metadata / Derived | `lifecycle_status` | Wave 1 on Save |
| Lending Type | Not Specified | *no column / not written* | Never fabricated |

---

## PATCH integration summary

`PATCH /api/enterprise-opportunities/:id` body includes:

`productCode`, `productLabel`, `productFamily`, `requestedAmount`, `transactionType`, `employmentTypeCode`, `cityLabel`, `stateLabel`, `lendingExtension`, `rowVersion`

No LoanFile / Deal side effects.

---

## Regression impact

| Area | Impact |
|------|--------|
| Start Loan Journey | Unchanged |
| `/loan-information` | Unchanged (legacy LoanFile path) |
| OW / Credit Bench | Unchanged |
| New route `/lead-information` | Additive only |

---

## BAT checklist

1. [ ] Create Draft Opportunity via API (`createAsDraft: true`) — no product/amount.  
2. [ ] Open `/lead-information?opportunityId=<draftId>`.  
3. [ ] Confirm identity (OPP number / contact) loads; Product/Amount empty / Not Specified.  
4. [ ] Save optional City only → remains Draft; no LoanFile/Deal created.  
5. [ ] Select Product + Required Amount → Save → lifecycle **Requirement Captured**; `requirementCaptured: true`.  
6. [ ] Save & Continue enabled; toast notes Wave 3 routing (no unintended navigation).  
7. [ ] Lending Type remains Not Specified.  
8. [ ] Second Opportunity same Contact+Product at capture → uniqueness conflict (409).  
9. [ ] Confirm Start Loan Journey / Hub / OW still behave as before.

# Enterprise Financial Operations Engine (EFOE) — Architecture

**Sprint:** Catalyst One Sprint 12 (CF-S12-001)  
**Version:** 12.0.0  
**Status:** Foundation (in-memory, business-agnostic)

---

## Purpose

EFOE is the canonical operational financial domain for Catalyst One. It manages operational revenue from invoice generation through revenue recognition, distribution, settlements, and partner financial visibility.

**This is NOT an accounting package.** EFOE integrates with accounting systems instead of replacing them.

**Non-goals:** No GL, trial balance, balance sheet, P&L, journal entries, tax filing, accounting software, UI, APIs, or database.

---

## Frozen Architecture Principles

1. **Operational Financial Management** — NOT accounting.
2. **Users capture business facts** — Catalyst One derives business intelligence.
3. **Invoice calculations use Disbursed Amount** — never Final Loan Amount.
4. **Revenue exists only after Payment Received** — never on disbursement or invoice alone.
5. **Business behaviour is configuration-driven** — no hardcoded percentages or requirements.

---

## Core Domain Models

| Model | Type |
|-------|------|
| Revenue Event | `EfoeRevenueEvent` |
| Invoice | `EfoeInvoice` |
| Invoice Line | `EfoeInvoiceLine` |
| Invoice Schedule | `EfoeInvoiceSchedule` |
| Invoice Payee | `EfoeInvoicePayee` |
| Revenue Receipt | `EfoeRevenueReceipt` |
| Revenue Recognition | `EfoeRevenueRecognition` |
| Revenue Distribution | `EfoeRevenueDistribution` |
| Distribution Rule Reference | `EfoeDistributionRuleReference` |
| Beneficiary | `EfoeBeneficiary` |
| Settlement | `EfoeSettlement` |
| Settlement Batch | `EfoeSettlementBatch` |
| Settlement Eligibility | `EfoeSettlementEligibility` |
| Settlement Profile | `EfoeSettlementProfile` |
| Settlement Requirement | `EfoeSettlementRequirement` |
| Settlement Override | `EfoeSettlementOverride` |
| Adjustment | `EfoeAdjustment` |
| Clawback | `EfoeClawback` |
| Recovery | `EfoeRecovery` |
| Write-off | `EfoeWriteOff` |
| Financial Timeline | `EfoeFinancialTimelineEntry` |
| Financial Audit Reference | `EfoeFinancialAuditReference` |

---

## Revenue Recognition Lifecycle (Mandatory)

Disbursement → Invoice → Payment Received → Revenue Recognized

Revenue is NEVER recognized on disbursement or invoice alone.

---

## Disbursement Rules (System-Derived)

| Condition | Status |
|-----------|--------|
| Total Disbursed = 0 | Not Disbursed |
| 0 < Total Disbursed < Final Loan Amount | Partially Disbursed |
| Total Disbursed = Final Loan Amount | Fully Disbursed |
| Total Disbursed > Final Loan Amount | Validation Failure |

Auto-derived: Total Disbursed, Pending Disbursement, Disbursement %, Invoice Eligible Amount, Total Invoiced, Remaining Invoice Eligible.

---

## Invoice Philosophy

- Invoices are operational events, NOT accounting entries.
- Multiple invoices per transaction (tranche-based disbursement).
- Configurable payee: Bank, NBFC, Builder, Corporate, Individual, Registered Organization.
- Never assumes lender is always the payee.

---

## Settlement

- Multiple, partial, advance, and batch settlements supported.
- Settlement blocked until eligibility satisfied (configurable profiles).
- Requirements: PAN, Aadhaar, Bank Details, KYC, TDS, GST, etc. — all configurable.

---

## Distribution

- Begins ONLY after revenue recognition.
- Policy-driven, unlimited beneficiaries.
- No hardcoded percentages.

---

## Clawback Strategies (Configuration-Driven)

Recover Immediately, Recover from Future Settlement, Company Absorbs, Manual Recovery, Write-off.

---

## Validation

| Rule | Function |
|------|----------|
| Duplicate invoice | `validateEfoeInvoice` |
| Duplicate settlement | `validateEfoeSettlement` |
| Invalid distribution | `validateEfoeDistribution` |
| Settlement eligibility failure | `validateEfoeSettlementEligibility` |
| Over-disbursement | `validateEfoeOverDisbursement` |
| Duplicate beneficiary | `validateEfoeDistribution` |
| Invalid revenue recognition | `validateEfoeRevenueRecognition` |
| Clawback validation | `validateEfoeClawback` |
| Recovery validation | `validateEfoeRecovery` |

---

## Architecture

**Ports:** `getEfoePorts()`, `configureEfoePorts()`, `resetEfoeComposition()`

**Modules:**
- `revenue-registry.ts` — revenue events
- `invoice-registry.ts` — invoices, receipts, recognition
- `distribution-registry.ts` — policy-driven distribution
- `settlement-registry.ts` — settlements, batches, overrides
- `settlement-profile-registry.ts` — configurable eligibility
- `beneficiary-registry.ts` — beneficiary management
- `adjustment-registry.ts` — financial adjustments
- `clawback-registry.ts` — clawback strategies
- `recovery-registry.ts` — recovery and write-offs
- `partner-visibility.ts` — operational partner financial visibility
- `validation-engine.ts` — disbursement derivation and validation
- `financial-timeline-registry.ts` — financial timeline
- `audit-integration.ts` — EAF audit bridge

---

## File Layout

```
src/types/enterprise-financial-operations-engine.ts
src/types/enterprise-financial-operations-engine-ports.ts
src/constants/enterprise-financial-operations-engine/
src/constants/enterprise-financial-operations-engine-exports.ts
src/lib/enterprise-financial-operations-engine/
docs/enterprise-financial-operations-engine.md
```

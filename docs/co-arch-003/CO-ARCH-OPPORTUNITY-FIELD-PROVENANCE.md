# Opportunity Workspace — Field Provenance (Architectural Cleanup)

**Status:** Active · governed by **CAD-2026-001** / [ADR-017](../adr/ADR-017-business-data-provenance-cad-2026-001.md) · journey entry by [ADR-018](../adr/ADR-018-start-loan-journey-draft-lead-information.md)  
**Principle:** During Lead / Opportunity lifecycle, **Opportunity Registry** is the sole business SSOT.  
**Rule:** Never synthesize business values. Uncaptured → **Not Specified**.

### ADR-018 capture gate (approved)

| Milestone | Condition | Authoritative store |
|-----------|-----------|---------------------|
| Draft | Start Loan Journey — identity only | Opportunity Registry |
| Requirement Captured | Product + Required Amount saved | Opportunity Registry (Lead Information Workspace) |
| Opportunity Workspace | Only after Requirement Captured | Execution / enrichment — not initial capture |

Lending type: Not Specified until captured or approved derivation.

### ADR-018 Wave 2 — Lead Information Workspace

| Workspace | Route | Persist |
|-----------|-------|---------|
| Lead Information | `/lead-information?opportunityId=` | Opportunity Registry PATCH only |

Field matrix: `docs/co-arch-003/CO-ARCH-ADR-018-WAVE2-LEAD-INFORMATION.md`

---

## Display contract

| Condition | UI |
|-----------|-----|
| Field captured on Opportunity (or linked Contact identity) | Show value |
| Field not captured | **Not Specified** |
| LoanFile / Deal attachment present | Structure / `fileId` only — **not** business overlay |

Helpers: `src/lib/lead-opportunity-journey/opportunity-field-display.ts`  
Projection: `projectOpportunityToRuntimeCase` in `opportunity-runtime-adapter.ts`

---

## Lead Creation — Loan Details

| Field | Classification | Authoritative source | Notes |
|-------|----------------|----------------------|-------|
| Product | Persisted Opportunity Data | `product_label` / `product_code` / `product_family` | May be set by Start Loan Journey create default (Home Loan) — explicit create-time policy |
| Required Amount | Persisted Opportunity Data | `requested_amount` | Null → Not Specified (never invent ₹50L) |
| Lending Type | Persisted Opportunity Data | *No Opportunity column today* | Always Not Specified until captured / schema extended |
| Transaction Type | Persisted Opportunity Data | `transaction_type` | Null → Not Specified (no runtime `"fresh"`) |
| Stage | Persisted Opportunity Data | `requirement_stage` | Null → Not Specified (no runtime invent of `raw_lead`) |
| Relationship Manager | Persisted Opportunity Data | `relationship_manager_name` | From Contact owner at create when provided |
| Priority | Persisted Opportunity Data | `priority` | Null → not displayed as medium; structural cast only on LoanFile view |

## Lead Creation — Customer Information

| Field | Classification | Authoritative source |
|-------|----------------|----------------------|
| Customer Name / Mobile / Email | Persisted Opportunity Data (+ Contact) | Opportunity denormalized fields; Contact fill-in when linked |
| City / State / Employment | User Input (Contact) | ECM Contact — Not Specified if blank |

## Opportunity Workspace header / creation chrome

| Field | Classification | Authoritative source |
|-------|----------------|----------------------|
| Product label | Persisted Opportunity Data | Registry `productLabel` / `productCode` / `productFamily` — never `product:home-loan` invent |
| Amount label | Persisted Opportunity Data | Registry `requestedAmount` only when opportunity open |
| Lifecycle status | Persisted Opportunity Data | `lifecycle_status` — Not Specified if blank |
| Opportunity number | Persisted Opportunity Data | `opportunity_number` |

## Structural LoanFile placeholders (not business truth)

These exist only so stages can consume a LoanFile-shaped view. **OW must not present them as captured facts:**

| Field | Classification |
|-------|----------------|
| `status` / `progress` / revenue / sanction / tenure zeros | Structural Compatibility Shape |
| Empty `lendingType` / `transactionType` / `priority` | Uncaptured → UI Not Specified |
| `amountCaptured === false` with numeric `0` | Uncaptured amount sentinel |

---

## Removed fabrications

| Former behaviour | Action |
|------------------|--------|
| `lendingType: "secured"` in projection | Removed |
| `transactionType: "fresh"` in projection | Removed |
| `priority: "medium"` when unset | Removed |
| `customerName: "Customer"` when unset | Removed (→ Not Specified) |
| Default stage `raw_lead` when unset | Removed at runtime projection |
| LoanFile stamp supplying amounts/types into OW | Compat adapter projects Opportunity only; keeps `fileId` on context |
| Header fallback `product:home-loan` | Replaced with Not Specified |
| Amount `0` shown as ₹0 / LoanFile 50L bleed | Amount uses `amountCaptured` flag |

---

## Allowed exceptions

1. **Product create default** — Start Loan Journey may persist Home Loan when product omitted (Contact+Product uniqueness). That is create-time initialization, not silent UI invention.  
2. **Structural LoanFile shape** — empty enums / zero amounts are structural placeholders for the view model; UI must not present them as business truth.  
3. **Deal attachment** — `ensure-loan-workspace` may create Deal/LoanFile structure for LIFE execution; it must seed from Opportunity Registry / caller only — never invent amount / secured / fresh for OW.

---

## CAD-2026-001 Priority 1 CCR (2026-07-25)

| Module | Remediation |
|--------|-------------|
| `ensure-loan-workspace.ts` | Removed `5_000_000`, `secured`, `fresh`, invent-Home-Loan product seed; async enriches from Opportunity Registry; never writes Opportunity business fields |
| `map-deal-to-loan-file.ts` | Removed fabricated `secured` / `fresh`; amount from Deal/local only; empty when unknown |

### Residual (Priority 2 — out of P1 scope)

| Module | Issue |
|--------|-------|
| `createLoanFileFromInput` (`loan-files-utils.ts`) | Still defaults `transactionType ?? "fresh"` and may infer lendingType from product when Deal create omits them |
| `resolveOpportunityRuntimeCaseSync` fileId-only fallback | May return legacy LoanFile if Opportunity id absent — FS-01 hardening |

### Confirmation

Opportunity Workspace / FS-01 projection does **not** import `ensure-loan-workspace` or `map-deal-to-loan-file` for business display. LIFE may call ensure for **Deal attachment only**.

---

## LIFE / Deal boundary

Move to Deal / ensure Loan Workspace create **Deal** attachments. Opportunity Workspace Lead Creation display remains Opportunity Registry only.

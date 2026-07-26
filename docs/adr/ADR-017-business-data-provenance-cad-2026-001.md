# ADR-017: Business Data Provenance Standard (CAD-2026-001)

**Status:** **CONSTITUTIONAL — ACCEPTED**  
**Directive ID:** CAD-2026-001  
**Date:** 2026-07-25  
**Classification:** ARCH / CONSTITUTIONAL / DATA PROVENANCE  
**Related:** CO-ARCH-003 · FS-01 Opportunity Runtime · ADR-016 (Deal SSOT for Deal stage) · `docs/co-arch-003/CO-ARCH-OPPORTUNITY-FIELD-PROVENANCE.md`

## Decision

Every business value displayed anywhere in Catalyst One must have **exactly one authoritative source**.

The UI must never invent, assume, fabricate, or silently default business information.

If a business value has not been captured or derived through an approved business rule, it must **not** be displayed as an actual value.

## Lead / Opportunity stage SSOT

During **Lead Stage** and **Opportunity Stage**:

**Opportunity Registry is the ONLY authoritative source of business data.**

The following MUST NOT introduce business values into Opportunity Workspace:

- LoanFile compatibility layer
- Runtime projections
- UI defaults
- Legacy adapters
- Cached compatibility objects
- Placeholder runtime values

Compatibility layers may translate **structure only**. They must never become business data sources.

## Field provenance categories (mandatory)

Every business field rendered by the UI belongs to exactly one category:

1. **Persisted Opportunity Data** — e.g. Product, Requested Amount, Purpose, Employment Type, Transaction Type  
2. **User Entered Data** — captured directly from the Relationship Manager  
3. **Policy Engine Output** — derived by Enterprise Policy Engine  
4. **Calculated Business Value** — approved business formulas  
5. **System Metadata** — Opportunity ID, Stage, Owner, Created Date, Last Updated  

## Unknown data

Uncaptured business values must display **Not Specified**, **Not Selected**, **Pending Input**, or an editable control — never fabricated values.

## Prohibited patterns

Hardcoded business defaults such as:

- `transactionType = "fresh"`
- `lendingType = "secured"`
- `requiredAmount = 5000000`

…unless they originate from an approved source category above (e.g. explicit create-time product policy that **persists** to Opportunity Registry).

## Provenance requirement

For every Opportunity Workspace displayed field, engineering must answer:

| Question | Required |
|----------|----------|
| Source table | Yes |
| Source column | Yes |
| Business owner | Yes |
| Runtime origin | Yes |
| Persisted / calculated / user entered / policy derived | Yes |

No field shall exist without documented provenance. Register: `docs/co-arch-003/CO-ARCH-OPPORTUNITY-FIELD-PROVENANCE.md` (extend as OW fields are audited).

## Consequences

- Future implementations **must** comply.
- Compatibility adapters may remain during migration but must not inject business semantics into Opportunity Workspace.
- Deal-stage defaults (e.g. `ensure-loan-workspace`) belong to **Deal runtime** only — not Lead/Opportunity display SSOT.
- Violations are architectural defects and are not production-ready for Opportunity lifecycle surfaces.

## Acknowledgement

| Item | Status |
|------|--------|
| Rule accepted | **Yes** — effective 2026-07-25 |
| Architecture documentation updated | **Yes** — this ADR + cursor rule + provenance register linkage |
| Future development will comply | **Yes** — mandatory for all agents and engineers |
| Feature remediation in this acknowledgement | **No** — impact assessment only; remediation is separate work |

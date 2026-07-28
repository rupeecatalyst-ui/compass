# CO-DOM-001 — Enterprise Borrower & Contact Model Refinement

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-27  
**Readiness score:** 88 / 100

## Objective

Support commercial lending where the primary borrower may be an **Individual** or a **Company**, without duplicating customer models or breaking Opportunity Registry SSOT.

## Delivered

### Part 1 — Contact type simplification

- Removed **Individual + Company** creation intent.
- Contacts create flow retains only **Individual** and **Company**.
- Company↔person links remain via ECM company contact links (not a third contact type).

### Part 2 — Opportunity initiation

- Draft Opportunity may be created with `primaryBorrowerKind: company`.
- `primaryContactId` is **nullable** when the company is the primary borrower.
- Company name is denormalized onto the Opportunity (`companyName` / display name).
- `startOpportunityFromCompany` wires Company Workspace → Execution Hub (ADR-018 Draft path).

### Part 3 — Company Representatives

- Representative roles for communication: **Employee**, **Authorised Signatory**.
- Link fields: designation, department (optional).
- Persisted on `EcmCompanyContactLink` (existing registry — no parallel contact store).

### Part 4–5 — Borrower structure vs representatives

- Loan structure participants remain on `lendingExtension.participants`.
- Opportunity Workspace shows separate sections:
  - **Borrower Structure**
  - **Representatives**
  - **Communication Contacts**

### Part 6–7 — Integrity

- Uniqueness: Contact+Product (individual) **or** Company+Product (company borrower).
- Representatives never auto-become applicants/guarantors.
- No second customer/borrower registry introduced.

## Schema / migration

Migration: `prisma/migrations/20260727120000_co_dom_001_borrower_contact_model/migration.sql`

- `OpportunityPrimaryBorrowerKind` enum
- Nullable `primary_contact_id`
- `primary_borrower_kind`, `company_name`
- `employee` on `EcmCompanyRelationRole`
- `designation`, `department` on company contact links

## Manual steps required

1. Apply migration in each environment (`prisma migrate deploy` or equivalent).
2. Confirm Company Workspace → **Start Loan Journey** creates a company-owned Draft Opportunity.
3. Confirm representatives remain excluded from Loan Structure unless explicitly assigned a borrower role.

## Validation

| Check | Result |
|-------|--------|
| Production build | ✅ |
| TypeScript | ✅ |
| Static verify (`node scripts/co-dom-001-verify.mjs`) | ✅ |

## Gaps / follow-ups

- Legacy company link roles (director, promoter, …) remain in the Prisma enum for existing rows; the Company Representatives UI defaults to Employee / Authorised Signatory.
- Company+Product uniqueness uses application-level checks (index added); optional partial unique DB constraint can follow once BAT confirms patterns.
- Lead Information / underwriting forms may need company-borrower field variants in a later UX sprint.

## Architecture decisions

- No duplicate customer model — ECM Contact + ECM Company remain SSOT.
- Opportunity Registry remains Opportunity lifecycle SSOT.
- ADR-018 Draft Start path extended (not replaced) for company borrowers.
- CAD-2026-001 — company name comes from Company Registry; no fabricated individual.

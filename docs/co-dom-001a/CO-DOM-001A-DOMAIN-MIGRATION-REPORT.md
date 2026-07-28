# CO-DOM-001A — Enterprise Borrower Domain Migration Report

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-27  
**Predecessor:** CO-DOM-001 (Company Borrower support)  
**Constitutional Health Check:** GREEN — extends approved borrower model; no ADR conflict

## Objective

CO-DOM-001 made `primaryContactId` nullable and introduced `primaryBorrowerKind` / `companyId`.  
Parts of the platform still assumed **Primary Borrower == Primary Contact**.

CO-DOM-001A performs a **complete domain migration** so Individual and Company borrowers share one consistent identity projection — not per-file compile patches.

## Canonical model (frozen)

```
primaryBorrowerKind == individual
  Borrower → Contact (primaryContactId)

primaryBorrowerKind == company
  Borrower → Company (companyId)
  Representatives → Contacts (ECM company links)
```

## SSOT introduced

| Artefact | Path |
|---|---|
| Identity projection | `src/lib/enterprise-borrower-identity/` |
| Platform rule | `.cursor/rules/enterprise-borrower-domain.mdc` |
| Verify | `npm run dom:borrower:verify` → `scripts/co-dom-001a-verify.mjs` |

### Helper contract

- `resolveOpportunityBorrowerIdentity(source)`
- `resolveDealBorrowerIdentity(source)` — `companyId` ⇒ Company borrower
- `borrowerDisplayNameOrDash(source)`
- Returns: `kind`, `displayName`, `partyId` (`company:<id>` \| `contact:<id>`), `partyEntityId`

## Modules updated

### Domain / identity

| Module | Change |
|---|---|
| `enterprise-borrower-identity` | **New** canonical projection |
| `opportunity-primary-borrower` constants | Unchanged (consumed) |
| Active Opportunity Context | Adds `companyId`, `primaryBorrowerKind`, `partyId`; `contactId` optional for company |
| Enterprise Session | Adds `activeCompanyId`, `partyId`; binds via identity helpers |

### Opportunity Registry & journey

| Module | Change |
|---|---|
| Opportunity → registry row mapper | `customerName` via `borrowerDisplayNameOrDash` |
| Opportunity context remember | Uses identity helper |
| Opportunity runtime adapter | `customerId` / `customerName` from borrower identity |
| Opportunity loan structure | Primary participant from identity helper |
| Start from Company | Company name SSOT; legacy `primaryContactName` denorm retained |
| Opportunity API GET | `findActive` + search by `companyId`; q matches `companyName` |
| Opportunity service / repository | `findActiveForCompanyProduct` exposed; search filters `companyId` |

### Deal Registry & pipeline

| Module | Change |
|---|---|
| Deal API client type | `companyId`, `companyName`, `primaryBorrowerKind` |
| Deal create body | Company borrower fields |
| Deal create from Opportunity | Snapshot + stamps via identity helper |
| Deal → LoanFile stub | Party id/name from `resolveDealBorrowerIdentity` |
| Deal → registry row | `borrowerName` via helper |
| Deal pipeline runtime context | Customer from helper |
| Deal serialize | Emits `companyName` / `primaryBorrowerKind` from snapshot + `companyId` |
| Deal repository snapshot | Includes company + kind stamps |
| Move to Deal / ensure loan workspace | Seeds via identity helper |
| Primary write validation copy | No longer equates customerId to primaryContactId blindly |

### Action Center / participants

| Module | Change |
|---|---|
| `resolve-participants` | Customer identity `identity:company:` \| `identity:contact:` |
| Deal Action Center | Customer name from deal borrower identity |

### UI / workspaces

| Screen / pack | Change |
|---|---|
| Opportunity Creation stage | Display name via helper |
| Opportunity Workspace context | Contact load only when `primaryContactId` present; company does not treat `customerId` as contact |
| Borrower party sections | Labels via helper |
| Document Requests panel | Customer name from opportunity borrower identity |
| Opportunity context picker | Labels/search via helper |
| Lead Information | Header borrower via helper |
| Loan Journey / Execution Hub navigator | Contact **or** Company copy + display via helper |
| Deal Workspace host | ETE `borrowerName` via helper |
| LIFE / Move-to-Deal seeds | Via helper |

### Modules reviewed — already projection-safe or no contact-borrower assumption

| Area | Notes |
|---|---|
| Dashboard / Fresh Logins / Visual analytics | Consume registry `customerName` (now company-aware via mapper) |
| My Opportunities | Registry mapper SSOT |
| My Deals | Deal registry mapper SSOT |
| RM Workspace | Composes Opportunity/Deal/ETE — no parallel contact-as-borrower formula |
| Mission Control / EBI | Compose layer; no Primary Borrower == Contact assumption found |
| Customer Engagement | Token/portal projection; not Opportunity primary-contact gated |
| Tasks (ETE) | Optional `contactId`; borrowerName supplied by callers (now migrated) |
| Contact Strategy / Relationship Graph | Contact-centric by design (relationship graph of Contacts); Company borrower uses Company Workspace + representatives |
| Reports | Consume registry projections |

## Prisma / schema

No new migration in CO-DOM-001A. Relies on CO-DOM-001:

- `OpportunityPrimaryBorrowerKind`
- Nullable `primary_contact_id`
- `company_id` / `company_name` on Opportunity
- `company_id` on Deal

Deal lacks a dedicated `company_name` column; display uses snapshot stamps + serialize enrichment + denormalized display stamp where needed.

## Success criteria

| Criterion | Status |
|---|---|
| No code path assumes Primary Borrower == Contact for display/party id | ✅ Migrated via SSOT helper |
| Individual + Company both resolve correctly | ✅ |
| Compilation consistency via domain model | ✅ (`tsc --noEmit`) |
| Static verify | ✅ `npm run dom:borrower:verify` |

## Manual BAT checklist

1. Start Loan Journey from **Contact** → Draft Opportunity → Lead Information → Opportunity Workspace — Individual borrower labels correct.
2. Start Loan Journey from **Company** → Draft with null `primaryContactId` → Hub / Lead Information / OW show **company name**.
3. My Opportunities row shows company name (not blank / not “—”).
4. Move to Deal from company Opportunity → My Deals / Deal Workspace show company borrower.
5. Document Requests / Action Center customer chip uses company name for company Opportunities.
6. Representatives remain Contacts; do not auto-become applicants.

## Architectural decisions

1. Single projection module — change-once for borrower display/party identity.
2. Session/context carry `companyId` + `partyId` without forcing a Contact.
3. Deal serialize derives `primaryBorrowerKind` / `companyName` from working snapshot when columns are absent.
4. No second customer registry — ECM Contact + ECM Company remain SSOTs.

## Follow-ups (non-blocking)

- Optional Prisma `company_name` / `primary_borrower_kind` columns on `EnterpriseDeal` (today snapshot + serialize).
- Lead Information form field variants for company underwriting (called out in CO-DOM-001).
- Relationship Graph company-centric view (separate UX programme).

# Catalyst Connect — Initial Data Collection (IDC) Synchronisation

**Status:** Implemented locally · Programme **CO-WP-IDC-001**  
**Constitution:** Catalyst Connect SSOT (PO frozen)

## Objective

Zero differences between Catalyst One Initial Data Collection and Catalyst Connect Initial Data Collection.

## SSOT (Catalyst One)

| Concern | Path |
|---------|------|
| Types | `src/types/enterprise-initial-data-collection.ts` |
| Catalog | `src/constants/enterprise-initial-data-collection/` |
| Resolve / validate / defaults | `src/lib/enterprise-initial-data-collection/` |
| Partner projection | `GET /api/partner/opportunity-journey/config` |

## Connect consumption

- Loads journey/IDC config from Partner Gateway.
- Renders `customerCapture` + `detailSections` only.
- No Connect-local field masters for PAN, DOB, employment, company, amount, BT fields, etc.
- Field order, required, help text, defaults, validation, and conditional visibility come from the DTO.

## Change-once guarantee

Add / remove / modify a field in `ENTERPRISE_IDC_DETAIL_SECTIONS` (or customer capture) → Partner API returns the change → Connect renders it without a companion form release.

## Acceptance

- [ ] Same product + borrower type → same visible fields in Connect as Enterprise IDC catalog
- [ ] Required / help / validation / BT conditional fields match catalog
- [ ] Removing a field from Catalyst One catalog removes it from Connect after config reload
- [ ] No Source field; no Connect-only onboarding fields

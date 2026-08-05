# Catalyst Connect — Lightweight Customer Workspace

**Programme:** CO-WP-CUSTOMER-001 (extends CO-WP-JOURNEY-003)  
**Status:** Implementation complete (local) — no deploy unless PO requests  
**Constitution:** Connect is presentation only; Enterprise Customer Registry is SSOT.

## Directive

Create a lightweight Customer Workspace showing:

- Customer Profile  
- Contact Information  
- Active Opportunities  
- Previous Opportunities  
- Uploaded Documents  
- Notes  
- Tasks  
- Follow-up Timeline  
- Communication History  

Customer data must come from the **Enterprise Customer Registry**.  
Do **not** create a duplicate customer database inside Catalyst Connect.

## Architecture

| Layer | Responsibility |
|---|---|
| ECM Contact Registry | Customer identity SSOT |
| Partner Gateway | Projects workspace DTO (`composePartnerCustomerWorkspace`) |
| Connect | Renders DTO only |

## SSOT paths (Catalyst One)

| Concern | Path |
|---|---|
| Types | `src/types/enterprise-partner-customer-workspace.ts` |
| Compose | `server/services/partner-gateway/partner-customer-workspace.compose.ts` |
| API | `GET /api/partner/customers` · `GET /api/partner/customers/:customerId` |
| Wire-in | `partnerBusinessService.getCustomerWorkspace` / `listCustomerDirectory` |

## Connect surfaces

| Route | Content |
|---|---|
| `/app/customers` | Directory (ECR-enriched when linked) |
| `/app/customers/:id` | Workspace shell |
| Profile | Customer Profile + Contact Information |
| Opportunities | Active + Previous |
| Documents | Uploaded documents projection |
| Notes / Tasks / Follow-up / Communication | Enterprise projections |

## Privacy

PAN / Aadhaar / KYC identifiers are **never** exposed to Connect.

## Acceptance

- Workspace communicates customer relationship without enterprise OS complexity.  
- No Connect-local customer datastore.

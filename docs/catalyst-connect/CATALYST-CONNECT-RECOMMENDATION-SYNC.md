# Catalyst Connect — Recommendation Engine Synchronisation

**Status:** Implemented locally · Programme **CO-WP-REC-001**  
**Constitution:** Catalyst Connect SSOT (PO frozen)

## Principle

Catalyst Connect shall **never** maintain its own recommendation logic.

After Initial Data Collection, Connect invokes Catalyst One Recommendation Engine via Partner Gateway and renders the returned customer-friendly cards exactly.

## SSOT

| Concern | Path |
|---------|------|
| Ranking formula | `recommendPublishedLendersFromRegistryAsync` (Enterprise Lender Registry) |
| Partner projection | `src/lib/enterprise-partner-recommendations/` |
| Presentation config | `src/constants/enterprise-partner-recommendations/` |
| API | `GET /api/partner/opportunities/:id/recommendations` |

## Never exposed to Wealth Partners

- Credit Workbench  
- Credit Score / CIBIL values  
- Risk Engine  
- Policy Engine internals  
- Internal lender numeric scores / confidence / stars  

## Journey order

Customer → Borrower Type → Product → Initial Data Collection → **Recommendations** → Documents → …

## Connect behaviour

1. Persist IDC draft Opportunity  
2. Call Partner recommendations API  
3. Render DTO cards / guidance / presentation copy from Catalyst One  
4. Continue to Documents  

Docs companion: constitution rule updated under Catalyst Connect SSOT.

# Catalyst Connect — List of Documents (LOD) Synchronisation

**Status:** Implemented locally · Programme **CO-WP-LOD-001**  
**Constitution:** Catalyst Connect SSOT (PO frozen)

## Principle

Document requirements must be inherited entirely from Catalyst One.  
Catalyst Connect never invents checklists or lets Wealth Partners choose required document types.

## Drivers (Enterprise)

- Product (code / label → EDIE)
- Borrower type / employment / constitution
- Transaction type (Fresh / Balance Transfer)
- Recommendation context (display alignment only — does not invent documents)
- Enterprise Product Configuration via **EDIE Certified Checklist** (`generateOpportunityLod`)

## Partner API

`GET /api/partner/opportunities/:id/documents` → `{ lod, documents }`  
`POST /api/partner/opportunities/:id/documents` → `{ typeRef, title?, replaceDocumentId? }`

## Connect UX

Each LOD item supports: **Upload · Replace · Preview · Status · Missing indicator**

## Removed

- Partner Gateway `REQUIRED_DOCS` hardcoded map  
- Wealth Partner `PRODUCT_REQUIRED_DOCUMENTS` heuristic  
- Free-text partner-chosen document category upload  

## SSOT paths

| Concern | Path |
|---------|------|
| EDIE resolve | `src/lib/document-requests/generate-lod.ts` |
| Partner projection | `src/lib/enterprise-partner-lod/` |
| Presentation | `src/constants/enterprise-partner-lod/` |

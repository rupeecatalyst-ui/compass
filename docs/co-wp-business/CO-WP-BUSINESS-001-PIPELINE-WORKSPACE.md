# CO-WP-BUSINESS-001 — My Business Pipeline Workspace

Status: **Product Owner Architecture · Implementation Ready for BAT**  
Priority: **CRITICAL**  
Deployment: **None** — await Product Owner BAT  

## Purpose

Primary operational screen for Wealth Partners answering:

> What business requires my attention today?

Work management — not MIS. Catalyst One owns pipeline intelligence; Wealth Partner App renders Enterprise DTOs.

## Surfaces

| Block | Behaviour |
|-------|-----------|
| Header | My Business · date · greeting · today's priority count · search · quick filters |
| Pipeline cards | 8 stage buckets with count · value · trend · tap to filter list |
| Today's Priorities | Calls · meetings · follow-ups · documents · overdue → Opportunity Workspace |
| Next Best Actions | Enterprise recommendations (presentation only) |
| My Opportunities | Customer · product · amount · stage · sub-stage · health · NBA → certified OW |
| Empty states | Premium copy for no opportunities / follow-ups / documents / tasks / search |

## Ownership

| Concern | Owner |
|---------|--------|
| Pipeline · workflow · stages · health · tasks · priorities · NBA · search projection | **Catalyst One** |
| Workspace UI | **Wealth Partner App** |

## API

`GET /api/partner/business-pipeline` → `PartnerBusinessPipelineDto`

Service: `partnerBusinessService.getBusinessPipeline`  
Constants: `src/constants/enterprise-partner-business-pipeline.ts`  
Types: `src/types/enterprise-partner-business.ts`

Companion: `/app/business` → `BusinessHubScreen` (Pipeline Workspace)  
Client: `partnerBusinessPipeline` · `usePartnerBusinessPipeline`

## Non-goals (this sprint)

- Do not redesign Opportunity Workspace / Create Journey / Customer Workspace  
- Do not begin Enterprise Experience Center / EEE  
- Do not implement Partner Tier Engine / Entitlements  
- Do not deploy to Vercel  

## BAT-002 exception

Scoped PO architecture sprint under BAT-002 freeze. Broader freeze otherwise remains.

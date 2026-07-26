# CO-ARCH-003 Phase 2B — Sprint 1 Plan

**Status:** IN PROGRESS  
**Authority:** Phase 2B authorized after Phase 2A Business Certification  
**Boundary:** Sprint 1 only — do not implement Sprints 2–4 in this cut

## Scope (frozen for this sprint)

1. **Deal Workspace refinement** — header/identity shows independent Deal + Opportunity references; Deal-centric metadata band
2. **Commission Payer (Payee) as Deal attribute** — first-class fields on `enterprise_deals` (not LoanFile-only)
3. **Deal metadata** — persist/display commission payee + core Deal identity on workspace
4. **Stage validations** — server-side lender pipeline transition matrix (BI-4 Deal stages)

## Out of scope

- Opportunity Workspace lender-field removal (Sprint 2)
- Product Library / Security Type (Sprint 3)
- Chanakya Context Intelligence (Sprint 4)
- New `/deals/:dealId` route (optional later; refine existing Loan Workspace as Deal desk)

## Implementation approach

- Additive Prisma columns: `commission_payee_type`, `commission_payee_specify`
- Wire create/update/serialize + LoanFile dual-write map
- Loan Workspace header: `DEAL-*` · `OPP-*` · lender · stage
- `validateStageTransition` uses frozen `LENDER_CASE_STAGES` progression + terminal gates

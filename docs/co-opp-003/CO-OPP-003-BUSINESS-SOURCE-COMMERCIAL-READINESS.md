# CO-OPP-003 — Business Source & Commercial Participation

## Scope

Additive Opportunity capture + Wealth Partner Commercial Profile. No Contact/Company/Deal/Loan Workspace architecture changes. No production data migration.

## Delivered

1. Canonical Business Sources: Direct, Wealth Partner, No Cost Referral, Marketing, Walk-in, Employee Referral, Existing Customer
2. Dynamic Lead Information form behaviour (hide/show Source Name, Campaign, Referrer, Participation Role)
3. Wealth Partner Registry lookup for Source Name (not type pickers)
4. Participation Role mandatory only for Wealth Partner: Referral / Sole Executor / Joint Executor
5. Commercial Profile on WP tab (RC revenue % by role) — replaces manual commission structure UI
6. Auto-resolve `commercialRevenueSharePercent` on Opportunity save from Commercial Profile
7. Reporting dimension constants for Mission Control / MIS
8. Legacy source codes remain readable for KPI/display (zero regression)

## Persistence (additive)

- Opportunity: `source_wealth_partner_id`, `participation_role`, `commercial_revenue_share_percent`, `source_campaign_label`
- Wealth Partner: commercial share % fields + effective from + status

## Manual ops

Apply migration `20260728200000_co_opp_003_business_source_commercial` on production Postgres.

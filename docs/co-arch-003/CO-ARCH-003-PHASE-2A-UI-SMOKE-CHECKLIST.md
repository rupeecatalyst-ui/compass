# CO-ARCH-003 Phase 2A — Post-Certification UI Smoke Checklist

**Date:** 2026-07-24  
**Status:** Operational confidence check (non-blocking for Phase 2A certification)  
**Authority:** Business Certification APPROVED

## Scope

Manual / operator smoke after Phase 2A Business Certification. Not a blocker for certification.

## Pre-conditions

- Pilot DB schema up to date (Phase 2A migration applied)
- E2E seed available: Opportunity `OPP-2026-000001` with Deals HDFC / SBI / ICICI
- Auth: Business Certification Admin unchanged (`admin@compass.com`)

## Checklist

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Create Contact | Contact saved in Contacts / ECM | ⬜ Operator |
| 2 | Create Opportunity (requirement; no lender) | Opportunity number `OPP-*`; **no** Deal required | ⬜ Operator |
| 3 | Create multiple Deals (assign lenders) | Distinct `DEAL-*` rows; same Opportunity | ⬜ Operator |
| 4 | Opportunity Registry / API | Opportunity listed; child Deals via `/api/enterprise-opportunities/:id/deals` | ⬜ Operator |
| 5 | My Deals | One row **per lender Deal**; Deal ID ≠ Opportunity ID | ⬜ Operator |
| 6 | Deal / Loan Workspace | Opens for selected Deal; header shows customer + product + amount | ⬜ Operator |
| 7 | Kanban movement | Lender pipeline drag/gates still work (login probe, etc.) | ⬜ Operator |
| 8 | Opp / Deal references | OPP and DEAL labels independent where dual-write populated | ⬜ Operator |
| 9 | No UI regressions | Contacts, My Deals, Loan Workspace, Credit Bench load | ⬜ Operator |

## Automated confidence (already run)

| Check | Status |
|-------|--------|
| Migration applied | ✅ |
| Backfill (empty legacy set) | ✅ |
| DB E2E Contact → Opp → 3 Deals | ✅ 20/20 |
| Schema verify | ✅ |

## Known UI gaps (expected pre–Sprint 1–3)

- No dedicated `/deals/:dealId` route yet — Deal desk remains `LoanWorkspaceModal`
- Opportunity Registry is API-first; `/opportunities` is Strategic Workspace
- Commission Payee still LoanFile-primary until Phase 2B Sprint 1

## Sign-off

Operator: __________________  Date: __________

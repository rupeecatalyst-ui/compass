# CO-ORG-007 — Enterprise Navigation Inventory

**Date:** 2026-08-07  
**SSOT:** `src/config/navigation.ts` · `src/constants/routes.ts` · `src/constants/administration-console.ts`  
**Deployment:** Not performed

## Primary navigation (Column 1)

| # | Module | Route | Page | Nav grade |
|---|--------|-------|------|-----------|
| 1 | Dashboard | `/dashboard` | ✅ | **PASS** — User Home |
| 2 | CHANAKYA Radar | `/chanakya-radar` | ✅ | **PASS** |
| 3 | Contacts | `/contacts` | ✅ | **PASS** — Party Registry |
| 4 | My Opportunities | `/my-opportunities` | ✅ | **PASS** — Opportunity Registry |
| 5 | My Deals | `/my-deals` | ✅ | **PASS** — Deal Registry |
| 6 | Loan Journey | `/loan-journey?entry=dashboard` | ✅ | **PASS** — Execution Hub |
| 7 | Investments | `/investments` | ✅ | **SOON** — Coming soon placeholder · badge `Soon` |
| 8 | Tasks | `/tasks` | ✅ | **PASS** — ETE desk |
| 9 | Documents | `/document-center?entry=dashboard` | ✅ | **PASS** — Document Center |
| 10 | Enterprise Lender Directory | `/lenders` | ✅ | **PASS** |
| 11 | Wealth Partners | `/wealth-partners` | ✅ | **PASS** |
| 12 | Accounting | `/accounting` | ✅ | **PASS** (route live; SSOT unbound — separate programme) |
| 13 | Mission Control | `/mission-control/executive-briefing` | ✅ | **PASS** entry |
| 14 | Horizon | `/horizon` | ✅ | **PASS** |
| 15 | Administration | `/admin` | ✅ | **PASS** · roles SUPER_ADMIN + ADMIN |
| 16 | Settings | `#` folder → `/settings#…` | ✅ | **PASS** context panel |

**Dead primary hrefs:** none.

## Registries reachable from navigation

| Registry | Route | Via |
|----------|-------|-----|
| Contacts (ECM) | `/contacts` | Primary |
| Opportunity Registry | `/my-opportunities` | Primary |
| Deal Registry | `/my-deals` | Primary |
| Enterprise Lender Directory | `/lenders` | Primary (+ Admin console tile) |
| Wealth Partners | `/wealth-partners` | Primary |
| Lender Registry (admin) | `/admin/lender-registry` | Admin console |
| Wealth Partner Registry (admin) | `/admin/wealth-partner-registry` | Admin console |
| Product Library / Master | `/admin/product-library*` | Admin console |
| Enterprise MDM / Lookup Masters | `/admin/enterprise-mdm`, `/admin/reference-masters` | Admin console |
| Document Types | `/admin/document-types` | Admin console |

## Dashboards

| Dashboard | Route | Grade |
|-----------|-------|-------|
| User Home Dashboard | `/dashboard` | PASS |
| CHANAKYA Radar | `/chanakya-radar` | PASS |
| Mission Control Executive Briefing | `/mission-control/executive-briefing` | PASS |
| Horizon | `/horizon` | PASS |
| Shadow Mode Dashboard | `/admin/shadow-mode-dashboard` | PASS (admin) |
| Enterprise Metrics | `/admin/enterprise-metrics` | PASS (admin) |

## Intentional redirects (not dead)

| Legacy route | Resolves to |
|--------------|-------------|
| `/pipeline` | `/chanakya-radar` |
| `/documents` | `/document-center` |
| `/loan-files` | Deal Workspace / Loan Journey / My Deals |
| `/deals` (no id) | My Deals / Deal Workspace shell |
| `/ai-assistant` | `/sarathi` |

## Mission Control rail (enabled)

| Module | Route | Registry status |
|--------|-------|-----------------|
| CHANAKYA Radar | `/mission-control` | scaffold (UI real) |
| CHANAKYA Intelligence | `/mission-control/chanakya-intelligence` | active |
| Executive Dashboard | `/mission-control/executive-briefing` | active |
| Enterprise Intelligence | `/reports` | active |
| Situation Room | `/mission-control/situation-room` | **scaffold** |
| Alert Center | `/mission-control/alert-center` | **scaffold** |
| Search Center | `/mission-control/search` | **scaffold** |
| Security Operations | `/mission-control/security-operations` | **scaffold** |
| Observability | `/mission-control/observability` | **scaffold** |
| Operations Intelligence | `/mission-control/operations-intelligence` | **scaffold** |
| Relationship Heat Map | `/mission-control/relationship-heat-map` | **scaffold** |
| Settings | `/mission-control/settings` | **scaffold** (`[module]` catch-all) |

Planned/preview modules (not enabled in rail): Dashboard alias, AI Control Tower, Configuration, Command Console, Mission Replay, Digital Twin, Audit.

## Organization children

All 12 `/organization/*` routes resolve to pages. Layout gate: **SUPER_ADMIN only**.

## Administration console

Tiles in `administration-console.ts` resolve to pages. Set is a **superset** of `administrationChildren` (extra: Universal 360°, Geography Regions, Product Master, workflow/credit sub-desks, ops lender/partner tiles, `/reports`).

## Permissions snapshot

| Surface | Allowed roles |
|---------|---------------|
| Primary Administration item | SUPER_ADMIN, ADMIN |
| `/admin/*` layout | SUPER_ADMIN, ADMIN |
| `/organization/*` layout | SUPER_ADMIN only |
| Command palette org/admin groups | SUPER_ADMIN only (drift vs sidebar) |

## Placeholder / Soon

| Item | Classification |
|------|----------------|
| Investments primary nav | **SOON** — intentional Architecture Freeze placeholder |
| Settings Preferences / Notifications copy | Soft stub anchors on live `/settings` page |
| MC scaffold modules | Routes live; product incomplete |

# CO-C1-DASH-001 — Catalyst One Executive / Operational Dashboard Redesign

**Status:** Implementation complete · **No Vercel deploy** · Awaiting Product Owner review  
**Date:** 2026-08-11  
**Scope:** Catalyst One only — Wealth Partner App untouched · No Lead entity · No production data mutation

---

## 1. Existing dashboard files identified

| Item | Path |
|------|------|
| Route | `/dashboard` — `src/app/(dashboard)/dashboard/page.tsx` |
| Shell | `UserHomeDashboard` — `src/components/catalyst-one/user-home-dashboard/user-home-dashboard.tsx` |
| Prior top sections | `TodayNewCreationSection`, `FreshLoginsSection`, `VisualAnalyticsPack`, `NewArrivalsSection`, `RmWorkspacePack` |
| Nav | Unchanged — primary “Dashboard” → `/dashboard` |

---

## 2. Components changed

| File | Change |
|------|--------|
| `user-home-dashboard.tsx` | Reordered into command-center hierarchy; full desktop width (`max-w-[100rem]`) |
| `index.ts` | Export new sections |
| Opportunity search API / client / repository | Additive `createdFrom` / `createdTo` / `orderBy` filters (createdAt only) |
| Wealth Partner list API / client / repository | Additive `createdFrom` / `createdTo` for New Partners KPI |
| New Arrivals presets | Added **Last 3 Days**; default period → **Today** |

---

## 3. Components added

| Component | Role |
|-----------|------|
| `NewOpportunitiesSection` | Summary + auto-scroll feed |
| `NewArrivalsPulseSection` | New Partners / New Contacts KPI pulse |
| `AttentionRequiredSection` | ETE/RM priorities |
| `MyAssignedDealsSection` | Assigned Deal Registry list |
| `MyPipelineSection` | Journey stage buckets |
| `MyPerformanceSection` | EBI/ETE metrics |
| `ChanakyaInsightsSection` | RM briefing projection |
| `command-center/*` libs | Attention derive, loaders |

---

## 4. Sections created (order)

1. New Opportunities  
2. New Arrivals (RBAC: Admin / Manager / Super Admin)  
3. Attention Required  
4. My Assigned Deals  
5. My Pipeline  
6. My Performance  
7. Business Intelligence (`FreshLoginsSection` + `VisualAnalyticsPack`)  
8. CHANAKYA Insights  

`TodayNewCreationSection` and `RmWorkspacePack` are **no longer mounted** on `/dashboard` (logic retained in tree for rollback).

---

## 5. Data sources per section

| Section | SSOT |
|---------|------|
| New Opportunities | `GET /api/enterprise-opportunities?createdFrom&createdTo&orderBy=createdAt` |
| New Arrivals — Partners | Wealth Partner Registry `createdAt` |
| New Arrivals — Contacts | ECM Contact `createdOn` / API `createdFrom`–`createdTo` |
| Attention Required | `composeRmWorkspaceSnapshot` → `deriveRmPriorities` (ETE) |
| My Assigned Deals | `loadMyDealsDealRegistryRows` + `filterDealRegistryRows(scope: my_deals)` |
| My Pipeline | Same Deal rows + `deriveJourneyProgressSegments` + EBI pipeline KPIs |
| My Performance | `projectRmPipeline` / `projectRmProductivity` via RM compose |
| Business Intelligence | Existing visual analytics / Fresh Logins |
| CHANAKYA Insights | `deriveRmDailyBriefing` |

---

## 6. New Opportunity attention logic

Derived from **Opportunity lifecycle** (no new status field):

| Status | Rule |
|--------|------|
| **Unattended** | `dialogue` / `draft` with no progressed requirement stage |
| **Pending** | `requirement_captured` / `on_hold` (or dialogue with progressed stage) |
| **Actioned** | `in_progress` / `converted_to_deal` / terminal outcomes |

---

## 7. New Partner calculation

Count Wealth Partner Registry rows with `createdAt` in selected range (not `updatedAt`).  
Breakdown by existing `partnerType`.  
Delta vs previous equal-length period.

---

## 8. New Contact calculation

Count ECM Contacts with `createdOn` / API created range.  
**No separate Customer KPI** (Contact is the identity — avoids double-count).  
Breakdown by existing ECM roles (Customer / Partner / Investor / …) — Contact has no mandatory opportunity-style source field.

---

## 9. Source attribution logic

Opportunity feed uses existing `sourceCode` + `sourceContactName` via business-source helpers.  
Direct → “COMPASS / Direct Customer”. Missing name → **Not Specified** (never invented).

---

## 10. Filters implemented

- New Opportunities / New Arrivals: Today · Last 3 · Last 7 · Last 30 · Custom  
- My Assigned Deals: Search · Lender · Stage · Product · `my_deals` scope  

---

## 11. Auto-scroll implementation

Viewport scrolls bottom→top at ~1px / 60ms; pauses on hover and for 4s after row interaction/focus. Newest rows sorted to the bottom of the feed.

---

## 12. Click-through routes

| Click | Destination |
|-------|-------------|
| New Opportunity row / Open → | Existing Opportunity Workspace |
| New Partners KPI | `/wealth-partners?createdFrom&createdTo` |
| New Contacts KPI | `/contacts?dateCreatedFrom&dateCreatedTo` |
| Attention item | Existing ETE priority href |
| Assigned Deal / Open → | Existing Deal Workspace |

---

## 13. Performance impact

- Opportunity list: one ranged search (limit 100) — **no N× getOpportunity**  
- Partners: one paged WP query with createdAt bounds  
- Contacts: one ECM query (`pageSize` 100 for breakdown; total from API)  
- Deals: summary load reused pattern from My Deals (Assigned + Pipeline each load once — documented dual fetch)  
- Attention / Performance / Chanakya: sync RM compose (client)  

No entitlement fan-out or full-table Opportunity hydration added.

---

## 14–17. Verification

| Gate | Result |
|------|--------|
| `scripts/co-c1-dash-001-verify.mjs` | ✅ PASS |
| TypeScript (`tsc --noEmit`) | ✅ PASS |
| Lint (new dashboard files) | ✅ PASS |
| Build (`npm run build`) | ✅ PASS |
| Wealth Partner App | ❌ Not modified |
| Vercel deploy | ❌ Not performed |
| Production data | ❌ Not modified |

---

## 18. Limitations (honest)

1. **New Opportunities** list is org-scoped (same as prior today-new KPIs) — not RM-server-filtered; Assigned Deals / Attention use user scope.  
2. **Contact source mix** (Direct / WP / Walk-in) is not on ECM Contact — role breakdown shown instead.  
3. **SLA column** on Assigned Deals often `—` when Deal Registry `tatDays` is unset.  
4. **Age/SLA** on Attention uses priority **score** (ETE priority SSOT) rather than inventing age clocks.  
5. Wealth Partners registry UI may not yet auto-apply `createdFrom` query params — drill lands on registry with params for follow-up wiring.  
6. `RmWorkspacePack` / `TodayNewCreationSection` unwired but not deleted.

---

**STOP FOR PRODUCT OWNER REVIEW — NO VERCEL DEPLOYMENT.**

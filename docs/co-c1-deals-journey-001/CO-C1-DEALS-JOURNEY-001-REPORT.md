# CO-C1-DEALS-JOURNEY-001 — Catalyst One My Deals → Lender Journey View

**Status:** Implementation complete · **No Vercel deploy** · Awaiting Product Owner review  
**Date:** 2026-08-11  
**Scope:** Catalyst One only — Wealth Partner App untouched

---

## 1. Existing My Deals implementation identified

| Item | Path |
|------|------|
| Route | `/my-deals` — `src/app/(dashboard)/my-deals/page.tsx` |
| Nav | Primary nav “My Deals” → `ROUTES.MY_DEALS` (`src/config/navigation.ts`) |
| Mount | `MyDealsWorkspace` — `src/components/catalyst-one/my-deals/my-deals-workspace.tsx` |
| Prior UI | `OpportunityDealRegistry` + `OpportunityGroupedRegistry` (compact expandable table) |
| Data | `loadMyDealsDealRegistryRows` / enrich → `GET /api/enterprise-deals` → `DealRegistryRow[]` → `groupDealRowsByOpportunity` |

**Replacement:** Loans tab now mounts `DealLenderJourneyBoard` instead of `OpportunityDealRegistry`. Route and nav unchanged.

---

## 2. Components replaced / refactored

| Change | Detail |
|--------|--------|
| Replaced mount | `OpportunityDealRegistry` → `DealLenderJourneyBoard` in `my-deals-workspace.tsx` |
| Navigation split | Customer header → Opportunity Workspace; lender row → Deal Workspace |
| Retained | Data load path, filters engine (`filterDealRegistryRows`), grouping SSOT, business vertical tabs |

`OpportunityDealRegistry` / `OpportunityGroupedRegistry` remain in the codebase (unused by My Deals path) for safe rollback — not wired in nav.

---

## 3. New Journey components

| Component | Role |
|-----------|------|
| `DealLenderJourneyBoard` | Filters + KPI strip + list of Opportunity cards |
| `OpportunityLenderJourneyCard` | One customer/Opportunity card; lenders as **rows** |
| `LenderJourneyRailway` | Shared-axis Gantt / railway track (● / ◉ / ○ + Hold/Lost) |
| `lender-deal-contact.ts` | Lender contact display resolve → **Unassigned** if missing |

---

## 4. Files changed

- `src/components/catalyst-one/my-deals/my-deals-workspace.tsx`
- `src/components/catalyst-one/my-deals/deal-lender-journey-board.tsx` *(new)*
- `src/components/catalyst-one/my-deals/opportunity-lender-journey-card.tsx` *(new)*
- `src/components/catalyst-one/my-deals/lender-journey-railway.tsx` *(new)*
- `src/lib/my-deals/lender-deal-contact.ts` *(new)*
- `src/components/catalyst-one/my-deals/index.ts`
- `scripts/co-c1-deals-journey-001-verify.mjs` *(new)*
- `docs/co-c1-deals-journey-001/CO-C1-DEALS-JOURNEY-001-REPORT.md` *(this file)*

---

## 5. Data sources used

| Concern | SSOT |
|---------|------|
| Deals | Enterprise Deal Registry API (`loadMyDealsDealRegistryRows`) |
| Grouping | `groupDealRowsByOpportunity` (CO-ARCH-007: one Deal per lender) |
| Stages | `ENTERPRISE_JOURNEY_SEGMENTS` / `deriveJourneyProgressSegments` |
| Filters | Existing `DealRegistryFilters` + `filterDealRegistryRows` |
| KPIs | Counts from filtered Deal rows (Opportunities, Active Deals, Loan Value via existing `formatLoanValueTotal`, In Approval / Disbursed / Lost·Hold from journey derive) |

**No new Lead / Deal / Opportunity / Journey tables or APIs.**

---

## 6. Lender employee source

Resolved in order (first non-empty wins):

1. `lendingExtension` keys: `lenderContactName`, `lenderEmployeeName`, `bankRmName`, `lenderRmName`, `contactPersonName`, `lenderOfficerName`
2. `creditExecutive` when not placeholder
3. Else **`Unassigned`** (never invented)

---

## 7. Workspace navigation

| Click | Destination |
|-------|-------------|
| Customer / Opportunity header | `buildOpportunityWorkspaceEntryHref({ id: opportunityId })` |
| Lender row **Workspace →** | `buildDealWorkspaceHref({ dealId, opportunityId, tab: "lenders" })` |
| Missing opportunityId (legacy) | Falls back to preferred Deal Workspace |

---

## 8. Performance impact

- Same summary → enrich progressive load as before (CO-PERF-002)
- No per-lender `getOpportunity` fan-out
- No extra ECM customer scans
- Client group/filter only over already-loaded Deal rows
- **Expected:** neutral vs prior My Deals list cost; UI denser but same API profile

---

## 9–12. Verification

| Gate | Result |
|------|--------|
| `scripts/co-c1-deals-journey-001-verify.mjs` | ✅ PASS |
| TypeScript (`tsc --noEmit`) | ✅ PASS (KPI `formatLoanValueTotal` call fixed) |
| Lint (journey files + workspace) | ✅ PASS |
| Build (`npm run build`) | ✅ PASS (prior session; `/my-deals` in route table) |
| Wealth Partner App | ❌ Not modified |
| Vercel deploy | ❌ Not performed |
| Production data | ❌ Not modified |

### Notes / known gaps (honest)

- **Business Source / Source Name** on Deal Registry rows are often `—` today (mapper placeholders). UI shows **Not Specified** rather than inventing values. Enriching from Opportunity Registry would be a follow-up data projection sprint.
- **Opportunities with zero Deals** do not appear — My Deals remains Deal Registry–indexed (CO-ARCH). Empty lender list UI exists if a group has no deals.
- Stage filter still uses existing PipelineStage filter ids for compatibility with `filterDealRegistryRows`.

---

## STOP

Awaiting Product Owner review. **No Vercel deployment.**

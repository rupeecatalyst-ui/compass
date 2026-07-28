# CO-PERF-002 — Enterprise API Optimisation & Request Reduction

**Status:** OPEN — Sprint A+B+C shipped; production RUM / auth probe still required for certification  
**Date:** 2026-07-28  
**Basis:** CO-PERF-001 measured unit cost ≈ **300 ms Prisma RTT / ~600 ms API-eq**  
**Auth:** Production cert login still `401` — counts below are **call-graph before/after** (not live HAR)

---

## Phase 1 — Journey API inventory (call-graph)

Unit: independent client network round-trips on a typical warm session path.

| Screen / step | BEFORE (est. requests) | AFTER Sprint A+B | Notes |
|---------------|-----------------------:|-----------------:|-------|
| Dashboard | 2–4 (EME or Opp+Deal lists) | 2–4 | EME preferred; TanStack shared keys deferred |
| Contacts hydrate | **2 + N links** (N=companies) | **2** | Links deferred to company open |
| My Deals | 1 full list (heavy snapshot) | **1 summary** + bg full enrich | Progressive Phase 1/2 |
| Deal Workspace open | warm + parallel siblings | **1 bootstrap** `?include=siblings` | −1 RTT typical |
| Opportunity Workspace open | 1 Opp GET + **1 Deal list 100** | **1 Opp** (warm paint) · Deal list skipped when oppId known | Remount no longer blocks on cold gate |
| Opportunity Creation stage | +1 Opp GET | 0 blocking (warm) / 1 bg | Uses session |
| Strategy Workbench | lender search 1–2 | 1–2 | Cap 200 already |
| Move to Deal (2 lenders) | invalidate+200 + **2 sequential creates** + mark | warm catalogue + **2 parallel creates** + mark | −1 catalogue refetch; −1 RTT wall |
| Deal Workspace open | 3 sequential → Sprint A parallel | warm + parallel siblings | Sprint A |
| Identify Additional Lender | Opp GET + create + **full reload 3 GET** | warm Opp + create + **merge** | −3–4 RTT |
| Pipeline Save (stage) | transition+PATCH+**reload 3** | transition+PATCH+**merge** | Sprint A |
| Pipeline Remove | sequential DELETE + reload | **parallel DELETE** + merge | Sprint B |
| Customer / Company open | (links already in memory) | **1** links GET on open | Lazy |
| Save / Refresh | varies | no full screen reload on stage save | Sprint A |

### Duplicate / sequential removals (Sprint B)

| Pattern | Action |
|---------|--------|
| Opportunity remount full loading gate | Warm session paint + background revalidate |
| OW always `loadDeals(pageSize=100)` | Skipped when `opportunityId` present |
| Creation stage duplicate GET | Session-first |
| Move to Deal `invalidatePublishedLendersSession` | Removed |
| Move to Deal sequential creates | `Promise.all` |
| Identify lender full pipeline reload | Merge created Deal into runtime |
| Soft-delete sequential + forceRefresh reload | Parallel DELETE + local merge |
| Contacts N× `listCompanyLinks` | Deferred; `hydrateCompanyLinksFromPrisma` on company open |

---

## Before vs After (modeled request counts)

**Opportunity → Strategy → Move to Deal (2 lenders) → Deal open → Identify 3rd → Save stage**

| Metric | BEFORE (pre-PERF) | AFTER (A+B) | Δ |
|--------|------------------:|------------:|--:|
| Network RTTs (modeled) | ~18–22 | ~9–12 | **≈ −45%** |
| Move to Deal wall (2 creates) | ~1.2–2.4s seq | ~0.6–1.2s parallel | ~50% wall |
| Identify lender | ~4 RTT | ~1–2 RTT | ~50–75% |
| Contacts hydrate links | N (often 10–100+) | 0 on list | −N |

Payload: lender catalogue refetch avoided on Move to Deal; Deal list 100 skipped on OW with oppId.

---

## Cache / connection

| Item | Status |
|------|--------|
| Session Opportunity / Deal caches | Used more aggressively (warm paint) |
| TanStack Query for Opp/Deal | **Not yet wired** (provider exists) — Sprint C |
| Prisma singleton + TX maxWait | Already in `server/lib/prisma.ts` (CO-QA-005) |
| Vercel `connection_limit` | **Ops still pending** |

---

## Files modified (Sprint B)

- `src/lib/strategic-lender-pipeline/move-to-deal.ts`
- `src/lib/enterprise-deal/deal-pipeline-runtime.ts`
- `src/lib/enterprise-persistence/ecm-persist.ts`
- `src/lib/enterprise-persistence/index.ts`
- `src/components/catalyst-one/opportunity-workspace/opportunity-workspace-context.tsx`
- `src/components/catalyst-one/opportunity-workspace/opportunity-creation-stage.tsx`
- `src/components/catalyst-one/companies/company-workspace-modal.tsx`
- `scripts/co-perf-002-request-reduction-verify.mjs`
- This report

Sprint A (already live): `deal-pipeline-runtime` warm/parallel/save-merge · lender `pageSize` 200

---

## Response time targets (still OPEN)

| Workflow | Target | Modelled after A+B | Cert |
|----------|-------:|-------------------:|------|
| Dashboard | ≤2s | Improving | Needs RUM |
| Opportunity Workspace | ≤3s | Warm remount ≪3s | Needs RUM |
| Deal Workspace | ≤3s | ~1.2s warm | Needs RUM |
| Save | ≤3s | ~1.2–2.4s stage | Needs RUM |
| Move to Deal | ≤5s | Parallel 2-lender path | Needs RUM |
| Search | ≤1s | Unchanged | Needs RUM |

---

## Next (Sprint C — shipped this wave)

1. ~~TanStack Query shared keys~~ deferred  
2. ✅ Composite `GET /deals/:id?include=siblings` + client `bootstrapDealWorkspace`  
3. ✅ My Deals Phase 1 `view=summary` + Phase 2 background enrich  
4. ✅ Tier-0 master warm (products 15m · lenders session)  
5. ✅ Optimistic Kanban remove merge (no full reload)  
6. ✅ Deal Workspace tasks panel lazy (`<details>`)  
7. Contacts paged server search — still deferred  
8. Fix cert login → re-run RUM profile — still pending

---

## Sprint C files

- `server/services/enterprise-deal/deal-serialize.ts` (`serializeDealSummary`)
- `server/services/enterprise-deal/enterprise-deal.service.ts` (`view` + `include=siblings`)
- `src/lib/enterprise-deal/deal-api-client.ts` · `deal-pipeline-runtime.ts` · `deal-registry-port.ts`
- `src/components/catalyst-one/my-deals/my-deals-workspace.tsx`
- `src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx`
- `src/lib/enterprise-tier0-cache/index.ts`
- `src/layouts/dashboard-layout.tsx`
- `src/lib/enterprise-product-master/options.ts` (TTL 15m)

---

## Certification

**CO-PERF-002 remains OPEN** until production profiling shows ≥40% request reduction on the journey and targets are met with RUM evidence.

# CO-WP-PERF-003 — Performance Validation Deployment

**Classification:** `CO-WP-PERF-003 — PERFORMANCE VALIDATION DEPLOYMENT`  
**NOT** `CO-WP-CERT-001` · **NOT** certification  
**Date:** 2026-08-11  
**Scope:** Deploy verified CO-WP-PERF-002 working trees · measure AFTER · cache + regression checks  
**Mode:** No new functionality · no hot-fix · no schema change · no genuine production-partner data mutation  

---

## A. Deployment URLs

| App | Production URL |
|-----|----------------|
| Wealth Partner App | https://wealth-partner-app.vercel.app |
| Catalyst One Gateway | https://catalyst-one-two.vercel.app |

Deployment URLs:

| App | Deployment URL |
|-----|----------------|
| Wealth Partner | https://wealth-partner-8mhpfc4rr-rupee-catalyst.vercel.app |
| Gateway | https://catalyst-8co01yl0o-rupee-catalyst.vercel.app |

---

## B. Deployment IDs

| App | Deployment ID |
|-----|---------------|
| Wealth Partner | `dpl_CCfydL2P7BHNTaFx5H9pXxv6pMyw` |
| Catalyst One Gateway | `dpl_CdLLNf2z2rowQ6ewZMJzC7iixbdw` |

Inspect:

- WP: https://vercel.com/rupee-catalyst/wealth-partner-app/CCfydL2P7BHNTaFx5H9pXxv6pMyw  
- Gateway: https://vercel.com/rupee-catalyst/catalyst-one/CdLLNf2z2rowQ6ewZMJzC7iixbdw  

---

## C. Gateway deployment identity

| Field | Value |
|-------|--------|
| Project | `catalyst-one` |
| Branch (local) | `compass-hl03-conversation-first` |
| Git HEAD | `95973c596c9b370f957f9a137c1e42878d6454c5` + **uncommitted PERF-002 working tree** (deploy-from-local) |
| Alias | https://catalyst-one-two.vercel.app → READY |
| Persistence smoke | `GET /api/partner/health` → **ok / prisma** (1356 ms) |

WP package `v0.9.3` local working tree · `VITE_CATALYST_ONE_API_URL` → Gateway production.

---

## D. AFTER performance timings

**Partner:** WPDEMO001 (`wp-bat@rupeecatalyst.com`) — controlled BAT demo  

Primary AFTER capture (authenticated, production Gateway):

| Call | AFTER wall-clock | Server-Timing (Gateway) |
|------|------------------:|-------------------------:|
| Login | **9,123 ms** | — |
| `/auth/me` | **8,830 ms** | — |
| `/home?phase=shell` | **4,524 ms** | **3,881 ms** |
| `/home?phase=desk` | **12,503 ms** | **12,017 ms** |
| `/home` (full) | **10,121 ms** | **9,833 ms** |
| `/business-pipeline` | **8,200 ms** | **7,898 ms** |
| `/business-pipeline` #2 (within 30s) | **8,813 ms** | **8,550 ms** |
| `/notifications` | **46,149 ms** | — |

Evidence: `docs/co-wp-perf-003/CO-WP-PERF-003-AFTER-TIMINGS.json` (+ primary/cache artifacts).

Warm repeat (later regression run): shell **3,499 ms** (Server-Timing 3,182 ms).

---

## E. BEFORE vs AFTER comparison

| Call | BEFORE | AFTER | Delta |
|------|-------:|------:|------:|
| Login | 10.5 s | 9.1 s | ≈ **−13%** |
| `/auth/me` | 8.5 s | 8.8 s | ≈ flat (cold auth path) |
| `/home` | **38.1 s** | **10.1 s** (full) | ≈ **−73%** |
| `/home` first paint path | 38.1 s (blocked) | **4.5 s shell** | ≈ **−88%** to usable shell |
| `/business-pipeline` | 12.6 s | **8.2 s** | ≈ **−35%** |
| `/notifications` | 45.8 s | **46.1 s** | **unchanged** (out of PERF-002 P0) |

---

## F. First meaningful Home paint

| Metric | Result |
|--------|--------|
| Progressive shell API | **~3.5–4.5 s** wall · Gateway **~3.2–3.9 s** |
| UX | Greeting / featured catalogs available before desk enrichment |
| Client | `phase=shell` then `phase=desk` (PERF-002) |

---

## G. Fully settled Home

| Metric | Result |
|--------|--------|
| Sequential shell + desk | ≈ **4.5 + 12.5 ≈ 17 s** to fully settled progressive path |
| Single full `/home` | ≈ **10.1 s** |
| BEFORE settled | **38.1 s** monolith |

---

## H. API call reduction

| Cold entry | BEFORE | AFTER |
|------------|--------|-------|
| Duplicate `/auth/me` (Splash + AppShell) | **2** | **1** (Splash skips `/me`) |
| Home HTTP | 1 heavy monolith | **2** lighter (`shell` + `desk`) — intentional for progressive UX |
| Home work units | pipeline + ≤12× `getOpportunity` + empty ECM scan | pipeline reuse + owned customer **count** (no empty ECM scan) |
| Pipeline after Home (intent) | Always full recompute | Server TTL + client SWR designed; **see §J / §O** |

---

## I. Gateway latency

From `Server-Timing: total;dur=…` on production:

| Endpoint | Gateway dur |
|----------|------------:|
| Home shell | ~3.2–3.9 s |
| Home desk | ~10.7–12.0 s |
| Home full | ~9.5–9.8 s |
| Business pipeline | ~7.3–7.9 s |

Network overhead ≈ wall − Server-Timing (typically a few hundred ms when warm).

---

## J. Cache correctness result

| Test | Result |
|------|--------|
| Existing Opportunity visible in pipeline | ✅ `opportunityVisibleInPipeline: true` (`cmsnpr4g70003k004cslwizma`) |
| Controlled mutate | Attempted **PATCH** on existing BAT-owned opp → **403** (entitlement / BAT write restriction — **no successful write**) |
| Immediate Home/pipeline reload after attempt | ✅ 200 responses; opportunity remained visible |
| Second pipeline call within 30s faster? | ❌ **No** (~8.2 s → ~8.8 s) — in-process TTL cache **does not reliably hit across Vercel serverless isolates** |
| Stale Opportunity/Deal presentation | ✅ No stale desk observed on BAT book |
| New production pollution | ❌ No successful create; patch rejected |

**Verdict:** Visibility OK. Server-side pipeline TTL **insufficient on serverless multi-instance**. Client SWR remains useful within a single browser session. Invalidation path is wired for successful mutations; BAT patch 403 prevented a live invalidate proof.

---

## K. Business regression result

Authenticated BAT GETs (200 / success):

| Surface | Result | ms |
|---------|--------|---:|
| Partner auth login + `/me` | ✅ | — |
| Deals | ✅ | 9,931 |
| Customers | ✅ | 13,303 |
| Opportunities | ✅ | 11,809 |
| Opportunity journey config | ✅ | 257 |
| Home shell / desk / full | ✅ | see §D |
| Pipeline | ✅ | see §D |
| Health persistence prisma | ✅ | — |

Ownership / entitlements enforcement unchanged (evidenced by **403** on unauthorized BAT patch).  
Referral / Joint / Solo modes: not re-exercised with UI BAT in this sprint; no entitlement code changes in PERF-002 beyond request memo of existing resolve.

**No business-logic changes claimed or observed in P0 paths.**

---

## L. TypeScript

| App | Status |
|-----|--------|
| Catalyst One | ✅ `tsc --noEmit` exit 0 |
| Wealth Partner | ✅ `tsc -b` exit 0 |

---

## M. Lint

| App | Status |
|-----|--------|
| Catalyst One | ✅ `next lint` exit 0 (pre-existing unrelated warnings only) |
| Wealth Partner | ✅ `oxlint` exit 0 (1 pre-existing hooks warning) |

---

## N. Build

| App | Status |
|-----|--------|
| Catalyst One | ✅ Vercel production build READY |
| Wealth Partner | ✅ local `vite build` + Vercel production READY |

Structural: `node scripts/co-wp-perf-002-verify.mjs` ✅  

---

## O. Remaining bottlenecks

1. **`/notifications` still ~45–70 s** — not in PERF-002 P0 (≤40× opportunity hydrate).  
2. **Auth `/me` + login still ~8–9 s** — cold Partner binding / serverless, not improved by Home split.  
3. **Pipeline in-memory TTL ineffective across serverless isolates** — next fix should use shared cache (e.g. Redis/KV) or embed pipeline reuse from Home desk client-side only.  
4. **Customers directory ~13 s** — ECM N+1 still present (P1 from PERF-001).  
5. Progressive Home uses **two** HTTP calls; full single `/home` is already ~10 s if client chooses.

---

## P. Recommendation for next action

1. **P1 sprint:** Notification Center fan-out reduction (reuse Home-capped projection / light detail).  
2. **Shared pipeline cache** (or rely on client SWR only; remove false confidence in process-local TTL on Vercel).  
3. Optional: instrument browser HAR for true “first meaningful paint” on WP production (API proxy already validates shell ≪ old monolith).  
4. **Do not claim certification** until Product Owner opens a formal CERT sprint.

---

## Final status

| Item | Status |
|------|--------|
| Gateway deployed + aliased | ✅ |
| WP deployed + aliased | ✅ |
| AFTER timings captured | ✅ |
| Home first paint improved | ✅ **~4.5 s shell vs 38.1 s before** |
| Full Home improved | ✅ **~10.1 s vs 38.1 s** |
| Notifications | ⚠ unchanged |
| Certification | **Not claimed** |
| Hot-fix / extra development | **None** |

**STOP** — performance validation deployment complete. No further development in this sprint.

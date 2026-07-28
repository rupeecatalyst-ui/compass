# CO-PERF-001 — Enterprise Performance & Response Time Certification

**Status:** OPEN — Measurement complete; Sprint A code shipped; not certified until RUM meets targets  
**Date:** 2026-07-27  
**Method:** Measure-first (DB EXPLAIN + Prisma RTT + call-graph model). Authenticated HTTP API battery blocked by production login `401 INVALID_CREDENTIALS` for frozen cert account — DB/path evidence still conclusive.  
**Raw data:** `docs/co-perf-001/CO-PERF-001-MEASUREMENT-RAW.json`, `CO-PERF-001-WATERFALL-MODEL.json`  
**Related:** Prior context audit `docs/co-arch-001/CO-PERF-001-ENTERPRISE-PERFORMANCE-CONTEXT-INTEGRITY-AUDIT.md` · pool incidents CO-QA-005

---

## Executive verdict (evidence-backed)

**SQL is not the bottleneck.**

| Layer | Measured |
|-------|----------|
| Postgres `EXPLAIN ANALYZE` execution | **0.03–0.07 ms** |
| Prisma wall time per query (via pooler) | **~298–310 ms p50** (stable) |
| Ratio | **~4,000×** overhead vs SQL CPU |

Latency is dominated by:

1. **Supabase transaction pooler RTT** (`DATABASE_URL` → `:6543` + `pgbouncer=true`, **`connection_limit` unset**)  
2. **Sequential multi-round-trip client waterfalls** (Deal open, Save, Move to Deal, Opportunity stage remounts)  
3. **Pool exhaustion under Vercel serverless** → `Timed out fetching a new connection` / `Unable to start a transaction in the given time` (already evidenced in CO-QA-005)  
4. ~~**Oversized lender directory fetches** (`pageSize: 5000`)~~ → Sprint A capped at **200**

Cosmetic spinners will not fix this. Optimisation must cut **round trips** and **pool pressure**, not “tune indexes” first.

---

## Phase 1 — Screen timing (estimated from measured unit costs)

Unit cost (p50 Prisma RTT via production DB URL): **≈ 300 ms / query**.  
API path estimate uses **×2** multiplier (Vercel serverless ↔ pooler ↔ JSON) unless noted.

| Screen / workflow | Target | Estimated path (API-eq) | Vs target | Confidence |
|-------------------|-------:|------------------------:|-----------|------------|
| Dashboard (metrics + lists) | ≤2s | 0.6–2.0s+ (depends on EME + charts) | Borderline | Medium |
| Contacts list | ≤2s | ~0.6s (list50) | Likely OK | High (DB) |
| My Opportunities | ≤2s | ~0.6s | Likely OK | High |
| Opportunity Workspace open | ≤3s | **~1.8s** (2× GET + deals) **per mount**; journey remounts ×N | Fail under remounts | High |
| Credit / Strategy stages | ≤3s | +1–2 Opportunity GETs each (audit ~10/journey) | Fail cumulative | High (code) |
| Move to Deal (3 lenders) | ≤5s | **~5.7s** modeled | Fail / borderline | Medium |
| Deal Workspace open | ≤3s | Pre-A **~1.8s** seq; Sprint A **~1.2s** warm+parallel siblings/opp | Improving | High |
| Lender Pipeline drag/save | ≤3s | Pre-A **~3.6s+**; Sprint A **~1.2–2.4s** (skip reload) | Improving | High |
| Save (header) + reload | ≤3s | Pre-A **~3.6s**; Sprint A stage-save **~1.2–2.4s** | Near target* | High |
| Customer Profile | ≤2s | contact GET + related | Likely OK if single GET | Medium |
| Document Center | ≤5s | depends on durable docs + list | Needs RUM | Low |
| Search | ≤1s | ~0.6s list | Borderline | Medium |
| Logout/Login | — | Login **401 took 4.4s** in probe | Auth path slow | High |

**Browser RUM (DevTools Performance / Network) still required for absolute certification.** These numbers are lower bounds from DB+call-graph; pool waits push Save/Move/Open into the **20–40s** range users observe.

---

## Phase 2 — API profiling

### Attempted

Production base: `https://catalyst-one-two.vercel.app`  
Login: `admin@compass.com` → **401 INVALID_CREDENTIALS** (login request itself **4425 ms**).

### Ranking (from call-graph + unit RTT — proxy for Top APIs)

| Rank | Endpoint / operation | Est. cost driver |
|-----:|----------------------|------------------|
| 1 | `POST /api/enterprise-deals` × N (Move to Deal) | Interactive TX + pool |
| 2 | Pipeline persist: transitions + PATCH (+ reload only on delete) | Sprint A: reload skipped on stage-only save |
| 3 | `GET /api/lender-registry/lenders?pageSize=200` | Cap applied (was 5000) |
| 4 | `GET /api/enterprise-deals/:id` | Warm session when available |
| 5 | `GET …/opportunities/:id/deals` | Parallel with opp label after Deal GET |
| 6 | `GET /api/enterprise-opportunities/:id` (duplicated) | Stage remounts |
| 7 | `GET /api/enterprise-opportunities?pageSize=50` | List |
| 8 | `GET /api/enterprise-deals?pageSize=50–100` | OW `loadDeals` |
| 9 | `GET /api/ecm/contacts` | Registry |
| 10 | `GET /api/auth/login` | **4.4s** even on 401 |

Authenticated Top-20 with TTFB/bytes: **blocked until cert login works** — re-run `scripts/co-perf-001-response-time-profile.mjs` after credentials fixed.

---

## Phase 3 — Database profiling

### EXPLAIN ANALYZE (production)

| Query | Planning | Execution | Node | Shared reads |
|-------|----------|-----------|------|--------------|
| opportunity list 50 | 0.117 ms | **0.068 ms** | Limit | 0 |
| deals by opportunity | 0.145 ms | **0.053 ms** | Sort | 0 |
| lender list 200 | 0.099 ms | **0.057 ms** | Limit | 0 |

**No missing-index smoking gun** on these hot paths. Table scans / lock waits: **not observed** during probe (`waiting_lock: 0`).

### Prisma query event durations

Most SELECT/EXPLAIN ≈ **121–132 ms** engine-reported + wall ≈ **300 ms** → network/pooler dominates.

---

## Phase 4 — Prisma / connection pool

| Item | Evidence |
|------|----------|
| PrismaClient instances | Singleton `server/lib/prisma.ts` (+ serverless instance sprawl) |
| `DATABASE_URL` | pooler **6543**, `pgbouncer=true`, **no `connection_limit`** |
| `DIRECT_URL` | pooler **5432** |
| Probe pool | 7 backends; idle_in_transaction 0 at quiet time |
| Under load (prior) | idle-in-transaction / BEGIN waiting ClientRead (CO-QA-005) |

### Why `Timed out fetching a new connection from the connection pool`

1. Each Vercel function opens a Prisma pool (default size ≫ 1 without `connection_limit`).  
2. Traffic hits Supabase **transaction** pooler with finite server pool.  
3. Interactive `$transaction` / concurrent requests hold checkouts.  
4. New requests wait until `pool_timeout` (default 10s) → exact Prisma error.  
5. User-visible Save/Move “20–40s” = **2–4 × pool waits** stacked with sequential API waterfall.

CO-QA-005 reduced Deal-create double-TX; **pool `connection_limit` still unset** — residual risk.

---

## Phase 5 — React performance (code evidence)

| Pattern | Location | Impact |
|---------|----------|--------|
| Dual Opportunity load on stage open | gate + provider/runtime | 2× GET per stage |
| Remount provider per stage | Opportunity journey | Cache miss / remount cost |
| `loadDealPipelineRuntime` warm + parallel siblings/opp | `deal-pipeline-runtime.ts` | Sprint A: fewer RTTs on reopen |
| Pipeline `onChange` → persist; reload **only on delete** | `persistDealPipelineLenders` | Sprint A: stage-save skips 3-GET reload |
| React Query unused for registries | Prior audit | Event/`refreshKey` cascades |
| Lender merge pageSize | `published-directory.ts` | Sprint A: **200** (was 5000) |

Expensive surfaces: **OpportunityWorkspaceProvider**, **DealWorkspaceHost** (reload), **Lender published directory**, **LenderPipelineBoard** persist path.

---

## Phase 6 — Network waterfall

### Deal open (Sprint A — warm + parallel)

```text
getDeal (warm session / forceRefresh only if cold)
  → Promise.all(
      listDealsByOpportunity,
      getOpportunity (label, only if needed)
    )
Total modeled                  ~600–1200 ms API-eq (+ pool waits)
```

### Pre-A sequential (baseline)

```text
getDeal (forceRefresh)     ~300ms DB / ~600ms API-eq
  → listDealsByOpportunity ~300 / ~600
  → getOpportunity (label) ~300 / ~600
Total sequential           ~900 / ~1800 ms  (+ pool waits)
```

### Opportunity journey (from prior audit + still applicable)

~**10×** `getOpportunity` across Credit → Docs → Workbench → LIFE → Select → Move  
At ~300–600 ms each → **3–6 s Opportunity network alone**.

### Lender directory

`listPublishedLenderOptionsAsync` capped at **pageSize 200** (Sprint A; was 5000).

### Duplicates (remaining)

- Opportunity GET still duplicated across stages (Sprint B)
- Deal open still two client calls (siblings list) — single composite API is Sprint B
- Persist reloads full pipeline **only after soft-delete** (Sprint A closed stage-save reload)

---

## Phase 7 — Save workflow instrumentation (code + model)

```text
User action (Pipeline drag / Save)
  ↓
persistDealPipelineLenders / persistDealProjectionToRegistry
  ↓
[optional] softDeleteRemovedPipelineDeals     ← DELETE APIs
  ↓
[per changed lender] transitionDeal           ← POST transitions  (~1 RTT)
  ↓
[per changed lender] updateDeal               ← PATCH             (~1–2 RTT)
  ↓
IF delete → loadDealPipelineRuntime (forceRefresh)
ELSE → merge PATCH responses into runtime     ← Sprint A (0 extra GET)
  ↓
setRuntime → React render
  ↓
toast / saving=false
```

**Clean 1-lender stage change (Sprint A):** ~1.2–2.4s API-eq (vs pre-A ~3.6s).  
**With pool timeout:** +10s per blocked checkout → **20–40s** still possible until ops sets `connection_limit`.

Header Save without reload is shorter; Pipeline delete path still reloads.

---

## Phase 8 — Deal opening bottleneck

**Primary (pre-A):** Sequential 3-network waterfall + always `forceRefresh`.  
**Sprint A:** Warm session GET + parallel siblings/opp label.  
**Secondary:** Pool wait under concurrent Dashboard/ECM traffic.  
**Not primary:** SQL plan quality.

---

## Phase 9 — Opportunity opening bottleneck

**Primary:** Duplicate GETs per stage + remounts across journey.  
**Secondary:** `loadDeals` full search.  
**Session cache exists** (`ensureSessionOpportunity`) but stages still force remount/revalidate patterns.  
*(Sprint B — not yet shipped.)*

---

## Phase 10 — Lender Profile / directory bottleneck

**Primary (pre-A):** `pageSize: 5000` lender registry fetch.  
**Sprint A:** Cap **200**. Remaining: Soft Go-Live merge + ~300 ms RTT tax.

---

## Root cause analysis (ranked)

| Priority | Root cause | Evidence | Status |
|----------|------------|----------|--------|
| P0 | **Round-trip amplification** (sequential APIs, duplicate Opportunity GETs, save→full reload) | Call graph + ~300ms/query | Sprint A partial (save reload + Deal parallel) |
| P0 | **Connection pool misconfig** on serverless (`connection_limit` unset on :6543) | URL audit + CO-QA-005 errors | **Ops pending** |
| P1 | **Oversized lender list (5000)** | `published-directory.ts` | Sprint A **done** (200) |
| P1 | **Interactive TX pressure** on create/update paths | Prisma `$transaction` usage | CO-QA-005 partial |
| P2 | Auth login path slow even on failure (4.4s) | Measurement | Open |
| P3 | SQL indexes | EXPLAIN sub-ms | Not first |

---

## Prioritised optimisation roadmap

### Sprint A — Pool & Save / Deal open / lender cap — **CODE SHIPPED**

| # | Item | Evidence | Status |
|---|------|----------|--------|
| 1 | Vercel `DATABASE_URL` `connection_limit=1..5` | Pool timeouts | **Ops pending** |
| 2 | Pipeline persist: merge PATCH → skip full reload when no delete | Save 20–40s / ~3.6s model | **Shipped** (`persistDealPipelineLenders`) |
| 3 | Deal open: warm cache + parallel siblings/opp | Sequential ~1.8s model | **Shipped** (`loadDealPipelineRuntime`) |
| 4 | Cap lender directory pageSize 5000→200 | Payload / main thread | **Shipped** (`published-directory.ts`) |
| 5 | Combine transition+update into one server endpoint | Extra RTT | Deferred (Sprint B+) |
| 6 | Re-measure Save p50/p95 with RUM | Certification | **Blocked** (auth 401) |

### Sprint B — Open paths (next)

5. Deal open: single API `GET /deals/:id?include=siblings,opportunityNumber`.  
6. Opportunity: one context load per journey; stages consume session.  
7. Server combine transition+update where safe.

### Sprint C — Move to Deal

8. Batch Move to Deal creates (one request, N deals).

### Sprint D — RUM certification

9. Fix production cert login for API probe.  
10. Playwright/RUM pack against targets.  
11. Only then mark CO-PERF-001 Pass.

---

## Sprint A files changed

| Path | Change |
|------|--------|
| `src/lib/enterprise-deal/deal-pipeline-runtime.ts` | Warm GET; parallel siblings+opp; in-place persist rebuild |
| `src/lib/enterprise-lender-registry/published-directory.ts` | `pageSize` 5000 → 200 |
| `docs/co-perf-001/CO-PERF-001-RESPONSE-TIME-CERTIFICATION.md` | This report |

### Measurement artifacts (Phase 1)

| Path | Purpose |
|------|---------|
| `scripts/co-perf-001-response-time-profile.mjs` | API+DB+pool measurement |
| `scripts/co-perf-001-waterfall-model.mjs` | Call-graph cost model |
| `docs/co-perf-001/CO-PERF-001-MEASUREMENT-RAW.json` | Raw probe |
| `docs/co-perf-001/CO-PERF-001-WATERFALL-MODEL.json` | Model output |

---

## Certification rule

**CO-PERF-001 remains OPEN** until live workflows meet:

| Workflow | Target |
|----------|--------|
| Dashboard | ≤ 2s |
| Opportunity Workspace | ≤ 3s |
| Deal Workspace | ≤ 3s |
| Lender Profile | ≤ 2s |
| Save | ≤ 3s |
| Move to Deal | ≤ 5s |
| Document Upload | ≤ 5s |
| Search | ≤ 1s |

…with **no unexplained** pool timeouts, and RUM evidence — not scripts alone.

### Immediate ops ask

1. Restore working Business Certification Admin password on production **or** provide `CO_PERF_EMAIL` / `CO_PERF_PASSWORD` for API profiling.  
2. Add `connection_limit=5` (start) to Vercel `DATABASE_URL` query string.  
3. BAT: Pipeline stage Save (no delete) should no longer wait for full Deal reopen; Deal reopen with warm session should feel faster.

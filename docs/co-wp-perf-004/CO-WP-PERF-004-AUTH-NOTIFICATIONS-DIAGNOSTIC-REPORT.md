# CO-WP-PERF-004 — Wealth Partner Auth + Notifications Performance Diagnostic

**Status:** DIAGNOSTIC ONLY — no fixes implemented · no Vercel deploy · no schema / business-logic changes  
**Date:** 2026-08-11  
**Environment:** Production Gateway `https://catalyst-one-two.vercel.app`  
**Controlled partner:** `wp-bat@rupeecatalyst.com` · **WPDEMO001** (`cms9apix90003wejcooyto6ij`)  
**Evidence:** `docs/co-wp-perf-004/CO-WP-PERF-004-TIMINGS.json` · script `scripts/co-wp-perf-004-diagnose.mjs`  
**Method:** Authenticated wall-clock timings + code-path waterfall. Numbers below are **measured**, not inferred alone.

---

## Executive verdict

| Surface | Measured | Primary cause class |
|---------|----------|---------------------|
| `POST /api/partner/auth/login` | **8.2 s** cold · **6.4 s** warm | Sequential Prisma binding + bcrypt + refresh write; modest cold-start (~1.9 s) |
| `GET /api/partner/auth/me` | **8.2 / 7.9 / 8.4 s** (3 samples) | Re-binds partner **and** loads entitlements/templates every request; **no warm benefit** |
| `GET /api/partner/notifications` | **45.1 s** · **45.7 s** warm probe | Pipeline + **N× full `getOpportunity`** (docs/notes/entity entitlements) + `searchCustomers("")` + **duplicate ECM×40** |
| Home shell / desk | **4.1 s** / **12.4 s** | Does **not** call `/notifications`; desk uses `listForHomeFast` |

**Root narrative**

1. **Auth ~8–9 s** is not “JWT is slow.” JWT verify is local. Cost is **DB-bound sequential work** (binding, and on `/me` entitlements) amplified by **serverless isolate behaviour** and **edge India (`bom1`) → function US East (`iad1`)** (see §E).
2. **Notifications ~46 s** is a **composition bug / unoptimized center path**, not Home. With only **2** owned opportunities, proxies alone sum to ~**39–45 s**.
3. **Process-local pipeline TTL is ineffective across Vercel isolates** (pipeline #1 **7.9 s**, #2 **7.7 s** — no TTL hit). Do not rely on it for correctness or performance.
4. **Home is already decoupled from `GET /notifications`.** Full center still hurts the Notifications screen and any future consumer of `getCenter` / mark-read.

---

## A. Login waterfall (measured + code)

### Measured

| Step | Label | ms | Notes |
|------|-------|---:|-------|
| 1 | `login#cold` | **8231** | First call in session |
| 2 | `login#warm-immediate` | **6373** | Immediate retry, same client |
| Δ | cold − warm | **1858** | Upper bound on isolate cold-start / connect premium for this path |

`x-vercel-id` examples: `bom1::iad1::…` (edge Bombay, function **iad1**). `x-vercel-cache: MISS`.

Login session **does not** include entitlements (`hasEntitlements: false`).

### Server sequence (`partner-auth.service.ts` → binding)

```text
POST /api/partner/auth/login
  ├─ prisma.user.findUnique(email)                    [Q1]
  ├─ bcrypt.comparePassword                           [CPU]
  └─ issuePartnerSession
       ├─ resolvePartnerBindingForUser                (memo NO-OP — auth routes lack ALS)
       │    ├─ prisma.user.findUnique(id)             [Q2 — duplicate user load]
       │    ├─ prisma.ecmContact.findMany(linkedUser) [Q3]
       │    └─ prisma.enterpriseWealthPartner.findFirst [Q4 (+ optional activation)]
       ├─ sign access + refresh JWT                   [CPU, local]
       └─ prisma.refreshToken.create                  [W1]
  → session DTO WITHOUT entitlements
```

### Classification of login latency

| Class | Contribution (evidence) |
|-------|-------------------------|
| **A. Cold-start** | ~**1.9 s** (8231−6373). Real but **not** the majority. |
| **B. Database** | Dominant of remaining ~**6.4 s** — 4–5 Prisma ops + write, sequential. |
| **C. Repeated queries** | User loaded **twice** (email then id). |
| **D. Network RTT** | Client (India) → `bom1` → function `iad1`; each DB round-trip pays function↔Postgres RTT. |
| **E. Sequential ops** | Binding chain is fully serial; bcrypt before binding. |
| **F. Other** | bcryptjs cost; JWT sign cheap; no entitlement work on login. |

**Can auth be materially reduced?** **Yes** (see §L) — but expect **seconds**, not milliseconds, until sequential DB work and region placement are addressed.

---

## B. `/me` waterfall (measured + code)

### Measured

| Sample | ms | Entitlements |
|--------|---:|--------------|
| `/me#1-after-login` | **8174** | present |
| `/me#2-warm` | **7931** | present |
| `/me#3-after-gap` | **8381** | present |

**No meaningful warm-down.** `/me` is essentially always ~8 s for this partner on production.

Response ~838 bytes — **serialization is not the cost.**

### Server sequence

```text
GET /api/partner/auth/me
  ├─ requirePartnerAccessToken → verifyPartnerAccessToken   [JWT only, local]
  └─ partnerAuthService.me
       ├─ resolvePartnerBindingForUser                      [Q1–Q4 again]
       ├─ partnerId claim check
       ├─ dynamic import(partner-entitlements)              [cold module on cold isolate]
       └─ resolveForPartner
            ├─ ensureSystemTemplates → 3× template findUnique [Q5–Q7]
            └─ partnerEntitlementProfile.findUnique+template [Q8]
```

Auth routes **do not** wrap `runWithPartnerRequestMemo` → binding/entitlement memos are **no-ops** on `/me`.

### Classification of `/me` latency

| Class | Contribution |
|-------|----------------|
| **A. Cold-start** | Secondary — warm samples still ~8 s. |
| **B. Database** | Primary — binding + ~4 entitlement reads, all sequential. |
| **C. Repeated** | Full binding **repeats login work**; templates re-checked every `/me`. |
| **D. Network** | Same `bom1::iad1` pattern; multiplies per query. |
| **E. Sequential** | Binding then entitlements (not parallelized). |
| **F. Other** | Dynamic import of entitlements module on cold isolate. |

### Client behaviour (Wealth Partner App, post PERF-002)

| Surface | `/me` |
|---------|-------|
| Splash | **0** (health + optional `markSessionRestored`) |
| Login | **0** (login only; does **not** mark restore) |
| AppShell | **0–1** via `restorePartnerSession({ allowSkipIfFresh: true })` |
| Fresh login → AppShell | **1× `/me`** (needed for entitlements) |

So login + `/me` on first authenticated entry ≈ **8.2 + 8.2 ≈ 16 s** Gateway time before entitlements are known (plus AppShell health if not fresh).

---

## C. Notification waterfall (measured + code)

### Measured end-to-end

| Call | ms | Items | Bytes |
|------|---:|------:|------:|
| `notifications#1` | **45103** | 7 | 4069 |
| `notifications#2-warm-probe` | **45652** | 7 | — |

**Warm probe does not help** — consistent with new serverless isolate each time + no shared cache.

### Decomposition proxies (same BAT session)

| Segment | ms | Role inside `getCenter` |
|---------|---:|-------------------------|
| `pipeline#1` | **7935** | `getBusinessPipeline` always |
| `pipeline#2-ttl-probe` | **7696** | Process-local TTL **miss** across isolates |
| `opportunity` ×2 sequential | **13705 + 12626 = 26331** | Full `getOpportunity` (docs + notes + entity entitlement) |
| `opportunities#parallel-fanout` (2) | **15666** wall | Same work as `Promise.all` in `loadOpportunityDetails` |
| `customers/search?q=` | **15124** | Mirrors `searchCustomers("")` |
| Arithmetic proxy (pipe + customers + parallel opps) | **38725** | |
| Measured notifications | **45103** | |
| Residual | **~6378** | Duplicate ECM×40 after search + binding/read-state + compose + same-request overhead |

BAT book size: **2 opportunities**, **2 customers**, **7 notification items**. Latency is **not** explained by payload size.

### Exact `getCenter` waterfall (code)

`partner-notification-center.service.ts` → `GET /api/partner/notifications`

```text
getCenter(userId)
  ├─ [B] resolvePartnerBindingForUser
  ├─ [R] loadReadState (partner profileJson slice)
  ├─ [D] loadOpportunityDetails(limit=40)
  │     ├─ getBusinessPipeline                    ≈ 7.9 s measured
  │     └─ Promise.all(≤K getOpportunity)         ≈ 15.7 s wall for K=2
  │           each: ownership findFirst
  │                 assertEntitlement(entityId)   ← distinct memo key per opp
  │                 listPartnerOpportunityDocuments
  │                 listPartnerVisibleOpportunityNotes
  │                 LOD + applyHealth
  ├─ [E] searchCustomers("")                      ≈ 15.1 s measured
  │     assertPartnerAction again
  │     listOwnedCustomerIds (another opp findMany)
  │     sequential ECM load per customer
  ├─ [F] ECM again × min(40, customers)           ← duplicate of [E]
  └─ [G] projectPartnerNotifications + DTO        ← small (4 KB)
```

### Why ~46 seconds (exact root causes)

1. **P0 — Full center composition** still does pipeline + ≤40× hydrated `getOpportunity` + empty-query customer scan. Home already avoided this via `listForHomeFast` + desk preload; **notifications route did not**.
2. **P0 — Per-opportunity hydrate** (~**12–14 s each** sequential; ~**15.7 s** parallel for 2) for docs/notes/entity entitlements — far heavier than notification projection needs.
3. **P0 — `searchCustomers("")` ~15 s** for birthday enrichment with only 2 customers (sequential ECM + ownership re-scan).
4. **P1 — Duplicate ECM×40** after search already loaded contacts.
5. **P1 — Process-local pipeline TTL never shared** across isolates → every notifications call rebuilds pipeline.
6. **P2 — `markRead` / `markAllRead` call `getCenter` twice** (not in this timing run; structural landmine).

Empty/few-opp books are **not free**: pipeline + customer path alone ≈ **23 s** before opportunity fan-out.

---

## D. Database query timings

No per-query `EXPLAIN` / Prisma middleware timings were deployed (diagnostic sprint forbids instrumentation deploy). **Inferred from measured endpoints + query inventory:**

### Login (steady)

| Op | Count | Nature |
|----|------:|--------|
| `user.findUnique` | 2 | email + id |
| `ecmContact.findMany` | 1 | |
| `enterpriseWealthPartner.findFirst` | 1 | |
| `refreshToken.create` | 1 | write |

Wall **6.4–8.2 s** for this set ⇒ **~1–2 s per sequential remote query** under current hosting topology (or fewer queries with very expensive connect/bcrypt).

### `/me`

| Op | Count |
|----|------:|
| Binding (as login, no refresh write) | 3–4 |
| `partnerEntitlementTemplate.findUnique` | 3 |
| `partnerEntitlementProfile.findUnique` | 1 |

Wall **~8 s** with **no bcrypt** ⇒ entitlement + binding DB path alone is multi-second.

### Notifications (dominant DB / DAL)

| Op family | Scale |
|-----------|------:|
| Pipeline owned list + health | 1 pass |
| Per opp: ownership + entity entitlement + docs + notes | **×K** (K≤40; BAT K=2) |
| Customer ownership list | 1 |
| ECM `findById` | **×customers** then **again ×min(40,customers)** |

Single opportunity API ≈ **13 s** ⇒ notifications cannot be fast while it calls that path N times.

---

## E. Gateway timings

| Endpoint | Client wall (ms) | Server-Timing |
|----------|-----------------:|---------------|
| login | 8231 / 6373 | none |
| `/me` | 8174 / 7931 / 8381 | none |
| home shell | 4116 | present on home route historically |
| home desk | 12391 | |
| pipeline | 7935 / 7696 | present on pipeline route |
| opportunity ×1 | ~12600–13700 | — |
| customers search `q=` | 15124 | — |
| notifications | 45103 / 45652 | **none** |

Gateway function region from `x-vercel-id`: **`iad1` (US East)** with client edge **`bom1` (Mumbai)**. This is a **material amplifier** for every Prisma round-trip and for India-origin HTTP. Aligning function region with Postgres region is an infra P0 candidate (not implemented here).

---

## F. Network round trips

### Client → Gateway (Wealth Partner App)

| Journey | Round trips |
|---------|-------------|
| Fresh login → usable AppShell with entitlements | login + `/me` (+ optional health) = **2–3** |
| Home progressive | `/home?phase=shell` then `/home?phase=desk` = **2** (no `/notifications`) |
| Open Notification Center | **+1** full `/notifications` (~46 s) |

### Server-internal (logical RTTs to DB)

| Path | Approx sequential DB RTTs |
|------|---------------------------|
| Login | ~5 |
| `/me` | ~7–8 |
| Notifications (K=2) | pipeline queries + **2× (ownership+entitlement+docs+notes)** + customer ownership + **2× ECM ×2** → **dozens** |

---

## G. Exact root cause(s)

### Auth / `/me` (~8–9 s)

1. **Sequential Prisma binding** on every login and every `/me` (duplicate user read on login).
2. **`/me` always loads entitlements + 3 system template checks**; login does not issue entitlements → client **must** call `/me` after login.
3. **No request memo on auth routes**; no cross-request session cache.
4. **Serverless isolate + `bom1→iad1` topology** keeps “warm” samples multi-second.
5. Cold-start premium on login ≈ **1.9 s** only — **not** the main story.

### Notifications (~46 s)

1. **`getCenter` still uses the pre–PERF-002 expensive composition** (pipeline + ≤40× `getOpportunity` + `searchCustomers("")` + ECM×40).
2. **Measured:** pipeline ~8 s + parallel opp hydrate ~16 s + customers ~15 s ≈ **39 s**, residual ~6 s → **matches ~45 s**.
3. **Process-local pipeline TTL does not hit** across isolates (pipeline #2 ≈ #1).
4. Response body tiny (4 KB / 7 items) — **not serialization-bound**.

---

## H. P0 / P1 / P2 recommendations (do not implement in this sprint)

### P0

1. **Rebuild Notification Center read path** like Home: reuse pipeline/store projection; **stop** ≤40× `getOpportunity` for notifications; skip empty `searchCustomers` / birthday ECM unless needed; cap enrichment.
2. **Pin Vercel Serverless region to Postgres region** (or move DB) — measure `/me` again; expect multi-second auth wins if RTT was dominant.
3. **AppShell / login:** paint shell from login session immediately; load entitlements async (or include slim entitlements on login) so `/me` does not block first chrome.
4. Confirm Home never awaits `GET /notifications` (already true) — keep that contract.

### P1

5. Collapse login double `user` read; parallelize binding contact/partner lookups where safe.
6. Cache system templates in-process **or** skip `ensureSystemTemplates` on hot `/me` when seeds exist.
7. Wire `runWithPartnerRequestMemo` on auth + notifications for **intra-request** dedupe only.
8. Fix `markRead` / `markAllRead` double `getCenter`.

### P2

9. Shared server cache (Redis/KV) for pipeline / notification projection **after** structural P0 — not instead of it.
10. Add `Server-Timing` buckets on auth + notifications for future BAT (binding / entitlements / pipeline / fanout / customers).

---

## I. Recommended fix architecture (design only)

```text
                    ┌─────────────────────────────┐
 Login ───────────► │ Session (identity+partner)  │──► AppShell paints
                    │ (+ optional slim entitle)   │
                    └──────────────┬──────────────┘
                                   │ async
                                   ▼
                              GET /me (entitle refresh)

 Home shell ──► catalogs / identity          ──► first meaningful paint
 Home desk  ──► pipeline + listForHomeFast   ──► usable desk
 Notifications screen ──► GET /notifications ──► independent SWR
                              │
                              ▼
                    Fast center compose:
                      owned opp ids + activity/LOD signals
                      (no docs/notes hydrate by default)
                      birthday batch query (not searchCustomers(""))
```

**Cache policy (recommended — one approach):**

1. **Primary:** Wealth Partner **client SWR** for `/me`, home desk, notifications, pipeline — with **explicit mutation invalidation** on create/patch/submit (already partially present for pipeline).
2. **Secondary:** Optional **shared server cache** (Vercel KV / Redis) keyed by `partnerId` for pipeline + notification projection **only after** P0 composition shrink — TTL short (15–30 s), invalidate on partner mutations.
3. **Do not** rely on process-local `Map` TTL for correctness or prod performance (proven miss).

---

## J. Expected improvement (order-of-magnitude, post-fix)

| Surface | Today | After P0 structural + region align (estimate) |
|---------|------:|-----------------------------------------------|
| Login | 6–8 s | **1–3 s** (binding collapse + region) |
| `/me` | ~8 s | **0.5–2 s** (or non-blocking for shell) |
| Notifications | ~46 s | **2–6 s** for BAT-sized book (K≈2) if fan-out removed |
| Home shell | ~4 s | similar or better; **unchanged coupling** to full notifications |

Estimates assume region alignment helps; structural notification rewrite is required for 46→low-single-digit regardless.

---

## K. Can notifications be completely decoupled from Home?

**Yes — and they largely already are.**

| Surface | Blocks on `GET /notifications`? |
|---------|----------------------------------|
| Home shell (`phase=shell`) | **No** (notifications array empty / omitted) |
| Home desk | **No** HTTP `/notifications`; uses **`listForHomeFast`** inside `/home` (~7 items in desk payload) |
| AppShell / navigation | **No** |
| First meaningful paint (shell) | **No** |
| Notification Center screen | **Yes** — mount loads full center (~46 s) |

Desired architecture:

```text
Home primary business data → usable screen → notifications independently load
```

…is **met for the full center endpoint**. Remaining coupling: desk still embeds a **fast** notification strip in `/home?phase=desk` (adds to desk ~12 s path, not 46 s). Optional later: move even the strip to a third non-blocking fetch.

---

## L. Can auth be materially reduced?

**Yes.**

- Cold-start alone explains only ~**2 s**.
- Remaining ~**6–8 s** is sequential DB + bcrypt + entitlement work + region RTT.
- Material reduction requires: fewer sequential queries, entitlements not on the critical path for shell paint, and/or co-locating compute with DB.
- Including entitlements on login **or** async `/me` removes ~8 s from **perceived** time-to-shell even if `/me` stays slow briefly.

---

## M. Is shared caching actually necessary?

| Cache | Necessary now? | Assessment |
|-------|----------------|------------|
| Process-local pipeline TTL | **No for correctness**; **ineffective for prod perf** across isolates | Keep as best-effort only; do not design around it |
| Client SWR + mutation invalidation | **Yes — primary** | Correct product pattern for partner app; already started |
| Shared server cache (KV/Redis) | **Not strictly necessary for first win** | Becomes valuable **after** notification composition is fixed, to share pipeline/notification projection across isolates; **premature as the only fix** |

**Recommendation:** Implement **client SWR + explicit invalidation** as the default; add **shared server cache** only if post-P0 server work remains multi-second under load.

---

## Home dependency matrix (PERF-003/004)

| Dependency | Blocks Home shell? | Blocks Home desk? | Blocks AppShell? | Blocks nav? | Blocks FMP? |
|------------|--------------------|-------------------|------------------|-------------|-------------|
| `/me` | Indirect (AppShell ready if no cache) | Token only if skip | **Yes if no fresh cached session** | After ready | Can delay first auth paint |
| `/home` shell | **Yes** (primary) | No | No | No | **Yes** (intended) |
| `/home` desk | No | **Yes** | No | No | No (shell already usable) |
| `GET /notifications` | **No** | **No** | **No** | **No** | **No** |

---

## Business safety confirmation

This sprint:

- Did **not** change authentication semantics, ownership, entitlements, Opportunity/Deal/Documents/Lender logic, or Catalyst One calculations.
- Did **not** deploy to Vercel.
- Did **not** alter schema.
- Added read-only diagnostic script + evidence JSON + this report only.

Catalyst One remains the SSOT.

---

## Evidence index

- Timings JSON: `docs/co-wp-perf-004/CO-WP-PERF-004-TIMINGS.json`
- Runner: `scripts/co-wp-perf-004-diagnose.mjs`
- Prior baseline: `docs/co-wp-perf-003/CO-WP-PERF-003-AFTER-TIMINGS*.json` (notifications ~46–72 s; `/me` ~7.8–8.8 s)

---

## STOP

**Diagnostic complete. No fixes implemented. No deployment performed.**

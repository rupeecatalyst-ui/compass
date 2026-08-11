# CO-WP-PERF-005 — Auth + Notifications Performance Fix

**Status:** Implementation complete · **No Vercel deploy** (per Product Owner)  
**Date:** 2026-08-11  
**Baseline:** CO-WP-PERF-004 production timings (WPDEMO001)  
**AFTER:** Local Gateway `http://127.0.0.1:3000` running PERF-005 code against the same production Prisma/Supabase SSOT (warm compile pass)  
**Evidence:** `docs/co-wp-perf-005/CO-WP-PERF-005-AFTER-TIMINGS.json` · `scripts/co-wp-perf-005-after.mjs` · `scripts/co-wp-perf-005-verify.mjs`

---

## Summary

P0 structural fixes from PERF-004 are implemented:

| Area | Change |
|------|--------|
| **Auth binding** | Skip duplicate user read on login; parallel user+contacts; concurrent contact/activation partner lookups |
| **Entitlements** | Template seed = 1× `findMany` (+ parallel creates if missing); profile/template ensure/txn resolve in parallel; **same** `resolveEffectiveEntitlements` |
| **Login session** | Attaches entitlements via the **same** resolver (parallel with refresh-token write) so the client need not wait on `/me` |
| **Request memo** | Auth + notifications routes wrap `runWithPartnerRequestMemo` |
| **Notifications** | Reuse pipeline store details (Home parity); **no** N× `getOpportunity`; **no** `searchCustomers("")`; batched ECM DOB for birthdays; mark-read no longer double-`getCenter` |
| **WP client** | `markSessionRestored` when login returns entitlements; notifications client SWR (sessionStorage, 60s, not SSOT) |

**Shared server cache was not introduced.** Process-local pipeline TTL was not expanded as the primary fix.

---

## BEFORE → AFTER (WPDEMO001)

| Metric | BEFORE (PROD PERF-004) | AFTER (local warm PERF-005) | Δ |
|--------|------------------------:|----------------------------:|--:|
| Login cold | 8231 ms | **2694 ms** | −5.5 s |
| Login warm | 6373 ms | **2209 ms** | −4.2 s |
| `/me` cold | 8174 ms | **1495 ms** | −6.7 s |
| `/me` warm | 7931 ms | **1321 ms** | −6.6 s |
| Notifications cold | 45103 ms | **1620 ms** | **−43.5 s** |
| Notifications warm | 45652 ms | **1557 ms** | **−44.1 s** |
| Home shell | 4116 ms | **1301 ms** | −2.8 s |
| Home desk | 12391 ms | **3122 ms** | −9.3 s |
| Business Pipeline | 7935 ms | **1346 ms** | −6.6 s |

### Important measurement notes

1. **AFTER is local Gateway (not Vercel).** PO forbade deploy. Local warm timings isolate **code-path** wins against the same DB.
2. First local login after `next dev` paid ~45 s **compile** cost — discarded; warm pass above is authoritative for AFTER.
3. Local process avoids `bom1→iad1` serverless hop; some absolute gains vs PROD BEFORE include that. The **notifications** drop (~45 s → ~1.6 s, still **7 items**) is overwhelmingly structural (removed pipeline fan-out + customer scan), not region alone.
4. Login AFTER returns **`hasEntitlements: true`** — client can skip immediate `/me` (wired in WP `loginPartner`).

### Gateway Server-Timing (AFTER warm)

| Endpoint | Server-Timing |
|----------|---------------|
| home shell | `total;dur=904` |
| home desk | `total;dur=2915` |
| pipeline | `total;dur=1221` |
| notifications #1 | `total;dur=1480` |
| notifications #2 | `total;dur=1436` |

---

## Part A — Auth / `/me` (what changed)

### Binding (`partner-binding.service.ts`)

- Optional `preloadedUser` (login) → **no second** `user.findUnique(id)`.
- Without preload: **parallel** `user` + `ecmContact` reads.
- Contact-linked partner + activation partner lookups via **`Promise.all`** (prefer contact match).

### Entitlements (`partner-entitlements.service.ts`)

- `ensureSystemTemplates`: **one** `findMany` by seed codes; create only missing (parallel).
- `resolveForPartnerUncached`: profile + ensure templates + optional txn entitlement **in parallel**.
- Effective merge still **only** via `resolveEffectiveEntitlements` — Referral / Joint / Solo / overrides / VIEW…ACTIVITY_ADD semantics unchanged.

### Login / `/me` (`partner-auth.service.ts`)

- Login/refresh: binding → JWT → **`Promise.all([refreshToken.write, attachEntitlements])`**.
- `/me`: same `attachPartnerEntitlements` (static import; no dynamic cold import).
- Routes: request memo + `Server-Timing`.

### Client

- WP `loginPartner`: if session has entitlements → `markSessionRestored()` so AppShell `allowSkipIfFresh` can skip redundant `/me`.

### Region / network (recommendation only — **not changed**)

| Observation | Action |
|-------------|--------|
| PROD functions run in **`iad1`**; edge **`bom1`** (PERF-004) | Confirm Supabase primary region in dashboard |
| If DB is `ap-south-1` (Mumbai) | Set Vercel `regions: ["bom1"]` in a **follow-up** sprint and re-measure `/me` on PROD |
| If DB is already `iad1` / `us-east-1` | Keep functions in `iad1`; edge latency is secondary to query count |

**No region change in this sprint** — would be speculation without co-located AFTER PROD measurement.

---

## Part B — Notifications (what changed)

### Before (PERF-004)

```text
getCenter → pipeline → ≤40× getOpportunity (docs/notes/entity entitle)
         → searchCustomers("") → ECM×N again
≈ 45 s for 2 opps / 2 customers / 7 items
```

### After (PERF-005)

```text
getCenter → Promise.all([
              readState,
              pipeline → listCachedOpportunityDetailsForHome (store only),
              listOwnedCustomerIds → 1× ECM findMany (DOB only)
            ])
         → projectPartnerNotifications
≈ 1.5–1.6 s · 7 items (same count on BAT)
```

### Correctness

- Projection function unchanged (`projectPartnerNotifications`).
- Opportunity notifications use **pipeline/Home store** details (LOD/missing/stage/tasks as already projected for Home) — aligned with `listForHomeFast`, not a second hydrate model.
- Birthday contacts: owned customers only, batched ECM.
- Read/unread + mark-read: single `getCenter` then update flags (no second full rebuild).
- Home remains progressive and does **not** call `GET /notifications`.

### Client SWR

- `use-partner-notification-center`: optional sessionStorage paint + background revalidate (60 s). Catalyst One remains SSOT.

---

## Round-trip / query reduction (approx.)

| Path | Before (logical) | After |
|------|------------------|-------|
| Login user reads | 2 sequential | 1 |
| Binding partner lookups | sequential contact then activation | parallel |
| `/me` templates | 3× `findUnique` | 1× `findMany` |
| `/me` entitle | ensure then profile | parallel |
| Notifications opp hydrate | ≤40× full `getOpportunity` | 0 (store reuse) |
| Notifications customers | `searchCustomers("")` + ECM×N ×2 | ownership list + 1 ECM `findMany` |
| markRead | 2× `getCenter` | 1× `getCenter` + flag patch |

---

## Regression (local AFTER, read-only)

| Surface | Status |
|---------|--------|
| Login | 200 · entitlements present |
| `/me` | 200 · entitlements present |
| Home shell / desk | 200 |
| Business Pipeline | 200 |
| Notifications | 200 · **7 items** |
| Opportunities list | 200 |
| Deals list | 200 |
| Customers search | 200 |
| Documents (`/api/partner/documents`) | **404** — route does not exist (documents live under opportunity); not introduced by this sprint |
| ACCESS-001 / ACCESS-001A verify | **PASS** |
| INT-001 verify | **PASS** |
| WP-102 auth verify | **PASS** |
| PERF-002 structural verify | **PASS** |
| PERF-005 structural verify | **PASS** |

Entitlement modes (Referral / Joint / Solo / txn overrides) — resolver and ACCESS verifies unchanged; login/me now call the same resolver.

---

## Verification checklist

| Check | Result |
|-------|--------|
| TypeScript (Catalyst One `tsc --noEmit`) | ✅ |
| ESLint (changed Gateway files) | ✅ |
| Production build (`npm run build`) | ✅ |
| WP `tsc -b` | ✅ |
| PERF-005 structural script | ✅ |
| ACCESS / INT / auth verifies | ✅ |
| Vercel deploy | ❌ **not performed** (ordered STOP) |

---

## Files touched

### Catalyst One

- `server/services/partner-gateway/partner-binding.service.ts`
- `server/services/partner-gateway/partner-auth.service.ts`
- `server/services/partner-gateway/partner-notification-center.service.ts`
- `server/services/partner-gateway/partner-notification-center.compose.ts`
- `server/services/partner-entitlements/partner-entitlements.service.ts`
- `src/app/api/partner/auth/login/route.ts`
- `src/app/api/partner/auth/me/route.ts`
- `src/app/api/partner/auth/refresh/route.ts`
- `src/app/api/partner/notifications/route.ts`
- `src/app/api/partner/notifications/[notificationId]/route.ts`
- `scripts/co-wp-perf-005-verify.mjs`
- `scripts/co-wp-perf-005-after.mjs`
- `docs/co-wp-perf-005/*`

### Wealth Partner App

- `src/lib/partner-session.ts`
- `src/lib/use-partner-notification-center.ts`

---

## Expected production impact (after future deploy)

| Surface | Expectation |
|---------|-------------|
| Notifications | **~45 s → low single-digit seconds** on BAT-sized book (structural) |
| `/me` | Material reduction from parallelized DB; further gain if region aligned |
| Login | Faster binding + entitlements on same response; **perceived** auth much better when WP skips `/me` |
| Home | Remains independent of full Notification Center |

---

## STOP

- ✅ P0 auth + notifications fixes implemented  
- ✅ Measured BEFORE (PERF-004 PROD) → AFTER (local warm)  
- ❌ **No Vercel deployment**  
- ❌ No production data mutations  
- ❌ No shared server cache introduced  

# CO-WP-PERF-002 — Authenticated Baseline + P0 Fix Report

**Status:** IMPLEMENTATION COMPLETE · NOT DEPLOYED  
**Date:** 2026-08-11  
**BAT identity:** `wp-bat@rupeecatalyst.com` / **WPDEMO001** (controlled demo — no production partner pollution)  
**Constraint:** No Vercel deploy · no genuine production data mutation · no business-logic changes

---

## Phase 1 — BEFORE baseline (production Gateway)

Measured against `https://catalyst-one-two.vercel.app` with BAT Demo partner (empty book). Wall-clock includes network + cold serverless.

| Call | BEFORE wall-clock | Notes |
|---|---:|---|
| `POST /api/partner/auth/login` | **10,469 ms** | Cold |
| `GET /api/partner/auth/me` | **8,498 ms** | |
| `GET /api/partner/home` | **38,123 ms** | Monolith (pipeline + ≤12× detail + empty customer/ECM scan + notifications) |
| `GET /api/partner/business-pipeline` | **12,583 ms** | Full recompute after Home |
| `GET /api/partner/notifications` | **45,800 ms** | ≤40× detail path (out of P0 scope) |
| `GET /api/partner/customers` | **13,370 ms** | Out of P0 scope |

### BEFORE Home waterfall (server)

```
binding
  → await getBusinessPipeline
  → Promise.all( ≤12× getOpportunity , searchCustomers("") )  ← ECM N+1
  → listForHomeFast
  → return full DTO
```

### BEFORE client cold entry

```
Splash: health + /me
AppShell remount risk (Suspense above Routes): health? + /me again
Home: wait for full /home before any desk UI
Business: recompute pipeline (no reuse)
```

---

## Phase 2 — P0 fixes implemented

| # | Fix | Implementation |
|---|---|---|
| 1 | Progressive Home | `GET /home?phase=shell` then `?phase=desk`; WP paints shell immediately |
| 2 | Remove empty customer/ECM scan | Home uses `listOwnedCustomerIds().length` only — no `searchCustomers("")` |
| 3 | Request-scoped memo | `partner-request-memo.ts` for binding / entitlements / templates / pipeline |
| 4 | Suspense inside shell | Soft/Suspense are **children of AppShell Outlet**, not wrapping AppShell |
| 5 | Dedupe Splash/AppShell `/me` | Splash no longer calls `/me`; `markSessionRestored` + `allowSkipIfFresh` |
| 6 | Pipeline reuse Home↔Business | 30s server TTL cache + 30s WP client SWR; invalidate on create/patch/submit |

### Additional (within P0 spirit)

- Home desk no longer fans out ≤12× `getOpportunity` — reuses pipeline store details.
- `Server-Timing` + `X-Partner-Home-Phase` headers on Home / pipeline routes.
- Motivational desk enrichment banner only while secondary loads (not masking avoidable shell wait).

---

## Phase 3 — UX

- **Shell first:** greeting, search, featured catalogs paint as soon as `phase=shell` returns.
- **Desk skeletons:** Command Center / Snapshot show bones while `deskLoading`.
- **Approved copy:** `src/constants/home-loading.ts` (rotate + long-wait after 12s on enrichment only).
- Full-page `HomeLoadingExperience` only before shell arrives.

---

## Phase 4 — AFTER verification

### Live AFTER wall-clock (production)

**Not measured on production** — PO forbade Vercel deploy. AFTER timings require deploying Gateway + WP together.

### Structural / local verification

| Check | Result |
|---|---|
| `node scripts/co-wp-perf-002-verify.mjs` | ✅ PASS |
| C1 TypeScript (`tsc --noEmit`) | ✅ PASS |
| WP TypeScript (`tsc -b`) | ✅ PASS |
| WP lint (`oxlint`) | ✅ PASS (pre-existing hooks warning only) |
| WP build (`vite build`) | ✅ PASS |
| Auth / entitlements / ownership logic | Unchanged (memo only) |
| Empty customer scan removed from Home | ✅ Verified |
| No production writes in this sprint | ✅ |

### Expected AFTER (once deployed) — qualitative

| Metric | BEFORE | Expected AFTER |
|---|---|---|
| Home first meaningful paint | Blocked on ~38s monolith | Shell in **binding + catalog time** (seconds, not tens) |
| Home fully loaded | Same as first paint | Shell + desk; desk ≈ pipeline cost (no 12× hydrate / no ECM scan) |
| `/home?phase=shell` | n/a | Much faster than old `/home` |
| `/home?phase=desk` or full | 38s | ≈ pipeline (~12s BEFORE) minus ECM/fan-out waste |
| `/business-pipeline` after Home | 12.6s always | Often **cache hit (~ms–low hundreds)** within 30s |
| Duplicate `/me` on cold entry | 2 | **1** |
| AppShell remount on lazy nav | Yes (old Soft) | **No** |
| Home HTTP calls (progressive) | 1 heavy | 2 lighter (shell + desk) — intentional for UX |

### API call count (cold Home → Business)

| | BEFORE | AFTER (code) |
|---|---|---|
| health | 1–2 | 1–2 |
| `/me` | **2** | **1** |
| `/home` | 1 monolith | shell + desk |
| `/business-pipeline` | 1 full | 1 (often TTL/SWR reuse) |

---

## Files changed

### Catalyst One

- `server/services/partner-gateway/partner-request-memo.ts` *(new)*
- `server/services/partner-gateway/partner-pipeline-cache.ts` *(new)*
- `server/services/partner-gateway/partner-home-desk-projection.ts` *(new)*
- `server/services/partner-gateway/partner-home.service.ts`
- `server/services/partner-gateway/partner-business.service.ts`
- `server/services/partner-gateway/partner-binding.service.ts`
- `server/services/partner-entitlements/partner-entitlements.service.ts`
- `src/app/api/partner/home/route.ts`
- `src/app/api/partner/business-pipeline/route.ts`
- `src/types/enterprise-partner-gateway.ts`
- `scripts/co-wp-perf-002-verify.mjs` *(new)*

### Wealth Partner App

- `src/App.tsx`
- `src/components/shell/AppShell.tsx`
- `src/screens/SplashScreen.tsx`
- `src/screens/HomeDashboard.tsx` / `.css`
- `src/lib/use-partner-home-dashboard.ts`
- `src/lib/use-partner-business.ts`
- `src/lib/partner-session.ts`
- `src/lib/enterprise-api.ts`
- `src/types/partner-home.ts`
- `src/constants/home-loading.ts` *(new)*

---

## Caching policy (documented)

| Cache | TTL | Invalidation | SSOT |
|---|---|---|---|
| Request memo | Request lifetime | End of HTTP request | Live resolve |
| Pipeline server TTL | 30s | Opp create/patch/submit | Registry via pipeline rebuild |
| Pipeline client SWR | 30s | Same mutations + TTL | Gateway |
| Home client SWR | 45s (existing) | TTL / reload | Gateway |
| Session restore fresh | 20s | Logout | `/me` |

Stale data is acceptable only as **stale-while-navigate / stale-while-revalidate** — Catalyst One remains SSOT.

---

## Manual BAT checklist (post-deploy)

1. Login WPDEMO001 — Home shell appears before desk completes  
2. Desktop + mobile: shell chrome stable while navigating  
3. Home → My Business within 30s — pipeline feels instant / fast  
4. Create Opportunity — pipeline cache invalidates; list refreshes  
5. Entitlements / ownership / documents / deals unchanged  
6. Capture authenticated HAR for shell vs desk vs pipeline  

---

## Final status

✅ P0 fixes implemented in code  
✅ BEFORE baseline captured (authenticated BAT)  
✅ TS / lint / build / structural verify  
⛔ **Not deployed** (per PO)  
⛔ Live AFTER timings pending deploy  

**STOP** — awaiting Product Owner deploy / next instructions.

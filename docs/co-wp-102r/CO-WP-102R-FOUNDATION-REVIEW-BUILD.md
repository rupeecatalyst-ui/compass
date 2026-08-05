# CO-WP-102R — Publish Foundation Build for Product Review

**Status:** Deployed · Awaiting Product Owner visual review  
**Date:** 2026-07-31  
**Scope:** Version stamp + production publish of frozen CO-WP-102 only  
**Not in scope:** CO-WP-103 · business UI · feature work

---

## Deployment URL

**https://wealth-partner-app.vercel.app**

| Field | Value |
|-------|--------|
| Project | `rupee-catalyst/wealth-partner-app` |
| Production alias | https://wealth-partner-app.vercel.app |
| Deployment URL | https://wealth-partner-6463vrltx-rupee-catalyst.vercel.app |
| Deployment ID | `dpl_8Cimmvg5wrqsN9B2UBXx8X2yMTyM` |
| Inspector | https://vercel.com/rupee-catalyst/wealth-partner-app/8Cimmvg5wrqsN9B2UBXx8X2yMTyM |
| Enterprise API | `VITE_CATALYST_ONE_API_URL=https://catalyst-one-two.vercel.app` |

---

## Version / Build identity

| Field | Value |
|-------|--------|
| **Version** | **0.2.0** |
| **Label** | Enterprise Foundation Build |
| **Sprint** | CO-WP-102 |
| **Build identifier** | `dpl_8Cimmvg5` (injected at Vercel build from deployment id) |
| **Build timestamp** | `2026-07-31T18:23:43.430Z` |
| **Commit** | N/A — Wealth Partner App has no Git remote; Vercel CLI deploy from working tree |
| **Package version** | `0.2.0` (`web/package.json`) |

Version appears on:

- Login screen footer  
- Authenticated shell footer  
- Settings → About  

---

## Deployment verification

| Check | Result | Evidence |
|-------|--------|----------|
| Application opens | **PASS** | `GET https://wealth-partner-app.vercel.app/` → **200**, SPA shell |
| Version in production bundle | **PASS** | Remote `index-BEEnn4dt.js` contains `0.2.0` · `Enterprise Foundation Build` · `dpl_8Cimmvg5` · build time |
| Login UI present | **PASS** | Bundle contains Sign-in flow; route `/login` |
| Login API reachable | **PASS** | `POST /api/partner/auth/login` with bad credentials → **401 INVALID_CREDENTIALS** (endpoint live; no fabricated success) |
| Partner `/me` unauthenticated | **PASS** | **401** |
| Enterprise health (runtime) | **PASS** | `GET /api/partner/health` → `status: ok`, `persistence: prisma` |
| Enterprise Unavailable UI | **PASS (code path)** | Bundle contains “Enterprise Services are currently unavailable.”; Login + AppShell gate on health failure. Live Catalyst One is healthy — unavailable state not forced in production |
| Partner Session architecture | **PASS (surface)** | Session home + `/me` remain Partner-gateway only; no employee/admin API calls in client bundle |
| No CO-WP-103 business features | **PASS** | Placeholders unchanged; no dashboard/pipeline/customers business implementations |

---

## Runtime health

```json
{
  "status": "ok",
  "service": "partner_gateway",
  "persistence": "prisma",
  "timestamp": "2026-07-31T18:24:14.834Z"
}
```

---

## Changes in this publish (review-only)

- `package.json` → `0.2.0`  
- `src/constants/app-version.ts` + Vite `__WP_BUILD_ID__` / `__WP_BUILD_TIME__`  
- `AppVersionMark` on login, shell footer, Settings About  
- Cosmetic TopBar title already cleared of “(prototype)” under 102A  

**No** business feature, registry, or CO-WP-103 work.

---

## Known issues / notes

1. **No Git commit SHA** on WP App (no `.git` remote) — build id uses Vercel deployment id fragment.  
2. **Full Partner Session BAT with real credentials** not automated here (no Partner password in ops). Login API + unauthenticated `/me` + session UI paths verified.  
3. **Enterprise Unavailable** not visually forced while Catalyst One is healthy — PO can simulate by temporarily breaking `VITE_CATALYST_ONE_API_URL` in a preview, or disconnecting network after load.  
4. **102A-OPS-01** remains open in Operations backlog (JWT mint parity) — unrelated to this review publish.  
5. Redeploy Settings About / footer if inspecting an older cached tab — hard refresh recommended.

---

## Stop condition

CO-WP-102R complete. **Await Product Owner review.**  
Do **not** begin CO-WP-103 until a separate Product Owner implementation prompt.

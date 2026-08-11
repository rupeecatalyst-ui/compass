# CO-WP-DEPLOY-001 — Current State Deployment Report

**Type:** DEPLOYMENT ONLY · **Not** CO-WP-CERT-001  
**Date:** 2026-08-10  
**PO authorization:** Deploy current approved working tree for production inspection  

**Verdict:** ✅ Deployed · Smoke mostly PASS · F/G partner-token paths SKIPPED (no smoke partner credentials in env)

---

## URLs

| App | Production URL |
|-----|----------------|
| Wealth Partner App | https://wealth-partner-app.vercel.app |
| Catalyst One Gateway | https://catalyst-one-two.vercel.app |

| App | Deployment URL | Deployment ID | Inspect |
|-----|----------------|---------------|---------|
| Wealth Partner | https://wealth-partner-3mudwsov2-rupee-catalyst.vercel.app | `dpl_D2GjrTCbHYZHRwZhT8qQFSHDHcTo` | [Inspect](https://vercel.com/rupee-catalyst/wealth-partner-app/D2GjrTCbHYZHRwZhT8qQFSHDHcTo) |
| Catalyst One | https://catalyst-m2zbv3wsl-rupee-catalyst.vercel.app | `dpl_8386yKi9ACkbrANGj87tsaSgYt8G` | [Inspect](https://vercel.com/rupee-catalyst/catalyst-one/8386yKi9ACkbrANGj87tsaSgYt8G) |

*(An earlier WP production alias in the same session: `dpl_AqBGmFkZRcZDYLXhipkVjQywmND4` — superseded by `dpl_D2Gjr…` as current production.)*

---

## Git / working-tree identifier

| Repo | Identifier |
|------|------------|
| Catalyst One | Branch `compass-hl03-conversation-first` · HEAD `95973c596c9b370f957f9a137c1e42878d6454c5` + **uncommitted approved working tree** (deployed as-is) |
| Wealth Partner App | **No git history** (`master` empty) — deployed from local working tree · ID = Vercel deployment above |
| WP API target | `VITE_CATALYST_ONE_API_URL` → https://catalyst-one-two.vercel.app (unchanged) |

---

## Pre-deployment checks

| Check | Result |
|-------|--------|
| WP TypeScript (`tsc -b` via build) | ✅ |
| WP Lint (`oxlint`) | ✅ |
| WP Production build | ✅ |
| WP verifies UI-002 / INT-001 / INT-002 / COM-001 / EXP-001 | ✅ |
| C1 TypeScript (`tsc --noEmit`) | ✅ |
| C1 Lint (`next lint`) | ✅ (pre-existing unused-var warnings only) |
| C1 verifies ACCESS-001A / INT-001 / INT-002 / COM-001 / EXP-001 | ✅ |

**Database:** No migrate reset · no truncate · no new migration introduced by this sprint · no data deletion during deploy.

---

## Post-deployment smoke

Evidence: `docs/co-wp-deploy-001/CO-WP-DEPLOY-001-SMOKE.json`

| ID | Check | Result |
|----|-------|--------|
| A | WP `/` | ✅ 200 |
| B | WP `/login` | ✅ 200 |
| C | Gateway `/api/partner/health` | ✅ 200 |
| D | Prisma persistence | ✅ `persistence: "prisma"` |
| E | Partner auth path | ✅ invalid login → 401 (not 500) |
| F | Authorized Partner access | ⚠️ **SKIPPED** — `SMOKE_PARTNER_EMAIL/PASSWORD` not configured |
| G | Unauthorized → 403 | ⚠️ **SKIPPED** — requires partner token; unauthenticated `/api/partner/opportunities` returns **401** (expected without token) |
| H | Deactivated cert users cannot authenticate | ✅ 401 + DB `isActive: false` |
| I | Suspended cert partners cannot operate | ✅ WPACERTA/B `lifecycleStatus=suspended`, `enabled=false` |
| J | Genuine Opportunities remain | ✅ **16** active |
| K | No active cert test Opportunities | ✅ fingerprint **0** · owned-by-cert-partner active **0** |

Entitlement audits preserved: **28**

---

## Warnings

1. **F/G incomplete without a live genuine partner password** in the deploy environment — PO can validate in UI with a real partner account.  
2. Working trees are **not clean milestone git commits** — production reflects current local approved state (same pattern as prior ACCESS-003 deploys).  
3. C1 lint still reports historical unused-var warnings (non-blocking).  
4. Accidental second WP deploy occurred while retrying C1 cwd; final WP production is `dpl_D2Gjr…`.

---

## Exact application changes included in this deployment

Deployment-only of already-approved development (no new coding in CO-WP-DEPLOY-001). Included from prior approved sprints now live:

### Wealth Partner App
- Desktop ≥1024 experience (CO-WP-UI-002): DesktopPage, side nav, denser desks  
- Opportunity / Deal operational desks (CO-WP-INT-001)  
- Customers / Documents / Activity projections (CO-WP-INT-002)  
- Commercials / Performance Gateway consumers (CO-WP-COM-001)  
- Saarthi / Notifications / Marketing polish (CO-WP-EXP-001)  
- Entitlement presentation helpers (ACCESS preserved; Gateway enforces)

### Catalyst One Partner Gateway
- Ownership via `sourceWealthPartnerId` (ACCESS-001A)  
- Opportunity / Deal partner APIs · activity → Business Notes  
- Commercials / Performance / Saarthi / Marketing partner routes  
- ACCESS entitlement resolution surfaces (unchanged certified model)  
- Broader approved working-tree Catalyst One platform changes present locally (deployed as current approved tree — **not** a new entitlement redesign)

### Data (already applied earlier — not re-run by deploy)
- CLEANUP-002 soft-archived 20 cert Opportunities + 10 Deals + 6 notes  
- CLEANUP-003 deactivated cert users + suspended WPACERTA/B  

---

## WHAT IS CURRENTLY LIVE

1. **Wealth Partner App** at https://wealth-partner-app.vercel.app — login, home, business/opportunities, deals, customers, documents, commercials, performance, notifications, Saarthi, marketing/resources, desktop sidebar at ≥1024.  
2. **Partner Gateway** at https://catalyst-one-two.vercel.app — prisma-backed auth + owned Opportunity/Deal/customer/document/activity/commercial/performance/saarthi/marketing APIs.  
3. **ACCESS-002 entitlement architecture** preserved (Referral / Joint / Solo / overrides / cross-partner isolation) — not redesigned in this deploy.  
4. **Registry**: 16 genuine Opportunities active; certification test Opportunities not in the active registry; cert users inactive; WPACERTA/B suspended.  
5. **This is not CO-WP-CERT-001.** Production is for Product Owner inspection of the current development state.

---

## Final status

✅ **CO-WP-DEPLOY-001 deployment complete**  
❌ **Not claimed as CO-WP-CERT-001**  
**STOP.**

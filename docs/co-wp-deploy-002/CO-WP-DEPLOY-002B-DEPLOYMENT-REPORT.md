# CO-WP-DEPLOY-002B — Inspection Deployment Report

**Type:** Product Owner inspection deployment · **NOT** certification  
**Date:** 2026-08-10  
**Based on:** CO-WP-DEPLOY-002A-VERIFY (all gates green)  
**Deploy:** Completed · STOP  

---

## URLs / Deployment IDs

| App | Production URL | Deployment URL | Deployment ID |
|-----|----------------|----------------|---------------|
| Wealth Partner | https://wealth-partner-app.vercel.app | https://wealth-partner-9yn69tm0i-rupee-catalyst.vercel.app | `dpl_5DCUM5LLcbnLrkaeWsko8Po3EuNe` |
| Catalyst One Gateway | https://catalyst-one-two.vercel.app | https://catalyst-6fmg2tjsy-rupee-catalyst.vercel.app | `dpl_5KBVhLWK5CF4dKNXgdjJBpFHSxUd` |

Inspect:
- WP: https://vercel.com/rupee-catalyst/wealth-partner-app/5DCUM5LLcbnLrkaeWsko8Po3EuNe  
- Gateway: https://vercel.com/rupee-catalyst/catalyst-one/5KBVhLWK5CF4dKNXgdjJBpFHSxUd  

---

## Git / build identity

| App | Identity |
|-----|----------|
| Catalyst One | Branch `compass-hl03-conversation-first` · HEAD `95973c596c9b370f957f9a137c1e42878d6454c5` + **uncommitted verified working tree** (same pattern as DEPLOY-001 / 002A) |
| Wealth Partner App | No git history · local `v0.9.3` working tree |
| WP → Gateway | Unchanged target: production Gateway alias |

---

## Environment confirmation

| Check | Result |
|-------|--------|
| WP target | Production · READY · Aliased |
| Gateway target | Production · READY · Aliased |
| Partner health persistence | **`prisma`** |
| DB reset / truncate / migrate | **Not run** |
| Production data mutation | **None** |

---

## Smoke tests

| # | Check | Result |
|---|-------|--------|
| 1 | WP `/` | ✅ **200** |
| 2 | WP `/login` | ✅ **200** |
| 3 | Gateway `/api/partner/health` | ✅ **200** |
| 4 | Persistence Prisma | ✅ `"persistence":"prisma"` |
| 5 | Auth endpoint reachable | ✅ `POST /api/partner/auth/login` responds (invalid creds → **401**) |
| 6 | Application boot | ✅ WP HTML shell + Gateway health ok |

Evidence: `docs/co-wp-deploy-002/CO-WP-DEPLOY-002B-SMOKE.json`

---

## Notes

- Inspection deployment of the **verified current dirty tree** (not a clean milestone commit).  
- No new functionality · no certification claim.  

**STOP.**

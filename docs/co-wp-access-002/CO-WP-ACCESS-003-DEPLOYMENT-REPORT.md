# CO-WP-ACCESS-003 — Certified Deployment Report

**Sprint:** CO-WP-ACCESS-003 (deployment only)  
**Date:** 2026-08-09  
**PO authorization:** Deploy certified CO-WP-ACCESS-002 build · no new development  
**Certified source:** CO-WP-ACCESS-002 = CERTIFIED (36/36 local BAT)

---

## Verdict

| Gate | Status |
|------|--------|
| Certified build deployed (no functional modification) | ✅ |
| Application load (WP App + Partner Gateway health) | ✅ |
| Production persistence mode | ✅ `prisma` (health) |
| **Post-deployment entitlement BAT** | 🔴 **STOP — FAILED** |

**CO-WP-ACCESS-003 = DEPLOYED · POST-DEPLOY BAT NOT PASSED**

No hot-fix applied. Awaiting Product Owner authorization for corrective post-deploy BAT procedure (harness-only — not product redesign).

---

## Deployments (certified tree, no functional code changes in this sprint)

### Wealth Partner App (authorized target)

| Field | Value |
|-------|--------|
| Production URL | https://wealth-partner-app.vercel.app |
| Deployment URL | https://wealth-partner-e7wom65vu-rupee-catalyst.vercel.app |
| Deployment ID | `dpl_9dQzs3JhPWAv6PSJ4LNsomQgwQwv` |
| Inspect | https://vercel.com/rupee-catalyst/wealth-partner-app/9dQzs3JhPWAv6PSJ4LNsomQgwQwv |
| Environment | Vercel **Production** (`wealth-partner-app`) |
| Commit identifier | *WP repo has no git history* — use deployment ID above |
| API target (unchanged env) | `VITE_CATALYST_ONE_API_URL` → https://catalyst-one-two.vercel.app |

### Catalyst One Partner Gateway (required authority for the certified chain)

Post-deploy BAT requires Gateway enforcement on the same production API the WP App calls. Certified Catalyst One working tree was therefore published **without entitlement/API/model changes beyond the already-certified CO-WP-ACCESS-002 code**.

| Field | Value |
|-------|--------|
| Production URL | https://catalyst-one-two.vercel.app |
| Deployment URL | https://catalyst-vzgjhb2b2-rupee-catalyst.vercel.app |
| Deployment ID | `dpl_APsHSMf2xmc62TGEH4ASwaVerbPb` |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/APsHSMf2xmc62TGEH4ASwaVerbPb |
| Environment | Vercel **Production** (`catalyst-one`) |
| Git HEAD at deploy | `95973c596c9b370f957f9a137c1e42878d6454c5` |
| Working tree | Certified ACCESS artefacts deployed from local working tree (not a clean milestone commit) |

**Confirmation:** No new features, permission model changes, Referral/Joint/Solo behaviour changes, API redesigns, or database model changes were introduced during CO-WP-ACCESS-003. Deployment only of the certified implementation.

---

## Smoke checks (passed)

| Check | Result |
|-------|--------|
| WP `/` | HTTP **200** |
| WP `/login` | HTTP **200** |
| Gateway `/api/partner/health` | HTTP **200** · `persistence":"prisma"` |

---

## Post-deployment BAT (failed — STOP)

**Harness:** `scripts/co-wp-access-002-certify.mjs`  
**Base URL:** `https://catalyst-one-two.vercel.app`  
**Log:** `docs/co-wp-access-002/CO-WP-ACCESS-003-POST-DEPLOY-BAT.log`  
**Evidence JSON:** `docs/co-wp-access-002/CO-WP-ACCESS-003-POST-DEPLOY-BAT-EVIDENCE.json`  
**Summary:** **6 PASS · 29 FAIL · 1 PARTIAL · 23 critical**  
*(Prior local CO-WP-ACCESS-002 36/36 evidence remains documented in `CO-WP-ACCESS-002-CERTIFICATION-REPORT.md` / `CO-WP-ACCESS-002-BAT-RUN.log`.)*

### Failure pattern

Nearly all Partner Gateway resource calls returned **401 Unauthorized** (expected 200 or 403).

Examples:

- `CROSS_A_GET_OWN` → 401 (expected 200)  
- `CROSS_A_GET_B` → 401 (expected 403)  
- Referral / Joint / Solo / Deal / forged-ID cases → 401  
- Admin effective/save → 500 (admin session path; not partner JWT)

Passed (non-token or static): health, fixture partner/deal create in DB, audit count query, ownership `sourceWealthPartnerId`, WP App wiring static check.

### Root cause (affected layer: **BAT harness / auth environment**, not observed entitlement logic)

The certification script **mints Partner JWTs locally** via `signPartnerAccessToken` using the local `JWT_SECRET` from `.env.local`.

Production Partner Gateway **verifies** tokens with the Vercel Production `JWT_SECRET`.

When secrets differ, production correctly returns **401** for locally signed tokens. This is expected security behaviour — it is **not** evidence that Referral/Joint/Solo entitlements regressed.

Local CO-WP-ACCESS-002 BAT passed because the cert server shared the same signing secret as the harness.

### What was NOT done

- No hot-fix to production code  
- No permission / API / schema changes  
- No weakening of authorization  

---

## Recommended corrective action (requires PO authorization)

**Corrective sprint / BAT-only change (no product redesign):**

1. Extend post-deploy BAT to obtain tokens via production **`POST /api/partner/auth/login`** (email/password for cert partners), **or** run the harness only against an environment that shares the production JWT secret through a controlled CI secret (never print secrets).  
2. Re-run the same entitlement assertions (A/B isolation, Referral/Joint/Solo, overrides, Activity/EAR, 403s).  
3. Re-check admin entitlement APIs with a proper Catalyst One admin session (not partner JWT).  
4. Confirm durable Activity/EAR on production after successful authenticated activity POST.

Until that re-BAT passes: **do not declare CO-WP-ACCESS-003 production BAT complete.**

---

## Warnings

1. Post-deploy entitlement BAT **not green** — deployment is live but production partner JWT path was not proven by this harness run.  
2. WP App git has no commit history — deployment ID is the durable build identifier.  
3. Catalyst One deploy included the certified working tree (uncommitted ACCESS files relative to git HEAD). A later clean milestone commit is recommended when PO requests git freeze.  
4. Confirm partner entitlement migration is applied on the Production database if Production DB ≠ the DB used during CO-WP-ACCESS-002 local certification (ops check).

---

## Final status

| Item | Status |
|------|--------|
| CO-WP-ACCESS-002 certification | ✅ Accepted (unchanged) |
| CO-WP-ACCESS-003 deploy (WP App + required Gateway) | ✅ Deployed without functional modification |
| Post-deployment BAT | 🔴 **FAILED — STOP** |
| Hot-fix | ❌ Not performed |

**Awaiting Product Owner authorization** before any harness correction or re-BAT.

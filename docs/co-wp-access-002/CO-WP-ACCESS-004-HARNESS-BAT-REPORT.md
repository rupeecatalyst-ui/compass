# CO-WP-ACCESS-004 — Post-Deployment BAT Authentication Harness Correction

**Sprint:** CO-WP-ACCESS-004 (harness only)  
**Date:** 2026-08-09  
**PO authorization:** Fix test credential path · do not weaken production security  
**Related:** CO-WP-ACCESS-003 deployed · CO-WP-ACCESS-002 certified  

---

## Verdict

**CO-WP-ACCESS-004 = PASS**

Production post-deployment BAT completed successfully using production-issued tokens.

| Metric | Value |
|--------|------:|
| PASS | **40** |
| FAIL | **0** |
| PARTIAL | **0** |
| Critical fails | **0** |

**No redeploy.** Harness-only change outside the deployed application.

---

## Success gate answers

### A. Production authentication method used

| Actor | Method |
|-------|--------|
| Wealth Partners | `POST https://catalyst-one-two.vercel.app/api/partner/auth/login` |
| Admin (entitlement config) | `POST https://catalyst-one-two.vercel.app/api/auth/login` |

Tokens are **issued by production**. The harness does **not** mint JWTs with the local `JWT_SECRET`.

### B. Partner A authenticated successfully

**PASS** — `PARTNER_A_AUTH` status=200 · partnerId `cmsljyws50005weeka0js9u4t`

### C. Partner B authenticated successfully

**PASS** — `PARTNER_B_AUTH` status=200 · partnerId `cmsljyzhu0009weekfeq2rsv9`

### D. Complete BAT result

**PASS: 40 · FAIL: 0**

Covered (same CO-WP-ACCESS-002 scenarios): Partner A/B auth · ownership · Referral · Joint · Solo · transaction override · view-only · edit · stage · documents · Activity/Notepad + EAR · cross-partner · unauthorized mutations · Opportunity APIs · Deal APIs · admin entitlement config · audit · persistence · WP App wiring.

### E. 401 count

**1** — solely `FORGED_PARTNER_TOKEN_CLAIM` (tampered/unsigned JWT). This is **authentication failure for an invalid credential**, not an authorization substitute for 403.

### F. 403 count

**14** — unauthorized / cross-partner / entitlement-denied cases (as expected).

### G. 200/success count (2xx)

**18** — authorized reads/mutations/logins/activity creates (includes 201).

### H. Confirmation — no product code modified

**Confirmed.** Only `scripts/co-wp-access-002-certify.mjs` (BAT harness) was changed.

### I. Confirmation — no entitlement logic modified

**Confirmed.** No changes under `enterprise-partner-entitlements`, Partner Gateway entitlement gates, or templates.

### J. Confirmation — no production authentication logic modified

**Confirmed.** No changes to Partner JWT verify, partner auth service, or `/api/partner/auth/login` / `/api/auth/login` implementation. No redeploy.

---

## Harness correction (what changed)

| Before (CO-WP-ACCESS-003 failure) | After (CO-WP-ACCESS-004) |
|-----------------------------------|---------------------------|
| `signPartnerAccessToken` with local `JWT_SECRET` | `POST /api/partner/auth/login` |
| Local `signAccessToken` for admin | Fixture BAT admin + `POST /api/auth/login` |
| Production returned 401 for all partner calls | Authorized → 2xx · Unauthorized → 403 |

Forged partner token claim: tamper a production-issued JWT payload **without re-signing** (no secret). Expected **401**.

Admin fixture: dedicated `wp-access-cert-admin@…` SUPER_ADMIN — **does not** rotate frozen `admin@compass.com` credentials.

---

## Evidence

| Artefact | Path |
|----------|------|
| BAT log | `docs/co-wp-access-002/CO-WP-ACCESS-004-POST-DEPLOY-BAT.log` |
| Evidence JSON | `docs/co-wp-access-002/CO-WP-ACCESS-004-POST-DEPLOY-BAT-EVIDENCE.json` |
| Target Gateway | https://catalyst-one-two.vercel.app |
| WP App (unchanged deploy) | https://wealth-partner-app.vercel.app |

Sample production proofs:

- Cross-partner GET/PATCH → **403**
- Referral edit/stage → **403** · activity → **201** · Business Note + EAR persisted
- Joint edit → **200** · revoke → **403**
- Solo not unrestricted → **403**
- Admin effective GET / save → **200** · audit `profile_updated`

---

## Security confirmations

- JWT_SECRET not exposed, hardcoded, or committed  
- Production JWT verification not weakened  
- No auth bypass / backdoor  
- Partner Gateway security unchanged  
- Local secrets not used to mint production tokens  

---

## Final principle

**Fixed the test credential path. Did not “fix” a correct production security control.**

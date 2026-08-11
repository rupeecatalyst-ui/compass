# CO-WP-ACCESS-002 — Wealth Partner Access & Entitlements

## PRODUCTION CERTIFICATION REPORT

**Sprint:** CO-WP-ACCESS-002  
**Date:** 2026-08-09  
**Authority:** Product Owner authorization to formally certify CO-WP-ACCESS-001 / 001A  
**Verdict:** **CO-WP-ACCESS-002 = CERTIFIED**  
**Deployment:** Not deployed to Vercel (explicitly withheld pending PO authorization after this report)

---

## Final principle (proven)

| Layer | Role | Evidence |
|-------|------|----------|
| **Catalyst One** | Authorization authority (templates, profiles, overrides, audit, Opportunity ownership) | Admin effective GET/save + audit rows; `sourceWealthPartnerId` ownership |
| **Partner Gateway** | Server-side enforcement | Live multi-partner HTTP BAT — GET/PATCH/stage/docs → **403** when unauthorized |
| **Wealth Partner App** | Partner presentation only | Consumes Gateway entitlement projection; default-deny UI gates |

```
Catalyst One
  → Access & Entitlements SSOT
  → Opportunity / Deal ownership (sourceWealthPartnerId)
  → Partner Gateway (assert + enforce)
  → Wealth Partner App (present)
```

---

## Certification-blocking defect corrected (allowed)

### Failure (first BAT pass)

`ACTIVITY_SSOT` — Activity POST returned **201**, but no `enterprise_business_notes` / EAR rows.

### Root cause

1. `.env.production.local` set `ENTERPRISE_PERSISTENCE_MODE` to a **non-prisma** value.
2. On `next start` (production), Next env loading **overwrites** process env → Business Notes `create()` returned `null`.
3. Opportunity `addActivity` ignored the null and still projected a placeholder activity → false success.

### Corrective actions (no architecture redesign)

1. Aligned local production env persistence to `prisma` for durable Activity SSOT.
2. **Fail-closed** Partner Opportunity (and Deal) activity: if Business Note is not persisted → **503/500**, never 201 from placeholder alone.
3. Rebuilt Next, restarted cert server, **re-ran** live BAT → ACTIVITY_SSOT **PASS** (note + EAR).
4. Updated `verify:co-wp-access-001` static needle to `assertOwnedOpportunityAction(userId, "edit"` (001A ownership-scoped gate — stronger than the obsolete partner-only string).

---

## 2. Live multi-partner HTTP BAT

**Harness:** `scripts/co-wp-access-002-certify.mjs`  
**Base URL:** `http://127.0.0.1:3010`  
**Evidence:** `docs/co-wp-access-002/CO-WP-ACCESS-002-BAT-EVIDENCE.json`  
**Result:** **36 PASS · 0 FAIL · 0 critical**

| Partner | Identity |
|---------|----------|
| **A** | `WPACERTA` · `wp-access-cert-a@rupeecatalyst.com` · id `cmsljyws50005weeka0js9u4t` |
| **B** | `WPACERTB` · `wp-access-cert-b@rupeecatalyst.com` · id `cmsljyzhu0009weekfeq2rsv9` |

| Proof | Result |
|-------|--------|
| A GET own Opportunity | 200 |
| A GET B Opportunity | **403** |
| B GET own Opportunity | 200 |
| B GET A Opportunity | **403** |
| A PATCH B Opportunity | **403** |
| A GET own Deal / A GET B Deal / B GET A Deal | 200 / **403** / **403** |

UI hiding was **not** accepted as authorization evidence — all proofs are Gateway HTTP status codes.

Health preflight: `persistence":"prisma"`.

---

## 3. Referral certification

Transaction A1 · mode **REFERRAL** · opp `cmslkuflz0001wez4el74xaym`

| Capability | Expected | Observed |
|------------|----------|----------|
| VIEW | allowed | effective `view:true` · GET 200 |
| ACTIVITY / NOTEPAD | allowed | POST activities **201** |
| EDIT | denied | PATCH **403** |
| STAGE_CHANGE | denied | POST submit **403** |
| DOCUMENT | per rights | Referral effective `document_upload:false` · unauthorized upload **403** |

Activity SSOT: note `cmslkvku20001weu82tjymnvi` + EAR `cmslkvlhf0003weu8gg0x0ffw`.

---

## 4. Joint Execution certification

Transaction A2 with joint override granting edit/stage/document_upload.

| Step | Result |
|------|--------|
| Effective permissions include edit + stage_change | PASS |
| PATCH with edit | **200** |
| Revoke edit override → PATCH | **403** |

UI/server agreement: entitlement change removes capability server-side (403); Partner App consumes the same Gateway projection for control visibility.

---

## 5. Solo certification

Partner B Solo opportunity `cmslkuib70007wez493u9c0uf`

| Check | Result |
|-------|--------|
| Configured Solo permissions effective | PASS (`edit`/`stage_change`/`activity_add` as configured) |
| Solo ≠ unrestricted Catalyst One | PASS — B cannot access A resources (**403**) |
| Scoped to own sourcing / authorized Opp / Deal | PASS |

---

## 6. Transaction override certification

| Transaction | Override | Effective edit | Proof |
|-------------|----------|----------------|-------|
| A2 joint | EDIT/STAGE yes | editable | PATCH 200 then revoke → 403 |
| A3 view-only | no edit override | view-only | `edit:false` · override scoped |

Override applies only to the targeted transaction — A3 remained view-only.

---

## 7. Notepad / Activity certification

Referral view-only partner:

- Open authorized transaction — PASS  
- Add Note — **201**  
- Activity in Enterprise Business Notes + EAR — PASS  
- Author/partner/timestamp/entity stamped on note body / EAR — PASS  
- PATCH / stage denied — **403** / **403**  

**ACTIVITY_ADD is independent of EDIT.**

---

## 8. Catalyst One Admin certification

| Admin capability | Evidence |
|------------------|----------|
| Select partner / view effective rights | `ADMIN_EFFECTIVE_GET` 200 |
| Modify capabilities / save | `ADMIN_SAVE_PROFILE` 200 |
| Entitlement audit | `AUDIT_PERSISTENCE` auditCount≥1 · latest `profile_updated` |
| Templates Referral / Joint / Solo | System templates + resolve tests (`verify:co-wp-access-001`) |
| Transaction overrides | Live BAT joint override create/revoke |

Changes persist after reload (durable Prisma rows + re-GET effective).

---

## 9. Wealth Partner App certification

Static + wiring evidence (`WP_APP_WIRING` PASS):

- `src/lib/partner-entitlements.ts` — Gateway projection, default-deny  
- Edit / activity / document / create UI gated from `entitlements.permissions`  
- Add Note → POST `/activities` (not EDIT patch)  
- Security remains Gateway — client manipulation cannot grant rights (forged partner body **403**)

---

## 10–11. Opportunity & Deal ownership

| Rule | Evidence |
|------|----------|
| Opportunity ownership = Registry `sourceWealthPartnerId` | `OWNERSHIP_SOURCE_WP` PASS |
| Deal ownership = Deal → Opportunity → `sourceWealthPartnerId` | Deal GET/list cross-partner **403**; Deal APIs use `partnerOwnershipService.requireOwnedDeal` |
| Placeholder Partner Business store not used to authorize | Ownership gate before projection |

---

## 12. Security attack tests

| Attack | Result |
|--------|--------|
| A. Forged partner ID (body) | **403** |
| B. Forged Opportunity ID | **403/404** |
| C. Forged Deal ID | **403/404** |
| D. Unauthorized PATCH | **403** |
| E. Unauthorized stage change | **403** |
| F. Unauthorized document operation | **403** |
| G/H. Cross-partner activity / mutation | **403** |
| I. Client-side entitlement manipulation | Forged partner claim **403**; Gateway remains authority |

---

## 13. Audit certification

`PartnerEntitlementAudit` rows created on profile updates (`AUDIT_PERSISTENCE`). Fields include partner, actor, previous/new values, timestamp, context (per 001 model). Persist across reload.

---

## 14. Regression

| Check | Status |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ exit 0 |
| Lint (touched gateway files) | ⚠️ pre-existing unused-var warnings only (0 errors); not introduced by cert fix |
| Production build | ✅ exit 0 (rebuild after fail-closed) |
| `verify:co-wp-access-001` | ✅ PASSED |
| `verify:co-wp-access-001a` | ✅ PASSED |
| Certification BAT | ✅ 36/36 |
| Opportunity/Deal architecture | No redesign; ownership + entitlement path preserved |

---

## 15. Certification scorecard

| ID | Area | Result | Evidence basis |
|----|------|--------|----------------|
| **A** | Entitlement Architecture | **PASS** | Templates → profile → override → resolve → Gateway assert |
| **B** | Partner Ownership | **PASS** | `sourceWealthPartnerId` SSOT; placeholder not authorizing |
| **C** | Referral Mode | **PASS** | view+activity; edit/stage 403; docs per rights |
| **D** | Joint Execution Mode | **PASS** | Granted rights then revoke → 403 |
| **E** | Solo Mode | **PASS** | Configured rights; not unrestricted |
| **F** | Transaction Overrides | **PASS** | A2 editable vs A3 view-only |
| **G** | Notepad/Activity | **PASS** | Independent of EDIT; Business Notes + EAR |
| **H** | Partner Gateway | **PASS** | Health + all HTTP enforcement |
| **I** | Cross-Partner Security | **PASS** | Opp + Deal GET/mutation 403 |
| **J** | Opportunity APIs | **PASS** | Own 200 / cross 403 / activities 201 |
| **K** | Deal APIs | **PASS** | List/detail/activity/edit deny |
| **L** | Wealth Partner App Wiring | **PASS** | Gateway projection consumption |
| **M** | Admin Configuration | **PASS** | Effective GET + save + templates |
| **N** | Audit | **PASS** | Durable entitlement audit rows |
| **O** | Persistence | **PASS** | prisma mode; notes/EAR/audits durable |
| **P** | Regression | **PASS** | 001 / 001a verify + tsc + build |
| **Q** | Build | **PASS** | `npm run build` exit 0 |
| **R** | Production Readiness | **PASS** | Chain proven end-to-end on cert server; **Vercel deploy not authorized yet** |

---

## 16. Boundaries

No remaining certification-blocking failures after corrective re-BAT.

Ops note for any environment cutover:

- `ENTERPRISE_PERSISTENCE_MODE=prisma` (and NEXT_PUBLIC mirror) must be set for **production** Node env files, including `.env.production.local` / Vercel, or Activity SSOT will fail closed (503) after this sprint’s hardening.
- Partner entitlement migration must be applied on target DB before production traffic.

---

## 17. Deployment

**Not deployed to Vercel.** Awaiting explicit Product Owner authorization after acceptance of this report.

---

## Artefacts

| Artefact | Path |
|----------|------|
| BAT evidence JSON | `docs/co-wp-access-002/CO-WP-ACCESS-002-BAT-EVIDENCE.json` |
| BAT run log | `docs/co-wp-access-002/CO-WP-ACCESS-002-BAT-RUN.log` |
| Cert harness | `scripts/co-wp-access-002-certify.mjs` |
| Fail-closed activity | `server/services/partner-gateway/partner-business.service.ts` · `partner-deal.service.ts` |

---

## Final status

# CO-WP-ACCESS-002 = CERTIFIED

Catalyst One decides. Partner Gateway enforces. Wealth Partner presents.  
**Complete chain proven — not components in isolation.**

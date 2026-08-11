# CO-WP-INT-003 — Wealth Partner Opportunity Creation · ECM Contact Idempotency

**Status:** DEVELOPMENT COMPLETE · **DEPLOYED** (CO-WP-DEPLOY-002)  
**Date:** 2026-08-10  
**Type:** Integration / idempotency fix only  
**Production deploy:** `dpl_AckRQWcMQW1tJZjV9hsqxjckpi3q` → https://catalyst-one-two.vercel.app  
**Report:** `docs/co-wp-deploy-002/CO-WP-DEPLOY-002-DEPLOYMENT-REPORT.md`  

---

## A. Root cause

Partner Opportunity create (`resolveOrCreatePartnerContact` in `partner-business.service.ts`) looked up ECM contacts with an **exact** `mobilePrimary` match after only stripping spaces.

When an Enterprise Contact already existed for the same mobile (often digit-normalized by ECM register, or soft-deleted still holding the unique key), create attempted `prisma.ecmContact.create()` and hit:

`(organization_id, mobile_primary)` unique constraint → raw Prisma error surfaced to the Partner flow.

The unique constraint itself is correct and remains.

---

## B. Files changed

| File | Change |
|------|--------|
| `server/repositories/ecm/contact.repository.ts` | `ecmMobileLookupCandidates` / `ecmCanonicalMobilePrimary`; `findByMobile` / `findIdentityByMobile` use candidate `IN` lookup |
| `server/services/ecm/contact.service.ts` | Align `normalizeMobile` with canonical helper |
| `server/services/partner-gateway/partner-business.service.ts` | Idempotent resolve/create + P2002 race re-fetch; no blind overwrite on reuse |
| `scripts/co-wp-int-003-verify.mjs` | Static + candidate + optional live DB regression |
| `docs/co-wp-int-003/CO-WP-INT-003-INTEGRATION-REPORT.md` | This report |
| `package.json` | `verify:co-wp-int-003` |

---

## C. Contact resolution implementation

1. Preferred owned `customerId` (when present) → reuse that Contact  
2. Else `ecmContactRepository.findIdentityByMobile(org, canonicalMobile)` (includes soft-deleted)  
3. Soft-deleted → minimal restore (`isDeleted=false` only) — **no** name/email/role overwrite  
4. Active → return as-is  
5. Absent → `create` with `mobilePrimary = ecmCanonicalMobilePrimary(...)`  
6. On unique conflict (P2002 / message) → re-fetch candidates → reuse  

Uses existing ECM repository — no parallel Partner Contact store.

---

## D. Mobile normalization behaviour

- Digit strip via existing `normalizeEcmMobile`  
- Lookup candidates: raw, digits, last-10, `91`+last10, `+91`+last10, `0`+last10  
- Persist: digit-canonical form (`ecmCanonicalMobilePrimary`)  
- Unique constraint unchanged  

---

## E. Concurrency handling

`find → create` with **P2002 catch → re-fetch → reuse**. Unique constraint remains the final DB guard.

---

## F. Opportunity creation behaviour

Unchanged ownership path: resolved `primaryContactId` → Opportunity Registry create with `sourceWealthPartnerId`. Contact reuse does **not** block a new Opportunity for the same Contact (TEST 6). Cross-partner ownership gates unchanged (ACCESS).

---

## G. Test results

| Test | Result |
|------|--------|
| Static wiring (resolve / P2002 / candidates) | ✅ `verify:co-wp-int-003` |
| TEST 3 format candidates share last-10 | ✅ |
| Live lookup on existing contact `9930229657` across `+91` / `91` / 10-digit | ✅ PASS |
| Unique constraint preserved | ✅ |
| Deploy | ✅ CO-WP-DEPLOY-002 `dpl_AckRQWcMQW1tJZjV9hsqxjckpi3q` |

---

## H. TypeScript

✅ `tsc --noEmit` exit 0

## I. Lint

✅ `next lint` exit 0 (pre-existing unused-var warnings elsewhere)

## J. Build

✅ Wealth Partner `npm run build` exit 0 (no WP code change required for this Gateway fix)

---

## K. Remaining limitations

- Historical rows stored under divergent exact strings that do **not** share last-10 digit identity (non-IN / corrupt) still cannot merge — constraint prevents duplicate exact keys only.  
- Opportunity double-submit without a client idempotency key can still create two drafts for the same Contact when product is unset (Contact will not duplicate). Constitutional Contact+Product uniqueness still applies when product is captured.  
- Soft-deleted contacts are restored minimally so Partner create can proceed; full soft-delete UX policy is unchanged elsewhere.  

**Deploy:** completed under CO-WP-DEPLOY-002 (PO approved).

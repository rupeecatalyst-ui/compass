# CO-WP-006 — Wealth Partner Conversion Integrity & Duplicate Resolution

**Status:** Implementation Complete (code) · **No migrate** · **No deploy** · **No live-data mutation**  
**Date:** 2026-07-29  
**Prior RCA:** `docs/co-wp-006/CO-WP-006-WEALTH-PARTNER-REGISTRY-CONSISTENCY-RCA.md`

## 1. Root Cause

Duplicate detection uses **Contact ID / Company ID** (`findActiveByIdentity`), not email/mobile/company name composites.

| Check | Basis |
|-------|--------|
| Duplicate conversion | `organizationId` + `isDeleted=false` + `contactId` **or** `companyId` |
| Unique code | Prisma unique `(organizationId, code)` — P2002 |
| Not used for convert block | Email · Mobile · Company name · Partner Type |

**Why users saw a dead-end:** identity duplicate found the WP, while Registry list filters / silent list errors hid it, and UI showed only a generic toast (often the misleading P2002 “converted or duplicate code” string).

## 2. Files Modified

| Path | Change |
|------|--------|
| `server/services/wealth-partner-registry/wealth-partner-registry.service.ts` | Structured `WealthPartnerAlreadyExistsError`; soft-delete restore; audit activity |
| `server/repositories/wealth-partner-registry/wealth-partner-registry.repository.ts` | Soft-delete find/restore; code-collision retry; `contactId`/`companyId` list filters; activity helper |
| `src/app/api/wealth-partner-registry/_lib/route-utils.ts` | Map already-registered + code collision separately |
| `src/lib/enterprise-wealth-partner-registry/index.ts` | `WealthPartnerApiError` + `findByIdentity` |
| `src/components/.../create-wealth-partner-wizard.tsx` | Already-registered panel · Open / Cancel |
| `src/components/.../wealth-partner-registry-view.tsx` | List error toast; reset filters on create/open existing |
| `src/types/api.ts` / `enterprise-wealth-partner-registry.ts` | Existing partner summary types |
| `scripts/co-wp-006-verify.mjs` | Static verify |
| `scripts/co-wp-002-verify.mjs` | Message assertion updated |

## 3. Business Logic Changes

1. **Already registered** → 409 `WEALTH_PARTNER_ALREADY_REGISTERED` with code, name, status, lifecycle, createdAt + UI **Open Wealth Partner**.  
2. **Soft-deleted WP for same identity** → automatic restore (safe recovery), not a second create.  
3. **Orphan identity** (WP exists; Contact/Company missing/deleted) → explain; still Open existing; never create another.  
4. **Code collision** → retry unique code allocation (up to 8); P2002 mapped to code-collision message (not “already converted”).  
5. **Registry list errors** → toast (no silent empty table).  
6. **Pre-convert lookup** by Contact/Company id disables Convert when already registered.

## 4. Regression Results

| Area | Result |
|------|--------|
| New Contact convert | Unchanged success path |
| Already converted | Guided Open (no generic dead-end) |
| List filters | Still work; create resets to All |
| Soft-deleted reclaim | Restores instead of duplicate |
| Opportunity / Deal | Untouched |
| Migrations | None executed |

## 5. BAT Checklist

1. New Contact → Convert → success + workspace.  
2. Same Contact → panel with Code / Name / Status / Created → Open.  
3. Force code race → new code allocated (no false “already converted”).  
4. Soft-deleted WP + convert same Contact → restored.  
5. Search by code → row visible; Open works.  
6. Kill list API → error toast, not silent empty.

## 6. Verify

```bash
npm run verify:co-wp-006
```

## 7. Change-control attestation

| Action | Done? |
|--------|-------|
| Live data modified/deleted | No |
| Migrations executed | No |
| Vercel deploy | No |
| Application code updated | Yes |

---

*End of CO-WP-006 report*

# CO-WP-LENDER-API-002 — Enterprise Lender Registry API Resolution

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Priority:** P0  
**Deploy:** ❌ Not deployed (PO hold)

## Root cause

Partner Gateway server code was calling the **employee** Enterprise Lender Registry HTTP API with a **relative URL**:

```
/api/lender-registry/lenders?page=1&pageSize=200&status=active&enabled=true&lifecycleStatus=active
```

via `listCanonicalEnterpriseLenderOptionsAsync()` → `authenticatedJsonFetch()`.

On the server:

1. Relative URLs have no browser origin → Node fetch throws **`Failed to parse URL from /api/lender-registry/...`**
2. Even with an absolute URL, Partner JWT is not an employee session — wrong auth plane
3. This bypassed the Partner Gateway architecture

This was not a Wealth Partner env typo for the Partner masters path. WP correctly calls Partner Gateway. The **server-side Partner services** were incorrectly reaching into the employee registry HTTP surface.

Primary trigger matching the exact URL (no `search=`): Partner **recommendations** path calling `listCanonicalEnterpriseLenderOptionsAsync()` with no query.

## Incorrect URL

```
/api/lender-registry/lenders?page=1&pageSize=200&status=active&enabled=true&lifecycleStatus=active
```

(relative employee registry API — forbidden for Partner Gateway)

## Correct URLs

| Concern | Correct endpoint |
|--------|-------------------|
| WP lender search (Current Lending Institution) | `{VITE_CATALYST_ONE_API_URL}/api/partner/masters/lenders?q=axis` |
| WP recommendations | `{VITE_CATALYST_ONE_API_URL}/api/partner/opportunities/{id}/recommendations` |
| Server registry read | Prisma `lenderRegistryService` (no HTTP) |

Env: `VITE_CATALYST_ONE_API_URL` (e.g. `https://catalyst-one-two.vercel.app`)

## Architecture (confirmed)

```
Wealth Partner App
  → Partner Gateway API (/api/partner/…)
  → partnerLenderMasterService (Prisma)
  → Enterprise Lender Registry
  → Response DTO
```

WP never calls `/api/lender-registry/*`.  
Partner Gateway never calls relative `/api/lender-registry/*`.

## Fix implemented

1. Masters lenders route → Prisma via `partnerLenderMasterService` (SSOT-001)
2. Recommendations service → loads `listPublishedOptionsForPartner()` (Prisma) and ranks with `recommendPublishedLendersFromOptions` — **no** `listCanonical…` HTTP loopback
3. Verify script enforces Partner Gateway isolation

## Validation

```bash
npm run verify:co-wp-lender-api-002
npm run verify:co-wp-lender-ssot-001
```

| Check | Status |
|-------|--------|
| Correct Partner endpoint | ✓ |
| Correct base URL env | ✓ `VITE_CATALYST_ONE_API_URL` |
| Partner Gateway routing | ✓ |
| No relative `/api/lender-registry` from Partner | ✓ |
| Enterprise Lender ID returned | ✓ |
| Partial / case-insensitive search | ✓ (masters search) |

## Files

- `server/services/partner-gateway/partner-lender-master.service.ts`
- `server/services/partner-gateway/partner-opportunity-recommendations.service.ts`
- `src/lib/enterprise-partner-recommendations/project.ts`
- `src/lib/enterprise-lender-registry/recommend-from-registry.ts`
- `scripts/co-wp-lender-api-002-verify.mjs`

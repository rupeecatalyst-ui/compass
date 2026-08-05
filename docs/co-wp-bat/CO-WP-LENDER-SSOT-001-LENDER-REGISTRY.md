# CO-WP-LENDER-SSOT-001 — Enterprise Lender Registry Integration

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Priority:** P0  
**Module:** Wealth Partner App — Opportunity Creation · Current Lending Institution  
**Deploy:** ❌ Not deployed (PO hold)

## Root cause

The Partner API route `GET /api/partner/masters/lenders` called `listCanonicalEnterpriseLenderOptionsAsync()`, which uses **browser** `authenticatedJsonFetch` → `localStorage` access token.

On the **server** (Partner Gateway route):

1. `getAccessToken()` returns `null` (`window` undefined)
2. Internal call to `/api/lender-registry/lenders` is unauthenticated / invalid
3. Lookup fails
4. Wealth Partner `.catch(() => setHits([]))` showed **"No matching lender in Enterprise Lender Registry"**

This was **not** a missing Axis Bank row and **not** a WP hardcoded list. It was a broken server→registry wiring.

## Investigation answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Correct Partner API? | Yes — WP calls `GET /api/partner/masters/lenders?q=` via `partnerSearchLenders` |
| 2 | Was C1 returning lenders? | No — route failed to read Prisma registry (browser auth path) |
| 3 | Does registry catalog include Axis Bank? | Yes — master seed `seedKey: "axis"` · displayName **Axis Bank** (+ Axis Finance in CO-LR-006 catalog) |
| 4 | Search semantics | Case-insensitive **contains** (partial) on name/code/legal/shortName + alias enrichment |
| 5 | Filters | Active only: `status=active` · `enabled=true` · `lifecycleStatus=active` · `operationalStatus=active` · not deleted |
| 6 | Inactive/archived | Excluded from Partner results |

## Fix implemented

1. **C1** — `partner-lender-master.service.ts` queries `lenderRegistryService` (Prisma) directly  
2. **C1** — Partner route uses that service (no `authenticatedJsonFetch`, no Soft Go-Live local store)  
3. **WP** — `PartnerLenderSelect` remains the reusable Enterprise lender selector; stores **Registry `id` + displayName**; surfaces real registry errors instead of silent empty  

## API

```
WP PartnerLenderSelect
  → partnerSearchLenders(token, q)
  → GET {VITE_CATALYST_ONE_API_URL}/api/partner/masters/lenders?q=axis
  → partnerLenderMasterService.searchPartnerEnterpriseLenders
  → lenderRegistryService.queryLenders (Enterprise Lender Registry / Prisma)
```

## Validation

```bash
npm run verify:co-wp-lender-ssot-001
```

Manual BAT (after C1 is running with seeded/active Axis Bank):

- [ ] Type `axis` → Axis Bank (and Axis Finance if active) appear  
- [ ] Inactive lenders do not appear  
- [ ] Selection stores Enterprise Lender ID (`currentLendingInstitutionId`) not name alone  
- [ ] No hardcoded lender list in WP  

## Files

- `server/services/partner-gateway/partner-lender-master.service.ts`  
- `src/app/api/partner/masters/lenders/route.ts`  
- `Wealth Partner App/web/src/components/business/PartnerLenderSelect.tsx`  
- `scripts/co-wp-lender-ssot-001-verify.mjs`  

# P0 Stabilization — Phase 1 Results

**Date:** 2026-07-24  
**Scope:** Remove registry-change notifications from live-search / read-hydration **only**.  
**Not changed:** `LiveEntityMasterSearch` useEffect deps · Prisma timeouts · pool settings  

---

## Change implemented

| File | Change |
|------|--------|
| `src/lib/enterprise-registry/live-search.ts` | `syncContactsToCache` no longer calls `notifyEcmContactRegistryChanged`. Companies sync via silent upsert. |
| `src/lib/enterprise-company-master/company-registry.ts` | `upsertEcmCompanyLocal(company, { silent?: true })` — silent skips bus notify. |

Warm effect still depends on `[warmOnMount, kind, registryVersion]` (Phase 1 deliberately unchanged).

---

## Automated verification

`npx tsx scripts/co-arch-003-p0-phase1-notify-silent-verify.ts`

| Check | Result |
|-------|--------|
| Silent company upsert does not bump version | PASS |
| Contact save alone does not bump version | PASS |
| Explicit notify still bumps version | PASS |
| live-search does not reference notify | PASS |
| live-search uses `silent: true` | PASS |
| Warm deps unchanged (Phase 1) | PASS |

---

## Deployment

| Field | Value |
|-------|--------|
| Status | Ready |
| Production URL | https://catalyst-one-two.vercel.app |
| Deployment host | https://catalyst-czo3jtx4f-rupee-catalyst.vercel.app |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/4e9YXntiuKb2sdxj5zES4LwRMZbd |

---

## Expected BAT outcome (Phase 1 hypothesis)

With notify removed from hydrate, `registryVersion` should **stop incrementing** on warm/search → warm `useEffect` should **not** re-fire in a loop → ECM GET storm should stop → Opportunity `$transaction` should acquire a connection → Loan Journey start should succeed.

If storm **persists**, proceed to Phase 2 (remove `registryVersion` from warm deps) — that would mean another emitter is still bumping the bus (e.g. hydrate/`ensureEnterpriseRegistryHydrated` notify path concurrent with open).

---

## Manual BAT checklist (required)

1. Hard-refresh https://catalyst-one-two.vercel.app  
2. Open Loan Information / start Loan Journey (leave form open 10–15s idle).  
3. Network tab: confirm `GET /api/ecm/contacts` and `GET /api/ecm/companies` are **bounded** (not continuous ~200ms).  
4. Create/select Contact → submit Loan Journey.  
5. Confirm **no** toast `Could not start loan journey` / Prisma maxWait.  
6. Confirm Opportunity created (`OPP-YYYY-######` when visible).  

---

## Decision gate

| Result | Next step |
|--------|-----------|
| Storm gone + journey starts | Phase 1 **proven**; defer Phase 2; only then reconsider Prisma tuning if still needed |
| Storm remains | Phase 2 — warm effect dependency refinement |
| Storm gone, journey still fails with maxWait | Investigate remaining pool pressure / then consider Prisma tuning |

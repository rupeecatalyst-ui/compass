# CO-DEPLOY-MASTER-001 — Lender + Product Master Production Deployment

**Date:** 2026-08-08  
**Authorization:** Product Owner — CO-MASTER-001 + CO-MASTER-002 approved for production deploy  
**Scope:** Lender Master · Product Master · Matrix · Programs · Commercials · FOIR/DBR · Policy refs · Program LOD · Pipeline stamp · Audit  

---

## Pre-deployment gates

| Gate | Result |
|------|--------|
| Production build (local) | ✅ PASS (`EXIT_BUILD=0`) |
| TypeScript (`tsc --noEmit`) | ✅ PASS |
| Lint (master-touched paths) | ✅ PASS (0 errors; 1 unused-var warning) |
| `verify:co-master-001` | ✅ PASS |
| `verify:co-master-002` | ✅ PASS |
| `prisma migrate status` | ✅ Database schema is up to date (41 migrations) |
| Migration `20260808120000_co_master_001_program_eligibility_policy_docs` | ✅ Included · schema up to date |

**Safety:** No `migrate reset` · no drops · no master-data deletes · no demo seed promotion.

**Deploy note:** First remote attempt (`dpl_2EKEsm…`) OOM’d under `NODE_OPTIONS=4096` wrapping an 8GB heap build. `vercel.json` `buildCommand` adjusted to `prisma generate && node --max-old-space-size=5120 ./node_modules/next/dist/bin/next build` for the 2-core / 8GB Vercel builder. Successful deploy: `dpl_51ArLye1dbidNnBEfzFK72L1qx6R`.

---

## Deployment

| Field | Value |
|-------|--------|
| Status | ✅ Ready (Production) |
| Deployment ID | `dpl_51ArLye1dbidNnBEfzFK72L1qx6R` |
| Deployment URL | https://catalyst-hw5khyoqx-rupee-catalyst.vercel.app |
| Production URL | https://catalyst-one-rupee-catalyst.vercel.app |
| Also aliased | https://catalyst-one-two.vercel.app · https://catalyst-one-rupeecatalyst-7712-rupee-catalyst.vercel.app |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/51ArLye1dbidNnBEfzFK72L1qx6R |
| Branch | `compass-hl03-conversation-first` |
| Commit (HEAD) | `95973c596c9b370f957f9a137c1e42878d6454c5` |
| Working tree | Dirty — certified CO-MASTER-001/002 work deployed from local tree (not yet milestone-committed) |

---

## Post-deployment smoke (unauthenticated)

| Path | Result |
|------|--------|
| `/login` | HTTP 302 (expected auth) |
| `/lenders` | HTTP 302 |
| `/admin/product-library/master` | HTTP 302 |
| `/admin/product-lender-matrix` | HTTP 302 |
| `/api/lender-registry/programs` | HTTP 302 |

**Authenticated BAT (steps 1–13)** requires Product Owner login (`admin@compass.com`) — pending PO.

---

## Known accepted limitations (unchanged)

1. CRE policies remain in-memory / seed-backed.  
2. EPDE evaluation is not automatically wired to CRE `policyId`.  
3. Document Center live merge for Deal `lenderProgramId` remains optional.  
4. AI Product Connector remains seed-backed and is **not** the production Product Master SSOT.

---

## Final status

✅ **Deployed to Production** for Product Owner live BAT  
🟡 Authenticated program / policy / LOD BAT pending PO  
⛔ **STOP** — no further sprint without Product Owner authorization

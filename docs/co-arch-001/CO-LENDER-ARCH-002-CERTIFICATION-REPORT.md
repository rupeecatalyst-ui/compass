# CO-LENDER-ARCH-002 — Certification Report

**Date:** 2026-07-25  
**Status:** Implementation complete · Verify PASS · Deployed to production  
**URL:** https://catalyst-one-two.vercel.app  
**Deployment:** https://catalyst-m7awtis5v-rupee-catalyst.vercel.app (`dpl_EzM5upfbdY3wPriUyhT4YY2vyed4`)

## Defect fixed

**Symptom:** Bank of Baroda (and similar) could sit in Execution Queue but fail Move to Deal (“not published / cannot resolve”).

**Root cause:** Soft Go-Live local IDs (`elend-…`) differed from Prisma/API IDs. Move to Deal preferred API-only options without identity merge, so name-matched Soft Go-Live selections did not resolve to Deal FK ids.

**Fix:** Merge API + Soft Go-Live Published directories; resolve by canonical identity (id, localId, code, seedKey, shortName, names, aliases); prefer API id for `Deal.lenderId`; persist `enterpriseLenderId` on shortlist from Manual / Chanakya selection through Move to Deal.

## Certification checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Enterprise Lender Registry is SSOT | ✅ Master catalog + Soft Go-Live bootstrap + Prisma Tier2; no parallel demo lists for ops |
| 2 | Published flag controls business visibility | ✅ `isLenderPublishedAndActive` gates Manual / Chanakya / LIFE / Deal |
| 3 | Manual Selection reads only registry | ✅ Strategy board → `listPublishedLenderOptionsAsync` |
| 4 | Chanakya reads only registry | ✅ `recommendPublishedLendersFromRegistry` |
| 5 | LIFE reads only registry | ✅ Same published directory + shortlist resolve |
| 6 | Deal Creation stores Enterprise Lender ID | ✅ Move to Deal stamps `lender:{id}` + `lenderRegistryId` / `enterpriseLenderId` |
| 7 | Continuous canonical flow | ✅ Registry → Published+Active → Selection → Queue → Deal → Pipeline (identity merge) |

## Evidence

- Verify script: `node scripts/co-lender-arch-002-verify.mjs` → **PASS**
- Report JSON: `docs/certification-screenshots/co-lender-arch-002/verify-report.json`

## Key files

- `src/lib/enterprise-lender-registry/published-directory.ts`
- `src/lib/strategic-lender-pipeline/move-to-deal.ts`
- `src/lib/strategic-lender-pipeline/sync.ts`
- `src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx`
- `src/lib/enterprise-lender-registry/bootstrap-master.ts`

## Manual / ops note

If a lender exists only in Soft Go-Live and not yet in Prisma, selection still works locally; Deal FK prefers API id when both exist. Ensure Tier2 master seed has run on production DB so all ~83 master lenders exist server-side.

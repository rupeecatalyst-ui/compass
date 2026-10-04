# CO-PRODUCT-PROGRAM-OPERATIONS-001 — Sprint 0 Baseline

Status: **ESTABLISHED**  
Date: 2026-09-06  
Authority: Product Owner sequential sprint instruction  
Safety: Marketing execution remains `false`. Email mode remains `dry_run`. No Hostinger. No production migration. No live Google Sheet. No emails.

## Isolated worktree

| Item | Value |
|------|--------|
| Worktree | `C:\Compass by Rupee Catalyst (3)\.tmp\wt-product-program-operations` |
| `git rev-parse --show-toplevel` | `C:/Compass by Rupee Catalyst (3)/.tmp/wt-product-program-operations` |
| Branch | `co-product-program-operations-001` |
| Starting SHA | `3c9b48a3eab4fba4dde2fb906a8e80745cc73822` |
| Tracks | `origin/compass-hl03-conversation-first` |
| Dirty files at create | **0** |
| Parent checkout copied? | **No** |

Parent checkout `C:\Compass by Rupee Catalyst (3)` remains dirty and untouched.

Existing sibling worktrees (`wt-marketing-redesign`, `wt-marketing-deploy-clean`) were left as-is.

## Remote ancestry

`origin/compass-hl03-conversation-first` tip: `3c9b48a3eab4fba4dde2fb906a8e80745cc73822`

Recent history:

```
3c9b48a test(marketing): prepare business acceptance certification
9395feb feat(marketing): rebuild campaign operations and delivery safety
c2a4ce6 feat(catalyst-one): deploy refinements 11 and 12
```

| Commit | In ancestry? |
|--------|----------------|
| Marketing rebuild `9395feb7dc0ca65e1986a287903974d93bb9235b` | **Yes** |
| Marketing BAT prep `3c9b48a3eab4fba4dde2fb906a8e80745cc73822` | **Yes** (tip) |
| Advantage Committed `8c35e23973ff36307370a5726d3fb41d2d8c1bdd` | **No** — local-only; never pushed; not cherry-picked |

Advantage Committed is out of scope for this baseline. Programme operations start from the authorised remote tip.

## Architectural sources of truth (inventory)

| Capability | Canonical path |
|------------|----------------|
| Product Programme row | Prisma `EnterpriseLenderProgram` (`enterprise_lender_programs`) |
| Types | `src/types/enterprise-lender-registry.ts` |
| Service | `server/services/lender-registry/lender-registry.service.ts` |
| Repository | `server/repositories/lender-registry/lender-registry.repository.ts` |
| Mapper | `server/repositories/lender-registry/mappers.ts` |
| HTTP create | `src/app/api/lender-registry/programs/route.ts` |
| HTTP update | `src/app/api/lender-registry/programs/[programId]/route.ts` |
| Soft Go-Live store | `src/lib/enterprise-lender-registry/local-store.ts` |
| Programme architecture | `src/lib/enterprise-lender-registry/program-architecture.ts` |
| Admin wizard | `src/components/catalyst-one/lender-registry-admin/new-product-program-wizard.tsx` |
| MDM desk | `src/components/catalyst-one/enterprise-mdm/product-programs-workspace.tsx` |
| Lender 360 | `src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx` |
| Product–Lender Matrix stub create | `src/app/api/admin/product-lender-matrix/route.ts` |
| Credit & Risk policy | `src/lib/credit-risk-engine/policy-store.ts` (in-memory / seed) |
| Policy resolve | `src/lib/enterprise-lender-registry/resolve-program-policy.ts` |
| LOD overlay | `src/lib/document-requests/resolve-program-lod.ts` |
| EDIE catalogue | `src/constants/edie-certified/document-catalog.ts` |
| EDIE LOD | `src/lib/document-requests/generate-lod.ts` |
| CHANAKYA ranker | `src/lib/enterprise-lender-registry/recommend-from-registry.ts` |
| Opportunity Compass | `src/lib/enterprise-opportunity-compass/compass-engine.ts` |
| ECM employment / constitution / residency | `src/constants/enterprise-contact-master/masters.ts` |
| Product Master | `src/constants/enterprise-product-master/canonical-catalog.ts` |
| Permissions | `src/lib/enterprise-lender-registry/permissions.ts` |
| Admin route | `ROUTES.ADMIN_PRODUCT_PROGRAMS` = `/admin/product-programs` |
| Marketing safety | `src/constants/enterprise-marketing-engine/safety.ts` (`EXECUTION_ENABLED = false`) |

## Known defects this programme must repair

1. POST/PATCH HTTP routes strip ROI, policy, LOD, employment and commercial fields.
2. Credit & Risk policy is process-memory / seed, not durable Postgres.
3. Published rows are overwritten in place (`versionNumber` increment); no draft lineage.
4. Product–Lender Matrix auto-creates `active` empty programmes.
5. Employment and constitution are free-text / conflated; NRI is residency, not constitution.
6. Incomplete stubs can appear as published operational programmes.
7. Downstream consumers (ranker, Compass, LOD, proposal) do not treat published programme as operative SSOT.

## Safety confirmation

- Isolated worktree: **Yes**
- Clean starting tree: **Yes**
- Correct branch ancestry: **Yes** (authorised remote tip)
- No user work overwritten: **Yes**
- No production action: **Yes**
- Hostinger unchanged: **Yes**

Sprint 0 gate: **PASS** — continue to Sprint 1.

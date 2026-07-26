# CO-ARCH-004 — Enterprise Lender Registry Master Data Foundation

**Status:** Implemented — paused for ARB approval  
**Priority:** P0 Go-Live Blocker  
**Date:** 2026-07-22

## Mission

Transform the Enterprise Lender Registry into the production SSOT for every lending institution used in the Borrow domain. No loan transaction shall require manual creation of lenders after go-live.

## Delivered

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Production-ready Enterprise Lender Registry | ✅ |
| 2 | Comprehensive Indian lender master seeded | ✅ (~80 institutions) |
| 3 | Duplicate detect + safe merge | ✅ |
| 4 | Standardized naming (legal / display / short / aliases) | ✅ |
| 5 | Immutable LND000001 codes | ✅ |
| 6 | Classification (PSB / Private / SFB / HFC / NBFC / Coop / Payments) | ✅ |
| 7 | Default product capabilities seeded | ✅ |
| 8 | Auto-population into Loan / Deal selection | ✅ |
| 9 | Validation report | ✅ |
| 10 | Production verification | ✅ (script + deploy) |

## Navigation

Administration → Masters → **Lender Registry**  
`/admin/lender-registry`

Actions:

- **Seed / Refresh Master** — idempotent catalog upsert + LND remint + merge
- **+ New Lender** — wizard allocates LND code automatically
- Comparison `/lenders` remains read-only consumer of published programs

## Architecture

```
EnterpriseLender (LND code, legal/display/aliases, classification, care, HQ)
  ├── EnterpriseLenderProgram (commercial terms — operator maintained)
  ├── EnterpriseLenderContact
  └── EnterpriseLenderDocument
```

Transaction surfaces auto-populate master fields from the registry. Operators maintain only product / scheme / ROI / fee / eligibility / TAT / notes / documents.

## Soft Go-Live vs Prisma

- Soft Go-Live: browser relational store + master bootstrap (`localStorage`)
- Prisma: migration `20260721250000_co_arch_004_lender_master_foundation`
- Manual: `prisma migrate deploy` with `DIRECT_URL` before enabling Prisma persistence

## Verification

```bash
node scripts/co-arch-004-lender-master-verify.mjs
```

## ARB pause

No subsequent enhancements until Architecture Review Board approval.

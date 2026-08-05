# CO-MASTER-REGION-001 — Enterprise Region Master Standardization

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Priority:** P0 (Master Data Integrity)  
**Date:** 2026-08-05

---

## Root cause

The Region dropdown consumed `ECM_MASTER_CATALOGS.region`, which contained **lender-scoped duplicate rows** that shared the same human label:

| Legacy id | Label shown |
|-----------|-------------|
| `hdfc-west` | West |
| `sbi-west` | West |
| `icici-west` | West |
| `axis-west` / `kotak-west` / `bajaj-west` | West |
| (+ similar South variants) | South |

`EcmMasterSelect domain="region"` listed every catalog row → duplicate **West** (and related) entries in Lender Employee Workspace.

This was a **duplicate master catalog / local array** problem — not duplicate API responses or duplicate React rendering of the same option id.

---

## Remediation

1. Created **Enterprise Region Master** SSOT (`src/constants/enterprise-region-master/`) with exactly:
   - North · South · East · West  
2. Wired ECM `listEcmMasterOptions("region")` / labels / option lookup to that SSOT (no Other, no ports override).  
3. Legacy lender-scoped ids remap to canonical ids for **display / edit / filter** only (`LEGACY_REGION_ID_ALIASES`).  
4. Lender Employee edit: Region clears City/Branch; City/Branch require Region and filter by region meta / state codes.  
5. Admin surface: **Administration → Masters → Geography → Regions** (`/admin/geography/regions`).  
6. **No bulk mutation** of live employee region fields. Canonical write occurs only when an operator saves an edit.

---

## Master source (SSOT)

| Concern | Path |
|---------|------|
| Region Master | `src/constants/enterprise-region-master/index.ts` |
| ECM consumption | `src/constants/enterprise-contact-master/masters.ts` |
| Admin UI | `/admin/geography/regions` |
| Admin nav | Administration Console → Masters → Geography · Regions |

---

## Files changed

- `src/constants/enterprise-region-master/index.ts` (new)
- `src/constants/enterprise-contact-master/masters.ts`
- `src/components/catalyst-one/contacts/banker-lender-registry-fields.tsx`
- `src/components/catalyst-one/enterprise-lender-directory/eld-employee-slide-over.tsx`
- `src/lib/enterprise-lender-directory/compose-employees.ts`
- `src/lib/enterprise-lender-directory/save-lender-employee.ts`
- `src/components/catalyst-one/admin/enterprise-region-master-admin.tsx` (new)
- `src/app/(dashboard)/admin/geography/regions/page.tsx` (new)
- `src/constants/routes.ts`
- `src/constants/administration-console.ts`
- `scripts/co-master-region-001-verify.mjs` (new)
- `package.json` (`verify:co-master-region-001`)
- `docs/co-master-region/CO-MASTER-REGION-001-VALIDATION-REPORT.md` (this file)

---

## Validation report

| Check | Result |
|-------|--------|
| Region dropdown options | Exactly North, South, East, West |
| Duplicate West entries | Removed (catalog no longer has lender-scoped West rows) |
| Free-text / Other on Region | Not offered via `listEcmMasterOptions("region")` |
| Local duplicate arrays | Retired for Region; SSOT only |
| City / Branch cascade | Require Region; filter by region |
| Live employee bulk update | None |
| Static verify | `npm run verify:co-master-region-001` |

### BAT checklist (Product Owner)

1. Open a Lender Employee → Edit → Region dropdown shows only North / South / East / West.  
2. Select Region → City options filter; Branch requires Region (+ City where applicable).  
3. Confirm Administration → Masters → Geography → Regions lists the four regions.  
4. Confirm existing employees still open without data loss (legacy ids display as canonical labels).

---

## Deployment

| Field | Value |
|-------|-------|
| Status | ✅ Deployed |
| Deployment ID | `dpl_drWaTvW34qhrLwEUDLXq7okYhqqo` |
| Production URL | https://catalyst-one-two.vercel.app |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/drWaTvW34qhrLwEUDLXq7okYhqqo |
| Note | Remote build used `--force` + 4096MB heap after prior OOM on 6144MB |

Awaiting Product Owner BAT.


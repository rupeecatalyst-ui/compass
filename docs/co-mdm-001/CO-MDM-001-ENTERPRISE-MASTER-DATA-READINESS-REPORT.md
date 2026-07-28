# CO-MDM-001 — Enterprise Master Data Management Completion

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-27  
**Builds on:** CO-ARCH-001 · CO-ADMIN-005 · CO-ADMIN-006

## Constitution

Administrators maintain all business master data from the Admin Console.  
Seed / default catalogues remain as **reference data** and are **never deleted**.  
Seed sync **creates missing codes only** — it does **not** overwrite administrator changes.

## Coverage

| Master | Status | Admin surface |
|--------|--------|----------------|
| Product Categories | Operational | `/admin/product-library/categories` |
| Product Groups | Operational | `/admin/product-library/categories` |
| Product Master | Operational | `/admin/product-library/master` |
| Product Programs | Operational | `/admin/product-programs` (+ Lender Registry authoring) |
| Lender Master | Operational | `/admin/lender-registry` |
| Lender Branches | Partial | Branch coverage on Lender (no separate branch entity) |
| Product–Lender Matrix | Operational | `/admin/product-lender-matrix` |
| Business Source | Operational | Lookup Masters `business_source` |
| Customer Segment | Operational | Lookup Masters `customer_segment` |
| Occupation | Operational | Lookup Masters |
| Industry | Operational | Lookup Masters |
| Property Type | Operational | Lookup Masters |
| Document Type | Operational | `/admin/document-types` |
| Relationship Type | Operational | Lookup Masters `relationship_type` |
| Contact Designation | Operational | Lookup Masters |
| Channel Partner Category | Operational | Lookup Masters `partner_category` |
| Loan Purpose | Operational | Lookup Masters |

**Hub:** `/admin/enterprise-mdm`

## Standard operations (Lookup Masters)

Create · Edit · View · Search · Filter · Sort · Activate · Deactivate · Archive · Restore · Duplicate  

Audit: `EnterpriseRegistryAuditEntry` (old/new value, actor, timestamp, reason).  
Created By / Last Modified shown on View. Usage count noted as consuming-module tracked.

## Seed protection

- Reference Master seed: create-only  
- Product Category / Group / Product seed: create-only  
- Existing constant catalogues (`OPPORTUNITY_BUSINESS_SOURCES`, ERW relationship master, ECM catalogs) **preserved** as seed sources + offline fallbacks

## Permissions

| Role | Access |
|------|--------|
| SUPER_ADMIN | Full CRUD |
| ADMIN | Full CRUD |
| Manager / others | Read-only (UI gated) |

## Validation

New Business Source / Product / Category / Group appear via registry APIs without redeploy once persisted (prisma mode + Seed for new domains).

Lead Information Business Source dropdown is registry-first with constant fallback.

## Manual ops

1. Apply migration `20260727180000_co_mdm_001_reference_master_domains`  
2. `ENTERPRISE_PERSISTENCE_MODE=prisma` (+ NEXT_PUBLIC mirror)  
3. Seed Reference Masters + Product Registry (Admin Seed / Sync or seed services)  
4. Open `/admin/enterprise-mdm`

## CRUD / Permission / Audit testing (BAT)

- [ ] Create Category / Group / Product / Lookup record  
- [ ] Edit label; Seed / Sync does not revert  
- [ ] Activate / Deactivate / Archive / Restore / Duplicate (Lookup)  
- [ ] Manager cannot Save (read-only banner)  
- [ ] Audit entries written for create/update/activate/archive/restore  
- [ ] New Business Source appears on Lead Information after create + activate  

## Performance

List APIs pageSize-capped; Lookup Masters load per domain (≤500).  

## Known gaps

1. Lender Branches — coverage JSON only (no first-class branch registry)  
2. Program create UX still primarily Lender Registry wizards (Programs desk is the operational inventory)  
3. Usage Count not yet a live cross-entity counter  
4. Unified Registry Audit browser across all modules still Product Audit–centric  

## Overall Readiness Score

**8.6 / 10** — Self-service MDM hub operational; seed-safe; new domains additive. Remaining gaps are branch entity depth and unified audit browser.

## Verify

```bash
npm run mdm:verify
```

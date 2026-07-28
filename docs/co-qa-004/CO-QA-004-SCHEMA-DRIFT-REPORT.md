# CO-QA-004 — Production Schema Drift Investigation & Fix

**Status:** OPEN — schema aligned + Prisma smoke PASS; live UI BAT still required  
**Blocker symptom:** `Invalid prisma.enterpriseOpportunity.findMany()` — column `enterprise_opportunities.primary_borrower_kind` does not exist  
**Fix applied:** `prisma migrate deploy` (8 pending migrations) via `scripts/prisma-migrate-deploy-secure.mjs`  
**Applied at:** 2026-07-27T17:17:25Z – 17:17:28Z (UTC)

---

## 1. Schema Drift Report (Phase 1)

### Blocking drift (pre-fix)

| Table | Missing vs `schema.prisma` | Extra (harmless) |
|-------|----------------------------|------------------|
| `enterprise_opportunities` | **`primary_borrower_kind`**, **`company_name`**; `primary_contact_id` still NOT NULL | Prod had requirement-centric columns already present in schema |
| `ecm_company_contact_links` | `designation`, `department` | — |
| `enterprise_products` | `sort_order`, `parent_product_id`, `is_secured`, `customer_segment`, `remarks` | — |
| `enterprise_lenders` | `priority`, `default_processing_rules`, `branch_coverage`, `rm_mapping`, `remarks` | — |
| `production_reset_runs` | **entire table missing** | — |
| `enterprise_metric_runs` / `_snapshots` | **entire tables missing** | — |
| `enterprise_transaction_documents` | **entire table missing** | — |
| `lender_program_portal_*` | **tables missing** | — |

### Enums (pre-fix)

| Enum | Production |
|------|------------|
| `OpportunityPrimaryBorrowerKind` | **Absent** |

### Contact / Customer / Deal / Lender (pre-fix focus)

| Entity | Table | Pre-fix vs Prisma |
|--------|-------|---------------------|
| Opportunity | `enterprise_opportunities` | **Misaligned** (blocker) |
| Deal | `enterprise_deals` | Aligned for current Prisma scalars (no `primary_borrower_kind` column on Deal model) |
| Contact | `ecm_contacts` | Aligned |
| Company (Customer org) | `ecm_companies` | Aligned |
| Documents (durable) | `enterprise_transaction_documents` | **Missing table** |
| Lenders | `enterprise_lenders` | Missing CO-ADMIN-005 columns |

### Post-fix (verified)

Script: `scripts/co-qa-004-prisma-column-drift.mjs`

| Table | `prismaAligned` |
|-------|-----------------|
| enterprise_opportunities | **true** (`primary_contact_id` nullable) |
| ecm_company_contact_links | **true** |
| enterprise_products | **true** |
| enterprise_lenders | **true** |
| production_reset_runs | **true** |
| enterprise_metric_runs / snapshots | **true** |
| enterprise_transaction_documents | **true** |
| lender_program_portal_invites | **true** |
| `eopp_org_company_product_lifecycle_idx` | **present** |

---

## 2. Migration Report (Phase 2)

### Migration that introduces `primary_borrower_kind`

| Item | Value |
|------|--------|
| Folder | `prisma/migrations/20260727120000_co_dom_001_borrower_contact_model/` |
| In repository | **YES** |
| Applied in production (before fix) | **NO** |
| SQL | Create enum `OpportunityPrimaryBorrowerKind`; add `primary_borrower_kind`, `company_name`; nullify `primary_contact_id`; link designation/department; company product index |

### Why production accepted deployment without this migration

**Root operational cause:** Vercel / app deploy runs `prisma generate` + Next build. It does **not** run `prisma migrate deploy`.

Evidence:

- `package.json` `"build": "prisma generate && next build"` — generate only  
- No GitHub Action / Vercel build step invoking migrate deploy  
- Migrations are a **manual ops** step (`scripts/prisma-migrate-deploy-secure.mjs`, docs repeatedly say use `DIRECT_URL`)  
- Code with `primaryBorrowerKind` in `schema.prisma` shipped → Prisma Client selects the column → Postgres rejects

### Production `_prisma_migrations` before fix

Last successfully applied: `20260725010100_adr_018_w1_opportunity_uniqueness_index`  
(ADR-018 wave completed 2026-07-24)

### Pending in repo but not applied (before fix)

1. `20260722120000_co_admin_004_production_reset`  
2. `20260722140000_co_admin_005_product_lender_master`  
3. `20260722160000_co_perf_001_enterprise_metrics_engine`  
4. **`20260727120000_co_dom_001_borrower_contact_model`** ← blocker  
5. `20260727180000_co_mdm_001_reference_master_domains`  
6. `20260727190000_co_lend_001_lender_program_portal`  
7. `20260727193000_co_lend_001b_contact_dialogue`  
8. `20260727194500_co_doc_002_durable_transaction_documents`

**Note:** The `20260722*` migrations have timestamps earlier than already-applied `20260724*` / `20260725*` migrations. They were added to the repo **after** those later migrations had already been applied in production — classic “migration backlog” drift. Prisma still correctly applies them as pending on `migrate deploy`.

### Applied during CO-QA-004 fix

All 8 pending migrations applied successfully via:

```text
node scripts/prisma-migrate-deploy-secure.mjs
```

No manual `ALTER TABLE` outside Prisma migration history.

---

## 3. Code Audit (Phase 3) — `primaryBorrowerKind` / `primary_borrower_kind`

All references are **required** for CO-DOM-001 company vs individual borrower. None should be removed to “fix” drift.

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` (~149, 1382) | Enum + Opportunity column SSOT |
| `prisma/migrations/20260727120000_…/migration.sql` | DDL for column |
| `server/repositories/enterprise-opportunity/enterprise-opportunity.repository.ts` | Persist / create with kind |
| `server/services/enterprise-opportunity/index.ts` | Create/update validation & mapping |
| `server/services/enterprise-opportunity/opportunity-serialize.ts` | API serialize |
| `server/repositories/enterprise-deal/enterprise-deal.repository.ts` | Snapshot borrower kind on Deal create |
| `server/services/enterprise-deal/deal-serialize.ts` | Deal API borrower projection |
| `src/constants/opportunity-primary-borrower.ts` | Kind helpers |
| `src/types/opportunity-registry.ts` | Registry row type |
| `src/lib/enterprise-opportunity/*` | API client, map row, start-from-company |
| `src/lib/enterprise-borrower-identity/*` | Resolve display identity |
| `src/lib/lead-opportunity-journey/*` | Active context / remember |
| `src/lib/enterprise-deal/*` | Deal create / map / cache types |
| Docs under `docs/co-dom-001*` | Domain docs |

**Verdict:** Column is required. Failure was missing migration apply — not obsolete code.

---

## 4. Production Fix (Phase 4)

| Step | Action | Result |
|------|--------|--------|
| 1 | Audit drift (scripts) | Confirmed missing column + 7 other pending migrations |
| 2 | `node scripts/prisma-migrate-deploy-secure.mjs` | 8 migrations applied |
| 3 | Re-audit columns | All critical tables `prismaAligned: true` |
| 4 | Smoke `enterpriseOpportunity.findMany` | **PASS** (includes Mehernosh OPP-2026-000041) |

**Not done (by design):** manual SQL column add; `db push`; editing production outside migration history.

---

## 5. Regression Audit (Phase 5) — smoke evidence

Script: `scripts/co-qa-004-post-migrate-smoke.mjs`

| Check | Result |
|-------|--------|
| `primary_borrower_kind` exists, NOT NULL, default `individual` | ✅ |
| `company_name` exists | ✅ |
| `primary_contact_id` nullable | ✅ |
| `enterpriseOpportunity.findMany` | ✅ |
| `enterpriseDeal.findMany` | ✅ |
| `ecmContact.findMany` | ✅ |
| `enterpriseLender.findMany` (incl. `priority`) | ✅ |
| `enterprise_transaction_documents` table | ✅ (count 0) |

Sample after fix:

```json
{
  "opportunityNumber": "OPP-2026-000041",
  "primaryBorrowerKind": "individual",
  "primaryContactName": "Mehernosh Dastoor"
}
```

---

## 6. Root Cause Analysis

1. **CO-DOM-001** added `primaryBorrowerKind` to `schema.prisma` and a proper migration file.  
2. **App code + Prisma Client** were deployed to production (Vercel).  
3. **`prisma migrate deploy` was never run** against production for CO-DOM-001 (and seven sibling migrations).  
4. Prisma Client `findMany` selects all scalar fields including `primary_borrower_kind` → Postgres error → Opportunity Registry / My Opportunities fail.  

This is **deploy/ops drift**, not a bad Prisma model and not “random missing column.”

---

## 7. Before vs After schema (Opportunity)

| Column / constraint | Before | After |
|---------------------|--------|-------|
| `primary_borrower_kind` | absent | `OpportunityPrimaryBorrowerKind NOT NULL DEFAULT 'individual'` |
| `company_name` | absent | `TEXT NULL` |
| `primary_contact_id` | NOT NULL | **NULL allowed** |
| Enum `OpportunityPrimaryBorrowerKind` | absent | present (`individual`, `company`) |
| Index `eopp_org_company_product_lifecycle_idx` | absent | present |

---

## 8. Files changed (this investigation)

| File | Role |
|------|------|
| `scripts/co-qa-004-schema-drift-audit.mjs` | Migration + table inventory audit |
| `scripts/co-qa-004-prisma-column-drift.mjs` | Exact Prisma↔DB column alignment |
| `scripts/co-qa-004-post-migrate-smoke.mjs` | Post-migrate Prisma smoke |
| `docs/co-qa-004/CO-QA-004-SCHEMA-DRIFT-REPORT.md` | This report |
| **No application source changes** | Fix was migration apply only |

---

## 9. Production Migration Plan (ongoing discipline)

1. Before every release that touches `schema.prisma`: run `node scripts/prisma-migrate-deploy-secure.mjs` against production (DIRECT_URL).  
2. Confirm `npx prisma migrate status` → “Database schema is up to date”.  
3. Then deploy Vercel.  
4. Never ship Prisma Client expecting columns that are not in `_prisma_migrations` finished set.  
5. Optional hardening (future): fail CI / release checklist if `migrate status` shows pending.

---

## 10. Business Acceptance Test (required for PASS)

Engineering smoke ≠ BAT.

Please confirm in production UI:

1. Open **My Opportunities** — list loads without Prisma schema error  
2. Opportunity Registry shows records (e.g. Mehernosh / Priyesh / others)  
3. Open an Opportunity — no `primary_borrower_kind` errors  
4. Console/network: opportunity list API 200  

---

## Certification

**CO-QA-004 remains OPEN** until live UI BAT confirms:

- Opportunity Registry loads  
- My Opportunities displays records  
- Prisma queries succeed without schema errors  
- Production schema matches `schema.prisma` (engineering: ✅ after migrate; UI: pending)

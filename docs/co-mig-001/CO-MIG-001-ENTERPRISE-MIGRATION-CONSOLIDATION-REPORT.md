# CO-MIG-001 — Enterprise Migration Consolidation & Release Governance Report

**Status:** Assessment only · **No migrations executed** · **No code modified** · **No deploy**  
**Date:** 2026-07-29  
**Datasource checked (read-only):** PostgreSQL via local `.env.local` (`prisma migrate status`)  
**Repo migrations found:** 31  
**Pending (not applied):** **2**

---

## 1. Executive recommendation

| Decision | Recommendation |
|----------|----------------|
| Execute now? | **No** — await Product Owner / ops approval meeting |
| Pending set | `20260729140000_co_doc_003_document_package_upload` → `20260729160000_co_doc_005_document_package_registry` |
| Safe order | Chronological Prisma order (003 then 005). Do **not** skip 003; both are in the migration history and 005 is written to tolerate 003. |
| Squash / rewrite? | **Forbidden** under this change control. Keep both files as-is. |
| Downtime | **None expected** (additive DDL, `IF NOT EXISTS`, empty new tables, nullable column adds on `enterprise_transaction_documents`) |
| Production impact on live rows | **None** — no `UPDATE`/`DELETE` of transactional data; no `DROP TABLE` |
| Immediate approval ask | Approve a **single Document Package Registry wave** applying both pending migrations with post-migrate BAT |

**Bottom line:** Migration backlog is small and low-risk. Consolidate approval around Document Package durability (CO-DOC-003 + CO-DOC-005). All other repo migrations are already applied on the checked environment.

---

## 2. Applied vs pending (authoritative status)

```
31 migrations found in prisma/migrations
Following migrations have not yet been applied:
  20260729140000_co_doc_003_document_package_upload
  20260729160000_co_doc_005_document_package_registry
```

| Status | Count |
|--------|------:|
| Applied | 29 |
| Pending | 2 |
| Total | 31 |

---

## 3. Pending migration deep review

### 3.1 `20260729140000_co_doc_003_document_package_upload`

| Field | Detail |
|-------|--------|
| **Date** | 2026-07-29 14:00 (folder timestamp) |
| **Module** | Enterprise Document Package Upload (CO-DOC-003) |
| **Purpose** | First durable package metadata table + optional ETD package stamps |
| **Tables created** | `enterprise_document_packages` |
| **Tables modified** | `enterprise_transaction_documents` |
| **Columns added** | ETD: `package_id`, `package_relative_path` |
| **Columns modified** | None |
| **Indexes** | `edp_org_client_package_key` (unique), `edp_org_opp_idx`, `etd_org_package_idx` |
| **Constraints / FKs** | PK on packages; FK `organization_id` → `organizations(id)` RESTRICT |
| **Data migration** | None |
| **Risk** | **Low** — additive, idempotent guards |
| **Header** | `PREPARED FOR APPROVAL — DO NOT EXECUTE` |

**Package table columns (003):**  
`id`, `organization_id`, `opportunity_id`, `loan_file_id`, `folder_name`, `status`, `file_count`, `total_size_bytes`, `uploaded_by`, `participant_id`, `document_scope`, `client_package_id`, `relative_paths_json`, timestamps.

**Missing vs current Prisma model (intentional at 003 time):**  
`storage_status`, `created_by`, `version`, `contact_id`, `customer_id`, `parent_entity_*`, `document_ids_json`, audit table.

---

### 3.2 `20260729160000_co_doc_005_document_package_registry`

| Field | Detail |
|-------|--------|
| **Date** | 2026-07-29 16:00 (folder timestamp) |
| **Module** | Enterprise Document Package Registry (CO-DOC-005) |
| **Purpose** | Complete first-class package registry + audit trail; supersedes 003 **for planning** while remaining safe after 003 |
| **Tables created** | `enterprise_document_packages` (IF NOT EXISTS), `enterprise_document_package_audits` |
| **Tables modified** | `enterprise_document_packages` (ADD COLUMN IF NOT EXISTS…), `enterprise_transaction_documents` |
| **Columns added (packages)** | `storage_status`, `created_by`, `version`, `contact_id`, `customer_id`, `parent_entity_type`, `parent_entity_id`, `document_ids_json` |
| **Columns added (ETD)** | `package_id`, `package_relative_path` (IF NOT EXISTS — duplicate of 003) |
| **Indexes** | Same as 003 + `edp_org_name_idx`, `edpa_package_occurred_idx`, `etd_org_package_idx` (IF NOT EXISTS) |
| **Constraints / FKs** | Org FK on packages; audit PK; audit FK `package_id` → packages **ON DELETE CASCADE** |
| **Data migration** | None |
| **Risk** | **Low–Medium** (see compatibility notes) |
| **Header** | `PREPARED FOR APPROVAL — DO NOT EXECUTE` · notes supersession of 003 |

---

## 4. Dependency analysis

### 4.1 Execution order (required)

```text
… (29 applied) …
→ 20260729140000_co_doc_003_document_package_upload
→ 20260729160000_co_doc_005_document_package_registry
```

| Dependency | Detail |
|------------|--------|
| Both → `organizations` | FK on `organization_id` |
| Both → `enterprise_transaction_documents` | CO-DOC-002 table must exist (**applied**: `20260727194500_co_doc_002_…`) |
| 005 → 003 (soft) | 005 uses `CREATE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS`; designed to run after 003 |
| 005 audits → packages | FK CASCADE delete |

### 4.2 Conflict / duplicate matrix (pending pair)

| Object | 003 | 005 | Conflict? |
|--------|-----|-----|-----------|
| Table `enterprise_document_packages` | CREATE IF NOT EXISTS | CREATE IF NOT EXISTS | **No** — second create no-ops |
| Unique `edp_org_client_package_key` | Yes | Yes | **No** — IF NOT EXISTS |
| Index `edp_org_opp_idx` | Yes | Yes | **No** |
| Index `edp_org_name_idx` | No | Yes | Additive only |
| FK org on packages | Yes | Yes | **No** — duplicate_object caught |
| ETD `package_id` / `package_relative_path` | Yes | Yes | **No** — IF NOT EXISTS |
| Index `etd_org_package_idx` | Yes | Yes | **No** |
| Table `enterprise_document_package_audits` | No | Yes | Additive |

### 4.3 Compatibility nuance (005 after 003)

If 003 creates the package table first, 005’s `CREATE TABLE` no-ops. Then:

- `created_by` is added via `ADD COLUMN IF NOT EXISTS "created_by" TEXT` (**nullable**)
- Prisma model expects `createdBy String` (required on write)

**Impact:** Empty table + application always supplying `createdBy` on insert → **acceptable**.  
**Residual risk:** Direct SQL inserts omitting `created_by` could succeed at DB and fail app expectations — operational discipline only.

Similarly `storage_status` ADD uses `NOT NULL DEFAULT` — safe backfill for empty/new rows.

### 4.4 Governance debt (already applied — do not rewrite)

| Item | Finding |
|------|---------|
| Duplicate timestamp folders | `20260728120000_co_wp_001_wealth_partner_registry` and `20260728120000_opportunity_source_contact_name` — both **applied**; lexicographic order WP then opportunity. Future migrations must use unique timestamps. |
| Untracked pending | Both pending folders are currently **untracked** in git (`git status`). Commit before production `migrate deploy`. |

---

## 5. Full migration inventory (module map)

| Migration | Module | Applied? | Risk (historical) | Notes |
|-----------|--------|----------|-------------------|-------|
| `20260721000000_enterprise_baseline_v1_0` | Enterprise Architecture | Yes | Med | Baseline |
| `20260721020000_co_sprint_119_soft_delete` | Security / soft-delete | Yes | Low | |
| `20260721180000_co_arch_001_i1_tier0_metadata` | Enterprise Architecture | Yes | Low | |
| `20260721190000_co_arch_001_i2_reference_master` | MDM / Reference Master | Yes | Low | |
| `20260721200000_co_arch_001_i4a_product_registry` | Product / Commercial | Yes | Low | |
| `20260721210000_co_arch_001_i4b_document_registry` | Document Registry | Yes | Low | |
| `20260721220000_co_arch_001_i4c_lender_registry` | Lender Registry | Yes | Low | |
| `20260721230000_co_arch_002_w1_enterprise_deal_registry` | Loan / Deal Workspace | Yes | Med | Large |
| `20260721240000_go_live_p0_lender_registry_extension` | Lender Registry | Yes | Low | |
| `20260721250000_co_arch_004_lender_master_foundation` | Lender Registry | Yes | Low | |
| `20260722120000_co_admin_004_production_reset` | Security / Admin | Yes | Med | Ledger + constraint replace |
| `20260722140000_co_admin_005_product_lender_master` | Product–Lender / Programs | Yes | Low | |
| `20260722160000_co_perf_001_enterprise_metrics_engine` | Mission Control / Metrics | Yes | Low | |
| `20260724010000_co_arch_003_p2a_opportunity_deal_foundation` | Opportunity / Deal | Yes | Med | |
| `20260724020000_co_arch_003_p2b_s1_deal_commission_payee` | Commercial / Accounting | Yes | Low | |
| `20260724030000_co_arch_003_p2b_s1_payee_master_fields` | Commercial | Yes | Med | Had data backfill |
| `20260724040000_co_arch_003_p2b_s1_invoice_party_unique` | Commercial | Yes | Low | |
| `20260724200000_co_arch_003_active_opportunity_uniqueness` | Opportunity Workspace | Yes | Med | Uniqueness + data |
| `20260725010000_adr_018_w1_opportunity_lifecycle` | Opportunity / ADR-018 | Yes | Low | |
| `20260725010100_adr_018_w1_opportunity_uniqueness_index` | Opportunity | Yes | Low | |
| `20260727120000_co_dom_001_borrower_contact_model` | Opportunity / Borrower | Yes | Low | |
| `20260727180000_co_mdm_001_reference_master_domains` | MDM | Yes | Low | Enum/comment style |
| `20260727190000_co_lend_001_lender_program_portal` | Lender Program Portal | Yes | Low | |
| `20260727193000_co_lend_001b_contact_dialogue` | Contact / Dialogue | Yes | Low | |
| `20260727194500_co_doc_002_durable_transaction_documents` | Document Registry | Yes | Low | **Prerequisite for pending** |
| `20260728120000_co_wp_001_wealth_partner_registry` | Wealth Partner Registry | Yes | Low | Duplicate timestamp peer |
| `20260728120000_opportunity_source_contact_name` | Opportunity Workspace | Yes | Low | Duplicate timestamp peer |
| `20260728140000_co_opp_002_opportunity_lifecycle` | Opportunity | Yes | Low | |
| `20260728200000_co_opp_003_business_source_commercial` | Opportunity / Commercial | Yes | Low | |
| `20260729140000_co_doc_003_document_package_upload` | Document Package | **PENDING** | Low | |
| `20260729160000_co_doc_005_document_package_registry` | Document Package Registry | **PENDING** | Low–Med | |

---

## 6. Recommended release waves

### Wave 1 — Document Package Schema (migrate)

**Include:** DOC-003 + DOC-005 (both pending), in Prisma order.  
**Why together:** 005 completes the registry/audit model; 003 is already in history and must apply first; both are additive and idempotent together.  
**Why not split:** Leaving 003 applied without 005 yields an incomplete package schema vs Prisma client expectations for CO-DOC-005 services.

### Wave 2 — Document Package BAT / operational cutover (no extra SQL)

**Include:** Deploy application build that uses package APIs; BAT folder upload, hydrate, preview-by-registry, refresh/login persistence.  
**Why separate:** Schema can be live with soft 503 until app is deployed; business certification should not mix with DDL night.

### Wave 3 — Follow-ups (future approvals)

**Include (examples, not pending SQL today):**

- Activate ETD `packageId` / `packageRelativePath` on Prisma `EnterpriseTransactionDocument` if still deferred
- Large-file object storage path for `storageStatus=durable_object`
- Optional git commit of untracked migration folders before prod deploy
- Process rule: unique migration timestamps (no more shared `YYYYMMDDHHMMSS` prefixes)

---

## 7. Execution plan (when approved)

### Safest order

1. Confirm backup / PITR available on Supabase.  
2. Commit both pending migration folders to the release branch.  
3. `prisma migrate deploy` with `DIRECT_URL` (non-pooler) per project policy.  
4. `prisma migrate status` → “Database schema is up to date”.  
5. Smoke SQL checks (below).  
6. Deploy app (Wave 2) only after Wave 1 validation.

### Estimates

| Item | Estimate |
|------|----------|
| DDL wall time | **&lt; 1–2 minutes** (empty tables, IF NOT EXISTS) |
| Downtime | **0** (online additive DDL) |
| Lock risk | Brief ACCESS EXCLUSIVE possible on ALTER ADD COLUMN — short on small ETD table |

### Rollback strategy

| Approach | Guidance |
|----------|----------|
| Preferred | **Forward-fix** — do not DROP production tables after go-live |
| Pre-cutover failure | Restore from snapshot / PITR to pre-deploy timestamp; do not partially hand-edit `_prisma_migrations` |
| After success | Soft-disable package API via feature/config if needed; tables may remain empty |
| Forbidden without new ADR | Manual `DROP TABLE enterprise_document_packages` / audit in production |

Prisma does not auto-rollback DDL. Treat Wave 1 as **one-way** once marked applied.

### Validation checklist after each migration

**After 003:**

- [ ] `\d enterprise_document_packages` exists  
- [ ] Unique index `edp_org_client_package_key` exists  
- [ ] ETD columns `package_id`, `package_relative_path` exist  
- [ ] `_prisma_migrations` contains `20260729140000_co_doc_003_document_package_upload`  

**After 005:**

- [ ] Columns `storage_status`, `created_by`, `version`, parent/contact fields, `document_ids_json` exist on packages  
- [ ] Table `enterprise_document_package_audits` exists + FK to packages  
- [ ] Index `edp_org_name_idx` exists  
- [ ] `_prisma_migrations` contains `20260729160000_co_doc_005_document_package_registry`  
- [ ] `migrate status` clean  

### Smoke test checklist (Wave 2 app)

- [ ] Authentication (login `admin@compass.com` path unchanged)  
- [ ] Upload Files (non-folder) unchanged  
- [ ] Upload Folder → package row appears; survives refresh  
- [ ] Preview via Document Registry record → blob  
- [ ] Package API no longer 503 for missing tables  
- [ ] Opportunity Workspace / Loan Workspace / Lender Pipeline unaffected  
- [ ] Wealth Partner Registry list loads  
- [ ] Mission Control / Search / Commercial Programs load  

---

## 8. Post-migration module validation matrix

| Module | Validate |
|--------|----------|
| Opportunity Workspace | Open OW; documents stage; no regression |
| Loan Workspace | Open deal desk; pipeline kanban |
| Lender Pipeline | Stage transitions still persist |
| Wealth Partner Registry | List + open partner |
| Document Registry | Upload Files + list + preview |
| Document Package Registry | Folder upload, hydrate, timeline, download |
| Mission Control | Dashboard / search center loads |
| Search | Command palette + MC search |
| Authentication | Login / session |
| Commercial Programs | Lender Registry programs list / wizard |

---

## 9. Risk assessment summary

| Risk | Level | Mitigation |
|------|-------|------------|
| Live transactional data loss | **None** | No destructive DML |
| Breaking API for non-doc modules | **Low** | Additive only |
| Schema drift 003→005 `created_by` nullability | **Low** | App always sets `createdBy` |
| Applying without git-tracked migrations | **Medium** | Commit folders before prod deploy |
| Deploy app before migrate | **Medium** | Soft 503 already coded; prefer migrate-then-deploy |
| Duplicate timestamp precedent | **Low (process)** | Enforce unique timestamps going forward |
| CASCADE delete on package audits | **Low** | Expected; deleting package removes audits |

---

## 10. Rollback plan (approval pack)

1. **Before execute:** snapshot / confirm PITR window.  
2. **During execute:** stop if `migrate deploy` errors; do not manually insert `_prisma_migrations` rows.  
3. **After execute, before app deploy:** optional hold — schema idle is safe.  
4. **After app deploy regression:** disable package UI/API path; open incident; forward-fix SQL if needed.  
5. **Catastrophic only:** PITR to pre-Wave-1 timestamp (executive approval).

---

## 11. Approval meeting agenda (suggested)

1. Confirm pending = only DOC-003 + DOC-005 on target environment.  
2. Approve Wave 1 DDL window window.  
3. Approve Wave 2 BAT deploy (separate).  
4. Confirm migrations committed to release branch.  
5. Assign operator for `migrate deploy` + validation sign-off.  
6. Explicitly reject squash/rewrite of historical migrations.

---

## 12. Change-control attestation

| Action | Performed? |
|--------|------------|
| Migration executed | **No** |
| Application code modified | **No** |
| Migration SQL rewritten | **No** |
| Live data modified | **No** |
| Vercel deploy | **No** |
| Production config altered | **No** |

---

*End of CO-MIG-001 Consolidation Report.*

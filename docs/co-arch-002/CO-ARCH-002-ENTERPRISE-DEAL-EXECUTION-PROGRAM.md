# CO-ARCH-002 — Enterprise Deal Execution Program

**Program:** CO-ARCH-002  
**Document type:** Implementation / Execution Program (for ARB approval)  
**Status:** **Accepted by ARB** — execution authorized; proceed wave-by-wave  
**Architecture baseline:** CO-ARCH-002 Architecture Package **v0.4** (ARB Accepted)  
**Constitutional rule:** Foundation Principle **F0** — Deal-Centric Enterprise  
**Date:** 2026-07-21  
**Related:** ADR-016 · ADR-015 · Wave 0 Technical Design · `docs/architecture/FOUNDATION-PRINCIPLE-DEAL-CENTRIC.md`

---

## Authorization & stop point

| Item | Status |
|------|--------|
| Architecture Package v0.4 | **Accepted** |
| F0 constitutional | **Binding** |
| This Execution Program | **Accepted** |
| Wave 0 Technical Design | **Approved** (amendments A1–A3) (`CO-ARCH-002-WAVE-0-TECHNICAL-DESIGN.md`) |
| Wave 1 — Deal Engine | **Approved** (`CO-ARCH-002-WAVE-1-COMPLETION-REPORT.md`) |
| Wave 2 — Deal API Engine | **Approved** (`CO-ARCH-002-WAVE-2-COMPLETION-REPORT.md`) |
| Wave 3 — Dual-Write | **Approved** (`CO-ARCH-002-WAVE-3-COMPLETION-REPORT.md`) |
| Wave 4 — Dual-Read / Shadow Read | **Approved** (`CO-ARCH-002-WAVE-4-COMPLETION-REPORT.md`) |
| Wave 5 — Workspace Consumers | **Approved** (`CO-ARCH-002-WAVE-5-COMPLETION-REPORT.md`) |
| Wave 6 — Cutover & Stabilization | **Complete — pending final ARB certification** (`CO-ARCH-002-WAVE-6-COMPLETION-REPORT.md`) |
| Production flag enablement / operational SSOT | **Blocked until final ARB after Wave 6** |

---

## 0. Program charter

### 0.1 Objective

Implement the **Enterprise Deal** as the single transactional source of truth for Catalyst One — the atomic business entity of the platform — such that every transactional module ultimately Creates, Reads, Updates, Analyzes, Supports, or Completes a Deal.

### 0.2 Non-negotiable rules (F0)

1. F0 is constitutional and must never be violated.  
2. Every transactional entity belongs to **exactly one Deal**.  
3. Master Registries continue to **support** Deals (they are not transactional roots).  
4. Existing functionality must continue to work throughout migration.  
5. Migration must be **incremental, reversible, and production-safe**.

### 0.3 Success definition

| Criterion | Measure |
|-----------|---------|
| Persistence | Deal rows in Supabase; Deal Number allocated |
| My Deals | Lists Deals from API (flag ON); empty localStorage still shows Deals after cutover |
| Create path | Contact / workspace create → exactly one new Deal |
| No reuse | Second transaction for same customer → second Deal ID |
| Journey | Opportunity / Deal (Loan) Workspace operate on `enterpriseDealId` |
| Safety | Dual-write/read flags allow full rollback without data loss |

---

# 1. Database Design

## 1.1 Design conventions

Align with ADR-015 Tier 0 / ECM soft-delete patterns:

| Convention | Rule |
|------------|------|
| PK | UUID (`id`) |
| Tenancy | `organization_id` NOT NULL, FK → `organizations` |
| Naming | `snake_case` tables/columns; Prisma camelCase mapped |
| Soft delete | `is_deleted`, `deleted_at`, `deleted_by`, `delete_reason` on mutable entities |
| Audit | `created_at`, `created_by`, `updated_at`, `updated_by`, `version_number` |
| Snapshots | Denormalized labels for historical integrity when masters change |
| Append-only | Timeline events: **no soft delete / no update** (insert only) |
| Idempotency | `legacy_loan_file_id` unique per org (nullable) |

## 1.2 Table inventory

| Table | Role | Mutability |
|-------|------|------------|
| `enterprise_deals` | Aggregate root | Soft delete / archive |
| `enterprise_deal_participants` | Customer-side parties | Soft delete |
| `enterprise_deal_counterparty_assignments` | Providers (lender/AMC/…) | Soft delete |
| `enterprise_deal_document_links` | Document instances | Soft delete |
| `enterprise_deal_tasks` | Tasks | Soft delete |
| `enterprise_deal_activities` | Activities / follow-ups | Soft delete |
| `enterprise_deal_notes` | Notes | Soft delete |
| `enterprise_deal_timeline_events` | Immutable event log | **Append-only** |
| `enterprise_deal_assignments` | User role assignments | Soft delete / effective dating |
| `enterprise_deal_commercial_versions` | Versioned commercials | Append + supersede (no rewrite history) |
| `enterprise_deal_commission_links` | Commission refs | Soft delete |
| `enterprise_deal_accounting_links` | Accounting refs | Soft delete |
| `enterprise_deal_notification_links` | Notification refs | Soft delete |
| `enterprise_deal_intelligence_links` | AI / MC / CHANAKYA refs | Soft delete |
| `enterprise_deal_workflow_bindings` | Workflow engine bindings | Soft delete |
| `enterprise_deal_import_batches` | Migration import batches | Append + status |
| `enterprise_deal_number_sequences` | Org Deal Number allocator | Update sequence |

## 1.3 Root: `enterprise_deals`

### Columns (final target)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `organization_id` | UUID | FK organizations, NOT NULL |
| `deal_number` | TEXT | NOT NULL |
| `legacy_loan_file_id` | TEXT | NULL |
| `file_number` | TEXT | NULL |
| `external_refs` | JSONB | NULL |
| `product_id` | UUID | NULL, FK enterprise_products |
| `product_code` | TEXT | NULL |
| `product_label` | TEXT | NULL |
| `product_category_id` | UUID | NULL |
| `product_group_id` | UUID | NULL |
| `product_family` | TEXT | NOT NULL, CHECK IN family set |
| `transaction_type` | TEXT | NULL |
| `lifecycle_phase` | TEXT | NULL |
| `gross_stage` | TEXT | NOT NULL |
| `sub_stage` | TEXT | NULL |
| `lifecycle_status` | TEXT | NOT NULL |
| `operational_status` | TEXT | NOT NULL |
| `progress_percent` | INT | NOT NULL DEFAULT 0, CHECK 0–100 |
| `days_in_stage` | INT | NOT NULL DEFAULT 0 |
| `stage_entered_at` | TIMESTAMPTZ | NOT NULL |
| `closed_at` | TIMESTAMPTZ | NULL |
| `archived` | BOOLEAN | NOT NULL DEFAULT false |
| `archived_at` | TIMESTAMPTZ | NULL |
| `archived_by` | TEXT | NULL |
| `primary_owner_user_id` | UUID | NULL, FK users |
| `relationship_manager_user_id` | UUID | NULL, FK users |
| `relationship_manager_name` | TEXT | NULL |
| `source_owner_user_id` | UUID | NULL |
| `credit_owner_user_id` | UUID | NULL |
| `team_id` | UUID | NULL |
| `branch_id` | UUID | NULL |
| `assignment_mode` | TEXT | NULL |
| `primary_contact_id` | UUID | NULL, FK ecm_contacts |
| `primary_contact_name` | TEXT | NULL |
| `primary_contact_mobile` | TEXT | NULL |
| `primary_contact_email` | TEXT | NULL |
| `company_id` | UUID | NULL, FK ecm_companies |
| `employment_type_code` | TEXT | NULL |
| `city_code` / `state_code` | TEXT | NULL |
| `city_label` / `state_label` | TEXT | NULL |
| `currency_code` | TEXT | NOT NULL DEFAULT 'INR' |
| `requested_amount` | DECIMAL(18,2) | NULL |
| `approved_amount` | DECIMAL(18,2) | NULL |
| `fulfilled_amount` | DECIMAL(18,2) | NULL |
| `commercial_terms` | JSONB | NULL |
| `lending_extension` | JSONB | NULL (ROI, tenure, BT, property, CIBIL, …) |
| `primary_counterparty_type` | TEXT | NULL |
| `primary_counterparty_id` | UUID | NULL (polymorphic registry id) |
| `primary_counterparty_name` | TEXT | NULL |
| `primary_counterparty_program_id` | UUID | NULL |
| `expected_revenue` | DECIMAL(18,2) | NOT NULL DEFAULT 0 |
| `revenue_percent` | DECIMAL(9,4) | NULL |
| `revenue_received` | DECIMAL(18,2) | NOT NULL DEFAULT 0 |
| `payout_configured` | BOOLEAN | NOT NULL DEFAULT false |
| `settlement_completed` | BOOLEAN | NOT NULL DEFAULT false |
| `priority` | TEXT | NOT NULL DEFAULT 'medium' |
| `is_urgent` / `is_delayed` | BOOLEAN | NOT NULL DEFAULT false |
| `risk_band` | TEXT | NULL |
| `source_code` | TEXT | NULL |
| `source_contact_id` | UUID | NULL |
| `version_number` | INT | NOT NULL DEFAULT 1 |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL |
| `created_by` / `updated_by` | TEXT | NULL |
| `is_deleted` | BOOLEAN | NOT NULL DEFAULT false |
| `deleted_at` / `deleted_by` / `delete_reason` | | soft delete |
| `row_version` | INT | NOT NULL DEFAULT 1 (optimistic concurrency) |

### Constraints & indexes — `enterprise_deals`

```
UNIQUE (organization_id, deal_number)
UNIQUE (organization_id, legacy_loan_file_id) WHERE legacy_loan_file_id IS NOT NULL
CHECK (product_family IN ('lending','mutual_fund','insurance','bonds','pms','other'))
CHECK (lifecycle_status IN ('active','on_hold','won','lost','cancelled','archived'))
CHECK (operational_status IN ('on_track','at_risk','delayed','completed'))
CHECK (priority IN ('urgent','high','medium','low'))

INDEX (organization_id, is_deleted, archived, updated_at DESC)
INDEX (organization_id, primary_contact_id) WHERE is_deleted = false
INDEX (organization_id, product_family, gross_stage) WHERE is_deleted = false
INDEX (organization_id, relationship_manager_user_id) WHERE is_deleted = false
INDEX (organization_id, lifecycle_status, operational_status)
INDEX (organization_id, product_id)
INDEX (organization_id, primary_counterparty_type, primary_counterparty_id)
```

**FK policy:** `ON DELETE RESTRICT` for org/contact/product; never cascade-delete Deals when masters change.

## 1.4 Child tables (summary schema)

### `enterprise_deal_participants`
`id`, `organization_id`, `deal_id` FK CASCADE, `ecm_contact_id` FK RESTRICT, `role`, `is_property_owner`, `ownership_percent`, `sort_order`, audit + soft delete  
`UNIQUE (deal_id, ecm_contact_id, role)`  
`INDEX (deal_id)`, `INDEX (organization_id, ecm_contact_id)`

### `enterprise_deal_counterparty_assignments`
`id`, `organization_id`, `deal_id` FK CASCADE, `counterparty_type`, `counterparty_registry_id`, `program_id`, `is_primary`, `pipeline_stage`, `pipeline_sub_stage`, `application_ref`, `decision`, `decision_at`, `extension` JSONB, audit + soft delete  
`INDEX (deal_id, is_primary)`, `INDEX (organization_id, counterparty_type, counterparty_registry_id)`  
Partial unique: one primary per deal where `is_primary = true AND is_deleted = false`

### `enterprise_deal_document_links`
`id`, `organization_id`, `deal_id` FK CASCADE, `document_definition_id`, `document_type_id`, `participant_id`, `status`, `storage_key`, `uploaded_at`, `verified_at`, `extension` JSONB, audit + soft delete  
`INDEX (deal_id, status)`, `INDEX (organization_id, document_definition_id)`

### `enterprise_deal_tasks` / `enterprise_deal_activities`
Standard work-item columns: title, status, priority, due_at, assignee_user_id, sla_policy_id, completed_at, payload JSONB, audit + soft delete  
`INDEX (deal_id, status, due_at)`

### `enterprise_deal_notes`
`deal_id`, body, visibility, author, audit + soft delete

### `enterprise_deal_timeline_events` (append-only)
`id`, `organization_id`, `deal_id` FK CASCADE, `event_type`, `occurred_at`, `actor_user_id`, `summary`, `payload` JSONB, `created_at`  
**No** `updated_at` / soft-delete columns  
`INDEX (deal_id, occurred_at DESC)`, `INDEX (organization_id, event_type, occurred_at DESC)`

### `enterprise_deal_assignments`
`deal_id`, `role`, `user_id`, `effective_from`, `effective_until`, `is_primary`, audit + soft delete

### `enterprise_deal_commercial_versions`
`deal_id`, `version_number`, `effective_from`, commercial payload / typed amounts, `change_reason`, `edl_entry_id`, `created_at/by`  
`UNIQUE (deal_id, version_number)`

### Link tables
`commission_links`, `accounting_links`, `notification_links`, `intelligence_links`, `workflow_bindings`:  
`deal_id`, `link_type`, `external_ref`, `payload` JSONB, audit + soft delete  
`INDEX (deal_id, link_type)`

### `enterprise_deal_import_batches`
`id`, `organization_id`, `status`, `checksum`, `item_count`, `created_count`, `updated_count`, `skipped_count`, `error_report` JSONB, `created_at/by`, `completed_at`

### `enterprise_deal_number_sequences`
`organization_id` PK, `prefix` DEFAULT `'DEAL'`, `year`, `next_value`, `updated_at`  
Allocation: transactional `UPDATE … RETURNING` under row lock.

## 1.5 Soft-delete strategy

| Entity class | Strategy |
|--------------|----------|
| Deal root | Soft delete + optional `archived`; register in `EnterpriseSoftDeleteRecord` (CO-SPRINT-119 pattern) |
| Mutable children | Soft delete; cascade soft-delete optional job when parent deleted |
| Timeline | Never delete; never update payload after insert |
| Commercial versions | Never rewrite prior versions; add new version |
| Hard delete | **Forbidden** in production for Deals with accounting/commission links |

## 1.6 Relationship diagram (physical)

```
organizations ──< enterprise_deals >── ecm_contacts (primary)
                     │              >── ecm_companies
                     │              >── enterprise_products
                     │              >── users (owners/RM)
                     ├── participants
                     ├── counterparty_assignments ──> lender/AMC registries (by type+id)
                     ├── document_links ──> document definitions/types
                     ├── tasks / activities / notes
                     ├── timeline_events (append-only)
                     ├── assignments
                     ├── commercial_versions
                     └── * _links / workflow_bindings
```

---

# 2. API Design

Base path: `/api/enterprise-deals`  
Auth: existing session / JWT; all queries scoped by `organizationId` from user context.  
Response envelope: consistent `{ data, error, meta }` (match existing Catalyst One API style).

## 2.1 Core CRUD

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/enterprise-deals` | Create Deal (always new ID + Deal Number) |
| `GET` | `/api/enterprise-deals/:dealId` | Read Deal (+ optional `?include=` children) |
| `PATCH` | `/api/enterprise-deals/:dealId` | Update Deal fields (optimistic `rowVersion`) |
| `POST` | `/api/enterprise-deals/:dealId/archive` | Archive |
| `POST` | `/api/enterprise-deals/:dealId/restore` | Restore soft-deleted / archived (policy-gated) |
| `DELETE` | `/api/enterprise-deals/:dealId` | Soft delete |

**Create rules:** never accept client-supplied `id` as authority; server allocates UUID + Deal Number; reject reuse of closed Deal for new commercial engagement.

## 2.2 Search / list

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/enterprise-deals` | Paginated search/filter |

**Query params (v1):**  
`q`, `productFamily`, `productId`, `grossStage`, `subStage`, `lifecycleStatus`, `operationalStatus`, `priority`, `assignedRmUserId`, `primaryContactId`, `counterpartyType`, `counterpartyId`, `dateCreatedFrom/To`, `updatedFrom/To`, `archived`, `scope=my|team|all`, `page`, `pageSize`, `sort`

Maps to My Deals Deal Registry filters.

## 2.3 Stage transitions

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/enterprise-deals/:dealId/transitions` | Validate + apply stage/status transition |

Body: `{ toGrossStage, toSubStage?, toLifecycleStatus?, reason?, rowVersion }`  
Server: validate transition matrix (family-specific) → update Deal → append timeline event → audit/EDL when required.

## 2.4 Children

| Resource | Endpoints |
|----------|-----------|
| Participants | `GET/POST /:dealId/participants`, `PATCH/DELETE /:dealId/participants/:id` |
| Counterparties | `GET/POST /:dealId/counterparties`, `PATCH/DELETE …/:id`, `POST …/:id/pipeline` |
| Documents | `GET/POST /:dealId/documents`, `PATCH …/:id` (status), upload URL strategy TBD with storage |
| Tasks | `GET/POST /:dealId/tasks`, `PATCH …/:id` |
| Activities | `GET/POST /:dealId/activities`, `PATCH …/:id` |
| Notes | `GET/POST /:dealId/notes`, `PATCH/DELETE …/:id` |
| Timeline | `GET /:dealId/timeline` (read-only list); writes only via domain services |
| Assignments | `GET/POST /:dealId/assignments`, `PATCH …/:id` |
| Commercial versions | `GET /:dealId/commercial-versions`, `POST` (new version) |
| Links | `GET/POST` for accounting / commission / intelligence / notifications / workflow |

## 2.5 Migration / import

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/enterprise-deals/import` | Import LoanFile[] payload (`dryRun` supported) |
| `GET` | `/api/enterprise-deals/import/:batchId` | Batch status |

Gated by `DEAL_REGISTRY_IMPORT_ENABLED`.

## 2.6 Idempotency & concurrency

- Create/import: idempotent on `(organizationId, legacyLoanFileId)` when provided.  
- PATCH/transitions: require `rowVersion`; conflict → `409`.  
- Deal Number allocation: serializable / row-locked sequence.

---

# 3. Migration Strategy

## 3.1 States

```
CURRENT → HYBRID (dual-write + dual-read) → FULL ENTERPRISE (Deal authoritative)
```

## 3.2 Feature flags

| Flag | Default | Purpose |
|------|---------|---------|
| `DEAL_REGISTRY_DUAL_WRITE` | **OFF** | Persist Deal on create/save paths |
| `DEAL_REGISTRY_PORT_RUNTIME` | **OFF** | My Deals / ports read from Deal API |
| `DEAL_REGISTRY_IMPORT_ENABLED` | **OFF** | Browser → server import |
| `DEAL_REGISTRY_BLOCK_LOCAL_WRITE` | **OFF** | Production hard-stop of localStorage SSOT writes |

Flags follow CO-ARCH-001 port-flag governance: unset = OFF; enable only after wave certification.

## 3.3 Dual-write

**When ON:** `createLoanFileFromInput` / OW Save / Loan Workspace persist also upsert Enterprise Deal + map `legacyLoanFileId`.  
**Ack rule:** client retains local copy until API 2xx returns `{ dealId, dealNumber }`.  
**Failure:** log + telemetry; do not block user save in early hybrid (degrade to local-only with alert); tighten in later waves.

## 3.4 Dual-read

**When ON:** My Deals (and later workspaces) prefer Deal API; on empty/error fall back to localStorage with banner telemetry.  
**Parity:** filter mapping certified against registry fixture set.

## 3.5 LocalStorage → Supabase import

1. Client detects `compass:loan-files-data`.  
2. `POST /import` with `dryRun=true` → report creates/updates/skips.  
3. User confirms → `dryRun=false`.  
4. Server upserts by `legacyLoanFileId`; N files → N Deals.  
5. Client stores mapping; optional `migratedAt` marker; retain backup until Wave cutover+N days.

## 3.6 Data validation

| Check | Rule |
|-------|------|
| One file → one Deal | No collapsing by customer/product |
| Required snapshots | name/mobile when contact missing |
| Stage map | Apply `LEGACY_STAGE_MAP` |
| Counterparties | Map `lenders[]` → assignments type=lender |
| Checksum | Store payload hash on import batch |

## 3.7 Rollback plan

| Scenario | Action |
|----------|--------|
| API defects | Set `DEAL_REGISTRY_PORT_RUNTIME=OFF` |
| Dual-write defects | Set `DEAL_REGISTRY_DUAL_WRITE=OFF`; local SSOT continues |
| Bad import batch | Soft-delete imported Deals by `import_batch_id`; restore flag OFF |
| Schema issue | Forward-fix preferred; reverse migration only non-prod / idle tables |

**Data retention:** never hard-delete imported Deals during rollback window (minimum 30 days post-cutover).

---

# 4. Module Migration Plan

| Module | Wave | Action | F0 posture |
|--------|------|--------|------------|
| **Contacts** | W3 | Create Deal on start journey; link `primaryContactId` | Create / Support |
| **My Deals** | W4 | Dual-read Deal API; registry filters; empty-state honesty | Read / Analyze |
| **Opportunity Workspace** | W3–W5 | Save persists Deal; load by Deal ID | Create / Update |
| **Deal Workspace** (today: Loan Workspace) | W5 | Rename framing progressively; load/save Deal; lender = counterparty | Update / Complete |
| **Documents** | W5 | `DealDocumentLink` only | Support |
| **Tasks / Activities** | W5 | Children of Deal | Support / Progress |
| **Accounting** | W5–W6 | `DealAccountingLink`; settlement flags | Complete / Settle |
| **Mission Control** | W6 | Metrics from Deal SSOT only | Analyze / Monitor |
| **CHANAKYA** | W6 | Reason in Deal context | Analyze |
| **Saarthi** | W6 | Assist within Deal context | Support |
| **Search / Reports / Analytics** | W6 | Index/measure Deals | Analyze |
| **Masters (CO-ARCH-001)** | Ongoing | Remain support layer | Support Deals |

**Naming note:** UI may retain “Loan Workspace” during Soft Go-Live; architecture term is **Deal Workspace (lending view)**. Progressive copy updates are non-blocking for persistence waves.

---

# 5. Execution Waves

**Global gates:** prior wave Certified → ESC/ARB flag enablement → next wave starts.  
**No wave enables production flags without certification report.**

---

### Wave 0 — Execution Program Freeze
| | |
|--|--|
| **Objective** | Approve this Execution Program |
| **Scope** | Docs only |
| **Deliverables** | This document Accepted; ADR-016 Status → Accepted (execution authorized) |
| **Dependencies** | Architecture v0.4 Accepted |
| **Risks** | Scope creep into coding |
| **Rollback** | N/A |
| **Testing** | ARB checklist |
| **Certification** | Written ARB approval of Execution Program |

---

### Wave 1 — Database Foundation
| | |
|--|--|
| **Objective** | Persist Deal aggregate in Supabase |
| **Scope** | Prisma schema + migration(s) for all §1 tables; repositories; Deal Number sequence; no UI |
| **Deliverables** | Migration SQL; repository unit tests; schema review vs F0 |
| **Dependencies** | Wave 0; organizations, users, ECM, product/lender/document tables (nullable FKs OK) |
| **Risks** | Over-required lending columns; migration downtime |
| **Rollback** | Idle tables unused; reverse only non-prod |
| **Testing** | `prisma migrate`; repository CRUD smoke; constraint tests |
| **Certification** | Migrate on pilot DB; no runtime flag changes |

---

### Wave 2 — Deal Persistence API
| | |
|--|--|
| **Objective** | Stable HTTP contract for Deal SSOT |
| **Scope** | §2 endpoints; authZ; tenancy; import dry-run; OpenAPI/contract notes |
| **Deliverables** | API routes + service layer; contract tests; postman/harness |
| **Dependencies** | Wave 1 |
| **Risks** | PII leakage; cross-tenant reads |
| **Rollback** | Disable routes / leave flags OFF |
| **Testing** | Tenancy isolation; idempotent create; 409 concurrency; import dry-run |
| **Certification** | API certification report; security review of org scoping |

---

### Wave 3 — Dual-Write Create/Save Paths
| | |
|--|--|
| **Objective** | Every new lending engagement creates a Deal in Supabase |
| **Scope** | Contacts / Customer 360 / create loan + Opportunity Workspace Save dual-write; mapping return |
| **Deliverables** | Dual-write adapter; flag `DEAL_REGISTRY_DUAL_WRITE`; telemetry |
| **Dependencies** | Wave 2 |
| **Risks** | Partial write; UX latency |
| **Rollback** | Flag OFF |
| **Testing** | Create → Deal row; second create → second Deal; OW Save updates Deal |
| **Certification** | Soft Go-Live create script 100% Deal persistence with flag ON in pilot |

---

### Wave 4 — My Deals Dual-Read
| | |
|--|--|
| **Objective** | My Deals becomes Deal Registry UI on API |
| **Scope** | Dual-read port; filter mapping; empty-state copy; import UX (flagged) |
| **Deliverables** | Flag `DEAL_REGISTRY_PORT_RUNTIME`; UAT checklist |
| **Dependencies** | Wave 3 certified; dual-written sample data |
| **Risks** | Filter parity; RM ownership name vs user id |
| **Rollback** | Flag OFF → localStorage |
| **Testing** | Filter matrix; scope my/team/all; multi-device same org |
| **Certification** | “Create Deal → appears in My Deals from API” Soft Go-Live scenario |

---

### Wave 5 — Workspace Consumers (Opportunity + Deal/Loan + Docs + Tasks)
| | |
|--|--|
| **Objective** | Journey modules operate on `enterpriseDealId` |
| **Scope** | Load/save Deal; counterparties; documents; tasks/activities; journey query param normalization |
| **Deliverables** | Consumer adapters; per-module flags if needed; journey E2E |
| **Dependencies** | Wave 4 |
| **Risks** | Large surface; context navigation regressions |
| **Rollback** | Consumer flags OFF; dual-read fallback |
| **Testing** | Full lending journey hop on one Deal ID; Continue/Back context preserve |
| **Certification** | Business journey certification on Deal ID; no local authority for certified paths |

---

### Wave 6 — Intelligence, Cutover, Production Hardening
| | |
|--|--|
| **Objective** | Mission Control / CHANAKYA / Saarthi / Search / Reports on Deal; cutover |
| **Scope** | Metric SSOT wiring; `DEAL_REGISTRY_BLOCK_LOCAL_WRITE`; deprecate local authority; monitoring |
| **Deliverables** | Cutover runbook; ESC production checklist; post-deploy monitors |
| **Dependencies** | Wave 5; single-metric audit |
| **Risks** | Metric drift; search lag |
| **Rollback** | Re-enable dual-read; keep DB as SSOT; unblock local write only as emergency |
| **Testing** | Empty localStorage proof; multi-device; performance budgets |
| **Certification** | ESC Production Release Report for CO-ARCH-002 |

---

# 6. Production Rollout

## 6.1 Environments

| Env | Use |
|-----|-----|
| Local / Dev | Schema + API + dual-write development |
| Pilot / Vercel Production (cert) | Flag-gated validation (`catalyst-one-two`) |
| Soft Go-Live users | Controlled UAT cohort |

## 6.2 Sequence

```
1. Wave 1–2 deploy (schema+API) — flags OFF
2. Pilot internal testing (API harness, import dry-run)
3. Enable DUAL_WRITE on pilot — Wave 3 cert
4. Enable PORT_RUNTIME on pilot — Wave 4 UAT
5. Wave 5 consumer rollout — journey UAT
6. Performance validation (list p95, transition p95)
7. Wave 6 cutover — BLOCK_LOCAL_WRITE
8. Post-deployment monitoring (7–14 days)
9. ESC sign-off
```

## 6.3 Testing layers

| Layer | Owner | Content |
|-------|-------|---------|
| Unit | Eng | Repositories, transition matrix, Deal Number |
| Contract | Eng | API tenancy + idempotency |
| Integration | Eng | Dual-write/read flags |
| UAT | Business | Create → My Deals → Workspace → Documents/Tasks |
| Performance | Eng | List 1k Deals; timeline pagination |
| Security | Eng | Org isolation; soft-delete recovery |

## 6.4 UAT scenarios (minimum)

1. New customer → create lending Deal → visible in My Deals (API).  
2. Same customer → second product/engagement → **second** Deal Number.  
3. Stage transition → timeline event present.  
4. Counterparty (lender) assignment → pipeline update.  
5. Document link status change.  
6. Import dry-run + commit on browser with legacy LoanFiles.  
7. Flag OFF rollback restores prior UX without data loss.  
8. Multi-device: Device A creates; Device B sees Deal (same user/org).

## 6.5 Performance budgets (initial)

| Operation | Target |
|-----------|--------|
| `GET /enterprise-deals` (page 50) | p95 < 500 ms (pilot) |
| `GET /:id?include=summary` | p95 < 300 ms |
| Stage transition | p95 < 400 ms |
| Import 100 LoanFiles | < 30 s dry-run / < 60 s commit |

Tune after Wave 4 telemetry.

## 6.6 Post-deployment monitoring

| Signal | Alert |
|--------|-------|
| Dual-write failure rate | > 1% over 15 min |
| Dual-read fallback rate | > 5% (indicates API issues) |
| 409 conflict rate | Spike investigation |
| Create without Deal row (flag ON) | P0 page |
| Cross-tenant access denials | Security review |

## 6.7 Communication

- Business: Soft Go-Live note that Deals now persist server-side when flags ON.  
- Support: rollback flag matrix one-pager.  
- Eng: cutover runbook in `docs/co-arch-002/`.

---

# 7. Governance checklist (ARB)

Please approve:

- [ ] §1 Database Design (tables, FKs, indexes, soft delete)  
- [ ] §2 API Design  
- [ ] §3 Migration + flags + rollback  
- [ ] §4 Module migration order  
- [ ] §5 Waves 0–6 with certification gates  
- [ ] §6 Production rollout / UAT / monitoring  
- [ ] Confirmation that **no coding** proceeds until this Execution Program is **Accepted**

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-21 | Initial Execution Program submitted for ARB — post Architecture v0.4 acceptance |

**STOP:** Implementation begins only after ARB approval of this Execution Program.

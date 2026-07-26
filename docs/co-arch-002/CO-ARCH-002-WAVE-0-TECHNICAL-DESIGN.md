# CO-ARCH-002 — Wave 0 Technical Design Package

**Program:** CO-ARCH-002  
**Wave:** 0 — Technical Design Freeze  
**Status:** **Approved by ARB** (with three amendments incorporated below)  
**Date:** 2026-07-21  
**Baseline:** Architecture Package v0.4 (Accepted) · Execution Program v1.0 (Accepted) · F0 Constitutional · ADR-016  
**Next wave:** Wave 6 complete — pending final ARB; production flag enablement blocked until final ARB

---

## ARB Amendments (Approved with Wave 0)

These amendments are **normative** for Wave 1+ and refine the Wave 0 design.

### A1 — Deal Snapshot

| Rule | Design |
|------|--------|
| Purpose | Preserve a point-in-time business picture of the Deal independent of later master-data edits |
| Working snapshot | `enterprise_deals.snapshot` JSONB — current denormalized business picture (customer, product, counterparties summary, commercials) |
| Historical snapshots | Table `enterprise_deal_snapshots` — **append-only** versions captured on create, stage transition, commercial version, and import |
| Rule | Snapshots are never mutated in place; new events append a new snapshot row |
| F0 | Snapshot belongs to exactly one Deal |

### A2 — Append-Only Timeline

| Rule | Design |
|------|--------|
| Table | `enterprise_deal_timeline_events` |
| Mutability | **INSERT only** — no UPDATE, no soft delete, no hard delete in application services |
| Enforcement | Repository exposes `appendEvent` only; no update/delete methods |
| Content | `event_type`, `occurred_at`, `actor_user_id`, `summary`, `payload` |
| F0 | Timeline is Deal-scoped SSOT for operational history |

*(Already in Wave 0 design; amendment makes enforcement explicit for Wave 1 engines.)*

### A3 — Deal Health reservation

| Rule | Design |
|------|--------|
| Purpose | Reserve storage for future Deal Health / readiness engines without implementing scoring in Wave 1 |
| Columns on `enterprise_deals` | `health_score` (INT NULL), `health_band` (TEXT NULL), `health_computed_at` (TIMESTAMPTZ NULL), `health_payload` (JSONB NULL) |
| Wave 1 | Columns created and left **null**; no compute jobs; no UI |
| Future waves | Mission Control / CHANAKYA / readiness write into reserved fields via Deal SSOT only |

---

## Wave 0 charter

| Item | Rule |
|------|------|
| Scope | Detailed technical design only (complete) |
| Coding | Was forbidden during Wave 0; Wave 1 authorized after ARB approval |
| Exit criteria | **Met** — ARB Approved Wave 0 + amendments |

### Constitutional binding (F0)

- Deal is the atomic transactional unit and SSOT for execution, workflow, intelligence, collaboration, accounting, analytics, AI, and lifecycle.  
- Every transactional entity belongs to **exactly one Deal**.  
- Master Registries **support** Deals; they are not transactional roots.  
- Existing functionality remains operational (flags default OFF).

---

## 1. Detailed technical design

### 1.1 System context

```
[Browser / My Deals / Workspaces]
        │  (flags OFF today → localStorage LoanFile)
        ▼
[Deal Ports / Dual-write adapters]     ← Waves 3–5
        │
        ▼
[Deal API  /api/enterprise-deals]      ← Wave 2
        │
        ▼
[Repositories + Deal Number service]   ← Wave 1
        │
        ▼
[Supabase Postgres · enterprise_deal_*]
        │
        ├── Organization / User (identity)
        ├── ECM Contact / Company (parties — support)
        └── Product / Lender / Document registries (masters — support)
```

### 1.2 Aggregate root & ownership

| Rule | Design |
|------|--------|
| Root | `EnterpriseDeal` (`enterprise_deals`) |
| Child ownership | All children FK `deal_id` with `ON DELETE CASCADE` (physical) + soft-delete discipline (logical) |
| Master FKs | `ON DELETE RESTRICT` — never destroy Deals when masters change |
| Identity | Immutable `id` + immutable `deal_number` after allocation |
| Reuse | Forbidden — new transaction → new Deal row |
| Tenancy | Every row carries `organization_id` |

### 1.3 ID strategy (alignment with existing schema)

| Choice | Decision |
|--------|----------|
| Primary keys | **`String @id @default(cuid())`** — matches `Organization`, `EcmContact`, `EnterpriseProduct`, `User` already in production |
| Not UUIDv4 | Avoid mixed ID styles across Tier 2/3; cuid remains org-scoped unique via PK |
| Deal Number | Separate human business key (`DEAL-YYYY-######`) — not the PK |

**ARB note:** Execution Program §1 mentioned UUID; Wave 0 **amends** to **cuid** for production consistency. Deal Number remains the human-facing identifier.

### 1.4 Layering for Wave 1+

| Layer | Responsibility | Wave |
|-------|----------------|------|
| Prisma models | Schema SSOT | 1 |
| Migration SQL | Additive create | 1 |
| Repositories | Org-scoped data access | 1 |
| Services | Deal Number, transitions, soft delete | 1–2 |
| API routes | HTTP contract | 2 |
| Dual-write adapters | LoanFile ↔ Deal | 3 |
| Dual-read ports | My Deals | 4 |
| Workspace consumers | Journey modules | 5 |
| Intelligence cutover | MC / CHANAKYA / Saarthi | 6 |

### 1.5 Non-goals for Wave 0–1

- UI changes  
- Enabling any Deal feature flag in production  
- AMC / Insurer registry tables (counterparty polymorphic id + type is enough; lender FK optional when type=lender)  
- Rewriting EOLE  
- Accounting ledger implementation  

---

## 2. Database migration plan

### 2.1 Migration name (proposed)

`20260721230000_co_arch_002_w1_enterprise_deal_registry`

(Applied only in **Wave 1** after Wave 0 approval.)

### 2.2 Migration principles

| Principle | Application |
|-----------|-------------|
| Additive only | `CREATE TABLE` / indexes / FKs — no drops of existing tables |
| Reversible | Down migration drops **only** new `enterprise_deal_*` objects |
| Zero downtime | No locks on hot existing tables beyond brief FK validation |
| Flags OFF | Schema exists idle; no app path requires it until Wave 2+ |
| Expand-contract | Nullable FKs to masters; snapshots always written |

### 2.3 Migration steps (Wave 1 execution order)

1. Create enums (Prisma) / CHECK constraints (SQL).  
2. Create `enterprise_deal_number_sequences`.  
3. Create `enterprise_deals`.  
4. Create child tables (participants → counterparties → documents → tasks → activities → notes → timeline → assignments → commercial_versions → link tables → import_batches).  
5. Create indexes (including partial uniques).  
6. Add FKs to `organizations`, `users`, `ecm_contacts`, `ecm_companies`, `enterprise_products`, `enterprise_lenders` (nullable where polymorphic).  
7. Seed nothing (empty registry).  
8. `prisma migrate deploy` on pilot → certify → later production.

### 2.4 Pre-migration checklist

- [ ] Backup / point-in-time recovery confirmed on Supabase  
- [ ] `prisma migrate status` clean on target  
- [ ] No open long transactions  
- [ ] Wave 0 ARB approval recorded  

### 2.5 Post-migration checklist

- [ ] All tables present; FKs valid  
- [ ] Sequence table insertable per org  
- [ ] Soft-delete module key reserved: `enterprise_deal`  
- [ ] App boots with flags OFF (no behavior change)

---

## 3. Prisma model design

### 3.1 Naming

| Prisma model | Table map |
|--------------|-----------|
| `EnterpriseDeal` | `enterprise_deals` |
| `EnterpriseDealParticipant` | `enterprise_deal_participants` |
| `EnterpriseDealCounterpartyAssignment` | `enterprise_deal_counterparty_assignments` |
| `EnterpriseDealDocumentLink` | `enterprise_deal_document_links` |
| `EnterpriseDealTask` | `enterprise_deal_tasks` |
| `EnterpriseDealActivity` | `enterprise_deal_activities` |
| `EnterpriseDealNote` | `enterprise_deal_notes` |
| `EnterpriseDealTimelineEvent` | `enterprise_deal_timeline_events` |
| `EnterpriseDealAssignment` | `enterprise_deal_assignments` |
| `EnterpriseDealCommercialVersion` | `enterprise_deal_commercial_versions` |
| `EnterpriseDealCommissionLink` | `enterprise_deal_commission_links` |
| `EnterpriseDealAccountingLink` | `enterprise_deal_accounting_links` |
| `EnterpriseDealNotificationLink` | `enterprise_deal_notification_links` |
| `EnterpriseDealIntelligenceLink` | `enterprise_deal_intelligence_links` |
| `EnterpriseDealWorkflowBinding` | `enterprise_deal_workflow_bindings` |
| `EnterpriseDealImportBatch` | `enterprise_deal_import_batches` |
| `EnterpriseDealNumberSequence` | `enterprise_deal_number_sequences` |

### 3.2 Enums (Prisma)

```
DealProductFamily: lending | mutual_fund | insurance | bonds | pms | other
DealLifecycleStatus: active | on_hold | won | lost | cancelled | archived
DealOperationalStatus: on_track | at_risk | delayed | completed
DealPriority: urgent | high | medium | low
DealCounterpartyType: lender | amc | insurer | issuer | institution | other
DealParticipantRole: primary_customer | co_applicant | guarantor | nominee | authorized_signatory | other
DealDocumentLinkStatus: required | requested | received | under_verification | verified | rejected | expired | waived
DealAssignmentRole: primary_owner | relationship_manager | source_owner | credit_owner | operations | other
DealImportBatchStatus: dry_run | pending | running | completed | failed | cancelled
```

Gross stage / sub-stage remain **TEXT** in Wave 1 (family stage masters evolve without enum migrations).

### 3.3 Root model sketch (normative for Wave 1 — not applied yet)

```prisma
model EnterpriseDeal {
  id                         String   @id @default(cuid())
  organizationId             String   @map("organization_id")
  dealNumber                 String   @map("deal_number")
  legacyLoanFileId           String?  @map("legacy_loan_file_id")
  fileNumber                 String?  @map("file_number")
  externalRefs               Json?    @map("external_refs")

  productId                  String?  @map("product_id")
  productCode                String?  @map("product_code")
  productLabel               String?  @map("product_label")
  productCategoryId          String?  @map("product_category_id")
  productGroupId             String?  @map("product_group_id")
  productFamily              DealProductFamily @map("product_family")
  transactionType            String?  @map("transaction_type")

  lifecyclePhase             String?  @map("lifecycle_phase")
  grossStage                 String   @map("gross_stage")
  subStage                   String?  @map("sub_stage")
  lifecycleStatus            DealLifecycleStatus @map("lifecycle_status")
  operationalStatus          DealOperationalStatus @map("operational_status")
  progressPercent            Int      @default(0) @map("progress_percent")
  daysInStage                Int      @default(0) @map("days_in_stage")
  stageEnteredAt             DateTime @map("stage_entered_at")
  closedAt                   DateTime? @map("closed_at")
  archived                   Boolean  @default(false)
  archivedAt                 DateTime? @map("archived_at")
  archivedBy                 String?  @map("archived_by")

  primaryOwnerUserId         String?  @map("primary_owner_user_id")
  relationshipManagerUserId  String?  @map("relationship_manager_user_id")
  relationshipManagerName    String?  @map("relationship_manager_name")
  sourceOwnerUserId          String?  @map("source_owner_user_id")
  creditOwnerUserId          String?  @map("credit_owner_user_id")
  teamId                     String?  @map("team_id")
  branchId                   String?  @map("branch_id")
  assignmentMode             String?  @map("assignment_mode")

  primaryContactId           String?  @map("primary_contact_id")
  primaryContactName         String?  @map("primary_contact_name")
  primaryContactMobile       String?  @map("primary_contact_mobile")
  primaryContactEmail        String?  @map("primary_contact_email")
  companyId                  String?  @map("company_id")
  employmentTypeCode         String?  @map("employment_type_code")
  cityCode                   String?  @map("city_code")
  stateCode                  String?  @map("state_code")
  cityLabel                  String?  @map("city_label")
  stateLabel                 String?  @map("state_label")

  currencyCode               String   @default("INR") @map("currency_code")
  requestedAmount            Decimal? @map("requested_amount") @db.Decimal(18, 2)
  approvedAmount             Decimal? @map("approved_amount") @db.Decimal(18, 2)
  fulfilledAmount            Decimal? @map("fulfilled_amount") @db.Decimal(18, 2)
  commercialTerms            Json?    @map("commercial_terms")
  lendingExtension           Json?    @map("lending_extension")

  primaryCounterpartyType    DealCounterpartyType? @map("primary_counterparty_type")
  primaryCounterpartyId      String?  @map("primary_counterparty_id")
  primaryCounterpartyName    String?  @map("primary_counterparty_name")
  primaryCounterpartyProgramId String? @map("primary_counterparty_program_id")

  expectedRevenue            Decimal  @default(0) @map("expected_revenue") @db.Decimal(18, 2)
  revenuePercent             Decimal? @map("revenue_percent") @db.Decimal(9, 4)
  revenueReceived            Decimal  @default(0) @map("revenue_received") @db.Decimal(18, 2)
  payoutConfigured           Boolean  @default(false) @map("payout_configured")
  settlementCompleted        Boolean  @default(false) @map("settlement_completed")

  priority                   DealPriority @default(medium)
  isUrgent                   Boolean  @default(false) @map("is_urgent")
  isDelayed                  Boolean  @default(false) @map("is_delayed")
  riskBand                   String?  @map("risk_band")
  sourceCode                 String?  @map("source_code")
  sourceContactId            String?  @map("source_contact_id")

  versionNumber              Int      @default(1) @map("version_number")
  rowVersion                 Int      @default(1) @map("row_version")
  createdBy                  String?  @map("created_by")
  updatedBy                  String?  @map("updated_by")
  createdAt                  DateTime @default(now()) @map("created_at")
  updatedAt                  DateTime @updatedAt @map("updated_at")
  isDeleted                  Boolean  @default(false) @map("is_deleted")
  deletedAt                  DateTime? @map("deleted_at")
  deletedBy                  String?  @map("deleted_by")
  deletionReason             String?  @map("deletion_reason") @db.Text

  organization Organization @relation(...)
  // children relations...
  // optional: product, primaryContact, company, users

  @@unique([organizationId, dealNumber])
  @@unique([organizationId, legacyLoanFileId])
  @@index([organizationId, isDeleted, archived, updatedAt(sort: Desc)])
  @@index([organizationId, primaryContactId])
  @@index([organizationId, productFamily, grossStage])
  @@index([organizationId, relationshipManagerUserId])
  @@index([organizationId, lifecycleStatus, operationalStatus])
  @@map("enterprise_deals")
}
```

### 3.4 Child model rules

| Model | Cascade from Deal | Soft delete | Notes |
|-------|-------------------|-------------|-------|
| Participant | CASCADE | Yes | UNIQUE(dealId, ecmContactId, role) |
| CounterpartyAssignment | CASCADE | Yes | Partial one-primary; `extension` JSONB for pipeline |
| DocumentLink | CASCADE | Yes | Nullable definition FKs during hybrid |
| Task / Activity / Note | CASCADE | Yes | |
| TimelineEvent | CASCADE | **No** | Append-only; no update API |
| Assignment | CASCADE | Yes | Effective dating |
| CommercialVersion | CASCADE | No rewrite | UNIQUE(dealId, versionNumber) |
| *Link tables | CASCADE | Yes | linkType + externalRef |
| ImportBatch | N/A | Status machine | Org-scoped |
| NumberSequence | N/A | N/A | PK = (organizationId, year) or org+prefix+year |

### 3.5 Organization relation updates (Wave 1)

Add reverse relations on `Organization` (and optionally `User`, `EcmContact`, `EnterpriseProduct`) — additive only.

---

## 4. Supabase schema (SQL-oriented summary)

### 4.1 Create order

Same as §2.3. All tables in schema `public`.

### 4.2 Critical SQL constraints

```sql
-- Deal number uniqueness
UNIQUE (organization_id, deal_number)

-- Idempotent migration key (NULL-safe unique)
UNIQUE (organization_id, legacy_loan_file_id) -- Prisma @@unique; app must not insert empty string

-- One primary counterparty assignment per deal (partial unique)
CREATE UNIQUE INDEX enterprise_deal_cp_one_primary
  ON enterprise_deal_counterparty_assignments (deal_id)
  WHERE is_primary = true AND is_deleted = false;

-- Progress bounds
CHECK (progress_percent BETWEEN 0 AND 100)
```

### 4.3 RLS (Wave 1 posture)

| Decision | Rationale |
|----------|-----------|
| **App-level tenancy** via Prisma `organizationId` filters | Matches ECM / registry pattern today |
| Supabase RLS | **Optional follow-on**; not required to ship Wave 1 if service role + API authZ enforced |
| Wave 0 recommendation | Document RLS policies as **Wave 2 hardening optional**; do not block Wave 1 |

---

## 5. Foreign keys

| From | To | On delete | Required |
|------|----|-----------|----------|
| `enterprise_deals.organization_id` | `organizations.id` | RESTRICT | YES |
| `enterprise_deals.primary_contact_id` | `ecm_contacts.id` | RESTRICT / SET NULL | NO |
| `enterprise_deals.company_id` | `ecm_companies.id` | RESTRICT / SET NULL | NO |
| `enterprise_deals.product_id` | `enterprise_products.id` | RESTRICT / SET NULL | NO |
| `enterprise_deals.*_user_id` | `users.id` | SET NULL | NO |
| children.`deal_id` | `enterprise_deals.id` | **CASCADE** | YES |
| children.`organization_id` | `organizations.id` | RESTRICT | YES |
| participants.`ecm_contact_id` | `ecm_contacts.id` | RESTRICT | YES |
| document_links.`document_definition_id` | `enterprise_document_definitions.id` | SET NULL | NO |
| document_links.`document_type_id` | `enterprise_document_types.id` | SET NULL | NO |
| counterparties.`counterparty_registry_id` when type=lender | `enterprise_lenders.id` | **No hard FK** in Wave 1 | Polymorphic — enforce in service layer |
| counterparties.`program_id` when lender | `enterprise_lender_programs.id` | SET NULL optional | NO |

**Polymorphic counterparties:** Wave 1 stores `(counterparty_type, counterparty_registry_id)` without cross-table FK to avoid blocking AMC/Insurer registries. Service validates lender IDs when type=lender.

---

## 6. Index strategy

### 6.1 Hot paths (My Deals list)

| Index | Purpose |
|-------|---------|
| `(organization_id, is_deleted, archived, updated_at DESC)` | Default registry sort |
| `(organization_id, product_family, gross_stage)` WHERE not deleted | Family + stage filters |
| `(organization_id, relationship_manager_user_id)` WHERE not deleted | My Deals scope |
| `(organization_id, primary_contact_id)` | Customer → Deals |
| `(organization_id, lifecycle_status, operational_status)` | Status chips |
| `(organization_id, product_id)` | Product filter |

### 6.2 Child hot paths

| Table | Index |
|-------|-------|
| timeline_events | `(deal_id, occurred_at DESC)` |
| tasks | `(deal_id, status, due_at)` |
| counterparties | `(deal_id, is_primary)`, `(organization_id, counterparty_type, counterparty_registry_id)` |
| documents | `(deal_id, status)` |
| import_batches | `(organization_id, created_at DESC)` |

### 6.3 Avoid

- Indexing large JSONB wholesale  
- Low-selectivity booleans alone (`is_urgent`) without org composite  

---

## 7. Audit strategy

| Layer | Mechanism |
|-------|-----------|
| Row audit | `created_at/by`, `updated_at/by`, `version_number` on mutable entities |
| Concurrency | `row_version` on Deal; increment on PATCH; API `409` on mismatch |
| Timeline | Append-only business events (stage change, create, assign, document status, …) |
| Soft-delete ledger | `EnterpriseSoftDeleteRecord` + `EnterpriseSoftDeleteAudit` with `module = 'enterprise_deal'` |
| Registry audit (optional) | Reuse `EnterpriseRegistryAuditEntry` for admin-significant Deal config changes if needed |
| EDL | Wave 5+ for commercial / policy-significant changes (`edl_entry_id` on commercial versions) |
| Actor identity | Prefer authenticated `userId`; store display name snapshot in timeline payload |

**Timeline event types (initial catalog):**  
`deal_created`, `deal_updated`, `stage_transitioned`, `status_changed`, `participant_added`, `counterparty_assigned`, `document_status_changed`, `task_changed`, `assignment_changed`, `commercial_versioned`, `imported`, `archived`, `soft_deleted`, `restored`

---

## 8. Soft delete strategy

| Entity | Soft delete | Archive | Hard delete |
|--------|-------------|---------|-------------|
| Deal | Yes (`is_deleted`) | Yes (`archived`) — hide from default My Deals without delete | **Forbidden** if accounting/commission links exist |
| Mutable children | Yes | N/A | Via parent purge policy only |
| Timeline | Never | N/A | Never |
| Commercial versions | Never rewrite; supersede | N/A | Never |

### Soft-delete flow

1. Set Deal `is_deleted=true`, reason, actor, timestamp.  
2. Upsert `EnterpriseSoftDeleteRecord` (`module=enterprise_deal`, `entityId=deal.id`, label=`dealNumber + primaryContactName`).  
3. Append soft-delete audit + timeline event.  
4. Default list APIs exclude `is_deleted=true`.  
5. Restore reverses flags + ESD record status=`restored`.

### Cascade policy

- Physical FK CASCADE removes children only on **hard** delete (not used in Soft Go-Live).  
- Soft delete of Deal does **not** bulk-update children in Wave 1 (children remain; queries join parent `is_deleted=false`). Optional Wave 6 job to mark children deleted.

---

## 9. Deal numbering strategy

### 9.1 Format

```
DEAL-{YYYY}-{######}
```

Example: `DEAL-2026-000142`

| Part | Rule |
|------|------|
| Prefix | `DEAL` (constant) |
| Year | Calendar year of allocation (IST or UTC — **freeze UTC** for consistency) |
| Sequence | Per `(organization_id, year)` monotonic integer, zero-padded to 6 |

### 9.2 Allocator

Table `enterprise_deal_number_sequences`:

| Column | Meaning |
|--------|---------|
| `organization_id` | Tenant |
| `year` | Allocation year |
| `next_value` | Next integer to issue |
| PK | `(organization_id, year)` |

**Algorithm (transactional):**

```
BEGIN;
SELECT next_value FROM ... WHERE org=? AND year=? FOR UPDATE;
-- if missing, insert next_value=1
UPDATE SET next_value = next_value + 1;
COMMIT;
deal_number = format('DEAL-%s-%06d', year, issued);
```

### 9.3 Rules

- Allocated **once** at create; never recycled.  
- Import of legacy LoanFiles: allocate new Deal Numbers (do not invent from fileNumber); store `file_number` separately.  
- Collisions: unique constraint aborts; retry allocation.

---

## 10. Feature flag strategy

### 10.1 Flags (frozen names)

| Env var | Default | Wave enable | Purpose |
|---------|---------|-------------|---------|
| `DEAL_REGISTRY_DUAL_WRITE` | unset/false | 3 | Write Deal on create/save |
| `DEAL_REGISTRY_PORT_RUNTIME` | unset/false | 4 | My Deals reads Deal API |
| `DEAL_REGISTRY_IMPORT_ENABLED` | unset/false | 4–6 | Import endpoint |
| `DEAL_REGISTRY_BLOCK_LOCAL_WRITE` | unset/false | 6 | Block localStorage SSOT writes |

### 10.2 Governance (match CO-ARCH-001)

- Code defaults **false** when unset.  
- Production enablement requires wave certification + ESC note.  
- Never enable Wave 6 block flag before Waves 3–5 certified.  
- Document in `.env.example` as commented OFF with warning.

### 10.3 Runtime resolution

Server-side: `process.env.*`  
Client dual-read: prefer `NEXT_PUBLIC_` mirror **only if** client must branch; otherwise server components / API clients hide flag (preferred: API always available, UI chooses source via server flag in list response `meta.source`).

**Wave 0 recommendation:** Keep flags **server-only**; My Deals calls API which no-ops/falls back until PORT_RUNTIME true — simplifies client.

---

## 11. Rollback strategy

### 11.1 Wave 1 (schema)

| Trigger | Action |
|---------|--------|
| Migrate fails | Fix forward; do not leave half-applied |
| Idle schema undesired | Down migration drops `enterprise_deal_*` only |
| Production idle tables | Leave in place (harmless) until Wave 2 |

### 11.2 Wave 2+ (runtime)

| Flag state | Effect |
|------------|--------|
| All OFF | Pre-Deal behavior (localStorage) |
| DUAL_WRITE OFF | Stop new Deal writes; existing Deal rows retained |
| PORT_RUNTIME OFF | My Deals uses localStorage again |
| BLOCK_LOCAL_WRITE OFF | Emergency reopen local writes |

### 11.3 Data rollback

- Bad import batch: soft-delete Deals where `import_batch_id` matches; mark batch `cancelled`.  
- Never DROP production Deal data without ESC.  
- Retain rows ≥ 30 days after cutover before any purge discussion.

### 11.4 Compatibility guarantee

Throughout Waves 1–5: **existing LoanFile localStorage paths remain functional** when flags are OFF or dual-read falls back.

---

## 12. Wave 0 certification package

### Engineering Certification
- [ ] Prisma model set complete vs F0 aggregate  
- [ ] cuid ID strategy documented  
- [ ] Polymorphic counterparty approach accepted  
- [ ] Flag names frozen  

### Data Certification
- [ ] FK / index / soft-delete / numbering strategies accepted  
- [ ] Migration additive & reversible  
- [ ] No data loss path for existing localStorage users  

### Business Certification
- [ ] Deal Number format accepted (`DEAL-YYYY-######`)  
- [ ] My Deals remains available during hybrid  
- [ ] One transaction → one Deal affirmed  

### AI Certification
- [ ] Timeline / intelligence link tables reserved for CHANAKYA & Saarthi Deal context  
- [ ] F0: AI learns from / reasons about Deals — no parallel AI case identity  

### Production Readiness Certification
- [ ] Flags default OFF  
- [ ] Rollback matrix approved  
- [ ] Wave 1 may proceed only after this checklist signed  

---

## 13. ARB decision request (Wave 0)

Please **Approve** or **Amend**:

1. cuid PKs (amendment from UUID wording in Execution Program)  
2. Polymorphic counterparties without hard FK to non-lender registries in Wave 1  
3. Deal Number format `DEAL-YYYY-######` (UTC year)  
4. Feature flag set & server-first resolution  
5. Soft-delete + ESD module key `enterprise_deal`  
6. Authorization to begin **Wave 1** (Prisma + migration only) after approval  

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-21 | Wave 0 Technical Design Package — submitted for ARB; no implementation |

**STOP:** Pause after Wave 0. Do not begin Wave 1 until ARB Approves this package.

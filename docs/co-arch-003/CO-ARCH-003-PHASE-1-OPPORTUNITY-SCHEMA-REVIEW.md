# CO-ARCH-003 Phase 1 — Opportunity Registry Schema (FOR REVIEW)

**Status:** AWAITING APPROVAL — Plan Mode  
**Date:** 2026-07-23  
**Program:** CO-ARCH-003  
**Gate:** Do **not** create or apply Prisma migrations until this schema is approved.

**Related:**  
- Blueprint: `docs/co-arch-003/CO-ARCH-003-IMPLEMENTATION-BLUEPRINT.md`  
- Glossary: `docs/co-arch-003/CO-ARCH-003-GLOSSARY.md`  
- Business invariants: `docs/co-arch-003/CO-ARCH-003-BUSINESS-INVARIANTS.md`  
- Constitution: `docs/architecture/FOUNDATION-PRINCIPLE-DEAL-CENTRIC.md` (F0′)

---

## 0. Constitutional business invariants (must be satisfied by this schema)

| ID | Invariant | Schema implication (Phase 1 / Phase 2) |
|----|-----------|----------------------------------------|
| **BI-1** | An Opportunity may exist with **zero** Deals | Opportunity table has **no** required Deal FK; create Opportunity alone is valid |
| **BI-2** | A Deal must belong to **exactly one** valid Opportunity | Phase 2: `enterprise_deals.opportunity_id` required FK → `enterprise_opportunities` |
| **BI-3** | Deal exists only if Opportunity exists **and** lender is assigned | Phase 1: no Deal create path from Opportunity Registry. Phase 2: reject Deal create without Opportunity + lender |
| **BI-4** | Opportunity stages ≠ Deal stages; never overlap | Phase 1: `requirement_stage` only on Opportunity — **no** lender pipeline columns on Opportunity |

**Hard rule for Phase 1:** Creating an Opportunity must **never** insert into `enterprise_deals`.

---

## 1. Purpose

Introduce Postgres **Opportunity Registry** as the SoR for financial requirements (Lead = Opportunity).

| Creates | Does not create / change |
|---------|---------------------------|
| `enterprise_opportunities` | `enterprise_deals` columns (no `opportunity_id` yet — Phase 2 / BI-2) |
| `enterprise_opportunity_number_sequences` | LoanFile migration |
| Supporting enums | Workspace / My Opportunities UI |

**Invariant:** Creating an Opportunity must never create a Deal (BI-1, BI-3).

---

## 2. Proposed enums

```prisma
enum OpportunityFulfilmentMode {
  exclusive        // e.g. Home Loan — typically one disbursing Deal
  additive         // e.g. Working Capital split across lenders
  policy_driven
}

enum OpportunityFulfilmentStatus {
  open
  partially_fulfilled
  fulfilled
  abandoned
}

enum OpportunityLifecycleStatus {
  active
  on_hold
  won
  lost
  cancelled
  archived
}
```

**Reuse (existing):** `DealProductFamily`, `DealPriority` — shared product family / priority vocabularies.  
*(Review question: keep reuse, or introduce Opportunity-specific enums for cleaner decoupling?)*

---

## 3. Proposed tables

### 3.1 `enterprise_opportunity_number_sequences`

| Column | Type | Notes |
|--------|------|--------|
| `organization_id` | FK → organizations | PK part |
| `year` | Int | UTC year; PK part |
| `next_value` | Int | default 1 |
| `updated_at` | DateTime | |

**Number format:** `OPP-YYYY-######` (e.g. `OPP-2026-000001`).

### 3.2 `enterprise_opportunities`

| Group | Columns | Notes |
|-------|---------|--------|
| Identity | `id` (cuid), `organization_id`, `opportunity_number` | Unique `(org, opportunity_number)` |
| Bridge | `legacy_loan_file_id` nullable | Unique `(org, legacy)` when set; Phase 5 backfill |
| Product | `product_id`, `product_code`, `product_label`, `product_family`, `transaction_type` | Requirement definition |
| Requirement lifecycle | `requirement_stage`, `requirement_sub_stage` | **BI-4:** requirement readiness only — **not** lender pipeline. Suggested: `raw_lead`, `qualified`, `documents_received`, `ready_for_market`, `in_market`, `fulfilled`, `abandoned` |
| Status | `lifecycle_status`, `fulfilment_mode`, `fulfilment_status`, `fulfilled_amount` | Fulfilment rollup later from Deals |
| Timing | `stage_entered_at`, `closed_at`, archive fields | |
| Ownership | RM / owner / team / branch | |
| Party | `primary_contact_id` **required** → ecm_contacts | Optional denormalized name/mobile/email |
| Company | `company_id` optional → ecm_companies | |
| Money | `currency_code` default INR, `requested_amount` | |
| Extensibility | `snapshot`, `lending_extension`, `external_refs` JSON | |
| Concurrency | `version_number`, `row_version` | Optimistic concurrency |
| Audit / soft delete | created/updated/deleted fields | Align with ECM / Deal patterns |

**Indexes (proposed):**

- list: `(organization_id, is_deleted, archived, updated_at DESC)`
- contact: `(organization_id, primary_contact_id)`
- stage: `(organization_id, product_family, requirement_stage)`
- RM / status indexes as in blueprint

**Foreign keys:**

- `organization_id` → `organizations` ON DELETE RESTRICT  
- `primary_contact_id` → `ecm_contacts` ON DELETE RESTRICT  
- `company_id` → `ecm_companies` ON DELETE RESTRICT  

**Phase 2 (out of scope here — BI-2 / BI-3):** `enterprise_deals.opportunity_id` **required** FK → this table; Deal create also requires lender identity. Opportunity remains valid with zero child Deals (BI-1).

---

## 4. Proposed Prisma fragment (review copy — not applied)

```prisma
model EnterpriseOpportunityNumberSequence {
  organizationId String   @map("organization_id")
  year           Int
  nextValue      Int      @default(1) @map("next_value")
  updatedAt      DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)

  @@id([organizationId, year], map: "eopp_seq_pk")
  @@map("enterprise_opportunity_number_sequences")
}

model EnterpriseOpportunity {
  id                        String                      @id @default(cuid())
  organizationId            String                      @map("organization_id")
  opportunityNumber         String                      @map("opportunity_number")
  legacyLoanFileId          String?                     @map("legacy_loan_file_id")
  externalRefs              Json?                       @map("external_refs")
  productId                 String?                     @map("product_id")
  productCode               String?                     @map("product_code")
  productLabel              String?                     @map("product_label")
  productFamily             DealProductFamily           @map("product_family")
  transactionType           String?                     @map("transaction_type")
  requirementStage          String                      @map("requirement_stage")
  requirementSubStage       String?                     @map("requirement_sub_stage")
  lifecycleStatus           OpportunityLifecycleStatus  @default(active) @map("lifecycle_status")
  fulfilmentMode            OpportunityFulfilmentMode   @default(exclusive) @map("fulfilment_mode")
  fulfilmentStatus          OpportunityFulfilmentStatus @default(open) @map("fulfilment_status")
  fulfilledAmount           Decimal                     @default(0) @map("fulfilled_amount") @db.Decimal(18, 2)
  stageEnteredAt            DateTime                    @map("stage_entered_at")
  closedAt                  DateTime?                   @map("closed_at")
  archived                  Boolean                     @default(false)
  archivedAt                DateTime?                   @map("archived_at")
  archivedBy                String?                     @map("archived_by")
  primaryOwnerUserId        String?                     @map("primary_owner_user_id")
  relationshipManagerUserId String?                     @map("relationship_manager_user_id")
  relationshipManagerName   String?                     @map("relationship_manager_name")
  teamId                    String?                     @map("team_id")
  branchId                  String?                     @map("branch_id")
  primaryContactId          String                      @map("primary_contact_id")
  primaryContactName        String?                     @map("primary_contact_name")
  primaryContactMobile      String?                     @map("primary_contact_mobile")
  primaryContactEmail       String?                     @map("primary_contact_email")
  companyId                 String?                     @map("company_id")
  employmentTypeCode        String?                     @map("employment_type_code")
  cityLabel                 String?                     @map("city_label")
  stateLabel                String?                     @map("state_label")
  currencyCode              String                      @default("INR") @map("currency_code")
  requestedAmount           Decimal?                    @map("requested_amount") @db.Decimal(18, 2)
  priority                  DealPriority                @default(medium)
  sourceCode                String?                     @map("source_code")
  sourceContactId           String?                     @map("source_contact_id")
  snapshot                  Json?
  lendingExtension          Json?                       @map("lending_extension")
  versionNumber             Int                         @default(1) @map("version_number")
  rowVersion                Int                         @default(1) @map("row_version")
  createdBy                 String?                     @map("created_by")
  updatedBy                 String?                     @map("updated_by")
  createdAt                 DateTime                    @default(now()) @map("created_at")
  updatedAt                 DateTime                    @updatedAt @map("updated_at")
  isDeleted                 Boolean                     @default(false) @map("is_deleted")
  deletedAt                 DateTime?                   @map("deleted_at")
  deletedBy                 String?                     @map("deleted_by")
  deletionReason            String?                     @map("deletion_reason") @db.Text

  organization   Organization @relation(...)
  primaryContact EcmContact   @relation("EnterpriseOpportunityPrimaryContact", ...)
  company        EcmCompany?  @relation("EnterpriseOpportunityCompany", ...)

  @@unique([organizationId, opportunityNumber], map: "eopp_org_number_key")
  @@unique([organizationId, legacyLoanFileId], map: "eopp_org_legacy_loan_file_key")
  @@map("enterprise_opportunities")
}
```

---

## 5. API / flags (design only — not implemented until schema approved)

| Item | Proposal |
|------|----------|
| Flag | `OPPORTUNITY_REGISTRY_API_ENABLED` — **idle default** (explicit `true` only) |
| Routes | `GET/POST /api/enterprise-opportunities`, `GET/PATCH/DELETE /api/enterprise-opportunities/:id` |
| Create body (min) | `primaryContactId`, `productFamily`, `requirementStage` (default `raw_lead`), `productLabel`, `requestedAmount` |
| BI-1 / BI-3 | Create Opportunity must **not** create Deal; no lender required on Opportunity create |
| BI-4 | API must not accept or return lender pipeline stages on Opportunity |

---

## 6. Review checklist (please confirm)

- [ ] **BI-1 … BI-4** accepted as constitutional (see `CO-ARCH-003-BUSINESS-INVARIANTS.md`)  
- [ ] Table/column names accepted  
- [ ] `OPP-YYYY-######` numbering accepted  
- [ ] Reuse of `DealProductFamily` / `DealPriority` accepted (or request Opportunity-specific enums)  
- [ ] Requirement stage as free `String` (vs enum) accepted — separate from Deal pipeline (BI-4)  
- [ ] Soft-delete / rowVersion pattern accepted  
- [ ] Phase 2 Deal FK deferred accepted (BI-2 / BI-3 enforcement deferred to Phase 2)  
- [ ] **Approve creation of Prisma migration** (separate explicit approval)

---

## 7. After approval

Only then:

1. Add models to `prisma/schema.prisma`  
2. Create migration under `prisma/migrations/`  
3. Apply to Pilot with explicit approval (`prisma migrate deploy`)  
4. Implement repository / service / API / verify script (assert BI-1: Opportunity create leaves `enterprise_deals` unchanged)

**No migration or DB apply in this Plan Mode package.**

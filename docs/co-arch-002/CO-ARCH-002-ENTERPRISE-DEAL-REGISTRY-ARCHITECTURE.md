# CO-ARCH-002 — Enterprise Deal Registry & Transaction Persistence

**Program:** CO-ARCH-002  
**Priority:** P0  
**Classification:** Architecture Completion  
**Status:** Architecture Package v0.4 — F0 constitutional text finalized; pending **final ARB approval**  
**Date:** 2026-07-21 (revised)  
**Related:** ADR-015 · ADR-016 · `docs/architecture/FOUNDATION-PRINCIPLE-DEAL-CENTRIC.md` · Soft Go-Live Investigation · ARB Foundation Amendment  
**Constraint:** Architecture only. **Do not begin implementation** until this revised package receives final ARB approval.

---

## Document control

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-07-21 | Initial package for ARB |
| 0.2 | 2026-07-21 | ARB Foundation Amendment — Deal as universal transactional entity |
| 0.3 | 2026-07-21 | Deal-Centric Platform Principle elevated as highest-level domain rule |
| **0.4** | **2026-07-21** | **F0 constitutional wording finalized (SSOT + Core Principles 1–6)** |

---

## Executive Summary

Soft Go-Live confirmed that enterprise **masters** persist (CO-ARCH-001) but the **transactional backbone** does not. My Deals and journey workspaces still depend on browser `localStorage`.

**Foundation Principle F0** establishes:

> Catalyst One is a Deal-Centric Enterprise Operating Platform.  
> A Deal is the atomic transactional unit of business. Every financial transaction is exactly one Deal.  
> The Deal is the single source of truth for execution, workflow, intelligence, collaboration, accounting, analytics, AI reasoning, and operational lifecycle.  
> Master Registries support Deals. Transactional Entities belong to Deals.

This principle is **constitutional** and supersedes all module-level design decisions. Every current and future module shall conform.

Canonical text: `docs/architecture/FOUNDATION-PRINCIPLE-DEAL-CENTRIC.md`

---

# FOUNDATION PRINCIPLE F0 (CONSTITUTIONAL — Normative)

## F0. Deal-Centric Enterprise

Catalyst One is a **Deal-Centric Enterprise Operating Platform**.

A Deal is the **atomic transactional unit of business** within Catalyst One. Every financial transaction undertaken by the enterprise is represented by **exactly one Deal**.

The Deal is the **single source of truth** for business execution, workflow, intelligence, collaboration, accounting, analytics, AI reasoning, and operational lifecycle.

Every transactional activity within Catalyst One must be **directly associated with a Deal**.

Enterprise master data—including Customers, Companies, Products, Counterparties (Lenders, AMCs, Insurance Companies, Issuers), Users, Organizations, and Reference Registries—exists **solely to support** the creation, governance, execution, and analysis of Deals.

If a proposed feature, workflow, report, AI capability, automation, or business process cannot be directly related to a Deal or to the enterprise master data that supports Deals, its purpose within Catalyst One must be questioned.

### Core Principles

1. Every business transaction creates exactly one Deal.  
2. A Deal is never reused and its identity is immutable.  
3. A Customer may have unlimited independent Deals running in parallel.  
4. Each Deal maintains its own lifecycle, documents, tasks, activities, accounting, commissions, communications, audit trail, and AI context.  
5. All enterprise intelligence, reporting, automation, workflow orchestration, and operational decision-making are Deal-centric.  
6. **Master Registries support Deals. Transactional Entities belong to Deals.**

This principle is constitutional and supersedes all module-level design decisions. Every current and future module of Catalyst One shall conform to this Deal-Centric Enterprise Architecture.

## F1. What a Deal is (definitional detail)

A Deal is **not** a loan.  
A Deal is **not** an opportunity.  
A Deal is **not** a loan file.

**Definition (frozen):**

> *A Deal represents one distinct business transaction or financial engagement between Rupee Catalyst and a customer.*

Every transaction creates **exactly one** Deal.

| Example transaction | Result |
|---------------------|--------|
| Home Loan | one Deal |
| Home Loan Balance Transfer | one Deal |
| Loan Against Property | one Deal |
| Personal Loan | one Deal |
| Business Loan | one Deal |
| Working Capital Loan | one Deal |
| Mutual Fund SIP | one Deal |
| Mutual Fund Lump Sum | one Deal |
| Insurance Policy | one Deal |
| Bond Investment | one Deal |
| PMS Investment | one Deal |
| Any future financial product | one Deal |

Lending, wealth, and protection are **product classifications of Deals** — not separate transactional roots.

## F2. Customer relationship

Customers do not “own products.” Customers own **relationships**. Deals represent **transactions**.

```
Customer (1)
    │
    ├── Deal 1
    ├── Deal 2
    ├── Deal 3
    ├── Deal 4
    └── … unlimited parallel Deals
```

- A customer may have **unlimited parallel Deals**.  
- Each Deal is **completely independent**.  
- Each Deal has its own lifecycle, documents, workflow, accounting, commissions, tasks, activities, AI history, and audit trail.

## F3. Product relationship

Products **classify** Deals. They are not containers of customer state.

```
One Product  →  Many Deals

Home Loan    →  Deal 1001, 1002, 1058, 2125
Mutual Fund  →  Deal 3101, 3102, 3128
```

## F4. Counterparty relationship

The Deal references the relevant **counterparty** for fulfillment. Depending on product type this may be:

- Lender  
- AMC  
- Insurance Company  
- Issuer  
- Financial Institution  
- Any future provider  

**The Deal entity must not assume “Lender.”**  
It uses a **generalized counterparty model**, while preserving **lender-specific workflows** as a specialization when the product family is lending.

## F5. Immutability of identity

- A Deal is **never reused**.  
- Every new transaction creates a **brand-new Deal**.  
- Same customer + same counterparty + same product + same property + same RM → **still a new Deal**.  
- **Deal ID never changes** after allocation.

## F6. Aggregate root

The Deal is the **aggregate root** for all transactional data. Every transactional object must reference `dealId`, including:

Documents · Tasks · Activities · Notes · Workflow · Accounting · Commissions · Notifications · AI Conversations · Audit · Timeline

**No module may create its own independent transactional identity.**

## F7. Platform consequence

| Former framing | Correct framing |
|----------------|-----------------|
| Loan CRM | **Enterprise Financial Services Operating Platform** |
| Loan File as root | Loan File / Opportunity / Pipeline = **views or specializations of a Deal** |
| Lender-only model | **Counterparty** model with lending specialization |

---

# DELIVERABLE 1 — Business Purpose & Entity Name

## 1.1 Business Purpose

Catalyst One requires a single persistent transactional backbone so that every financial engagement:

1. Survives browser refresh, device change, and cleared storage  
2. Appears in **My Deals** for entitled users  
3. Shares **one Deal ID** across Contacts, workspaces, Documents, Tasks, Accounting, Mission Control, Search, and CHANAKYA  
4. Carries ownership, stage, commercials, counterparties, documents, tasks, audit, and AI context  
5. Consumes Tier 1 / Tier 2 masters (ADR-015) via FKs — never parallel shadow transaction stores  
6. Supports **any financial product** without redesigning the transactional model  

### Positioning vs CO-ARCH-001

| Program | Concern | Tier (ADR-015) |
|---------|---------|----------------|
| CO-ARCH-001 | Master / reference data | Tier 0–2 |
| **CO-ARCH-002** | **Transactional engagement (universal)** | **Tier 3 — Operational Registry** |

ECM = Tier 3 **parties** (relationships).  
Enterprise Deal = Tier 3 **transactions**.

## 1.2 Entity Name Recommendation

| Candidate | ARB outcome |
|-----------|-------------|
| **Enterprise Deal** | **Canonical — approved** |
| Enterprise Opportunity | Rejected as root (early-lifecycle only; may remain a UI/workspace label) |
| Enterprise Loan File | Rejected as root (lending specialization / execution view only) |

**Canonical:** Enterprise Deal · `EnterpriseDeal` · `enterprise_deals` · Deal Number (e.g. `DEAL-2026-000142`)

### Compatibility aliases (non-canonical)

| Alias | Use |
|-------|-----|
| `legacyLoanFileId` | Migration from localStorage `LoanFile.id` (lending-era bridge) |
| `opportunityCode` / EOLE id | Bridge during dual-write |
| `fileNumber` | Legacy display (`RC-2026-####`) where already used |
| UI “Loan File” / “Opportunity” | **Workspace labels** for a Deal in a given journey phase — not separate entities |

---

# DELIVERABLE 2 — Complete Entity Design

## 2.1 Design principles

1. **Deal is the aggregate root** — all transactional children FK to `dealId`.  
2. **Universal, not loan-specific** — product family drives optional extensions; core schema is product-agnostic.  
3. **Immutable identity** — UUID + Deal Number never recycled.  
4. **New transaction = new Deal** — never mutate one Deal into another commercial engagement.  
5. **Customer 1 → N Deals** — parallel Deals are first-class.  
6. **Product classifies; does not own** — `productId` on Deal; one product → many Deals.  
7. **Generalized counterparty** — not lender-hardcoded.  
8. **Organization-scoped** · Tier 0 audit · soft delete · versioned commercials · EDL for significant changes.

## 2.2 Aggregate structure

```
EnterpriseDeal (aggregate root)
├── DealParticipant[]              (customer-side parties → ECM Contact FKs)
├── DealCounterpartyAssignment[]   (providers: lender | amc | insurer | issuer | …)
│     └── optional lending pipeline fields when counterpartyType = lender
├── DealDocumentLink[]
├── DealTask[]
├── DealActivity[]                 (operational activities / follow-ups)
├── DealNote[]
├── DealTimelineEvent[]            (append-only)
├── DealAssignment[]               (RM, credit, ops → User / EUM)
├── DealCommercialVersion[]        (amounts, fees, ROI, tenure, AUM, premium — versioned)
├── DealCommissionLink[]           (commission / payout commercial links)
├── DealAccountingLink[]
├── DealNotificationLink[]
├── DealIntelligenceLink[]         (CHANAKYA / Mission Control / AI conversation refs)
└── DealWorkflowBinding[]          (workflow engine instances keyed by dealId)
```

**Lending specialization (not a second root):** when `productFamily = lending`, counterparty assignments of type `lender` may carry Lender Pipeline stage/sub-stage fields. Wealth / insurance use the same assignment table with type-appropriate pipeline fields (nullable / JSON extension per family — finalized in Wave 1).

## 2.3 Root entity — `EnterpriseDeal`

### Identifiers

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID PK | Immutable; never reused |
| `organizationId` | UUID FK | Tenant |
| `dealNumber` | string unique/org | Human business ID |
| `legacyLoanFileId` | string? | Migration bridge only |
| `fileNumber` | string? | Legacy display |
| `externalRefs` | JSON? | Provider application / folio / policy refs |

### Product classification

| Field | Type | Notes |
|-------|------|--------|
| `productId` | UUID? FK enterprise_products | Classifies this Deal |
| `productCode` / `productLabel` | string | Snapshot |
| `productCategoryId` / `productGroupId` | UUID? | |
| `productFamily` | enum | `lending` · `mutual_fund` · `insurance` · `bonds` · `pms` · `other` (extensible) |
| `transactionType` | string/enum | Family-specific (e.g. fresh · balance_transfer · sip · lump_sum · new_policy) |

### Lifecycle (product-family aware)

| Field | Type | Notes |
|-------|------|--------|
| `lifecyclePhase` | enum | Journey phase — family-specific catalogs allowed later; initial catalog = lending journey |
| `grossStage` | string/enum | Operational stage from family stage master |
| `subStage` | string? | |
| `lifecycleStatus` | enum | `active` · `on_hold` · `won` · `lost` · `cancelled` · `archived` |
| `operationalStatus` | enum | `on_track` · `at_risk` · `delayed` · `completed` |
| `progressPercent` | int | |
| `daysInStage` | int | |
| `stageEnteredAt` | timestamptz | |
| `closedAt` | timestamptz? | |
| `archived` / `archivedAt` / `archivedBy` | | |

### Ownership

| Field | Type | Notes |
|-------|------|--------|
| `primaryOwnerUserId` | UUID? | |
| `relationshipManagerUserId` | UUID? | |
| `relationshipManagerName` | string | Snapshot |
| `sourceOwnerUserId` | UUID? | |
| `creditOwnerUserId` | UUID? | Lending-oriented; nullable for other families |
| `teamId` / `branchId` | UUID? | |
| `assignmentMode` | enum | personal · team · pooled |

### Customer / Company (relationship side)

| Field | Type | Notes |
|-------|------|--------|
| `primaryContactId` | UUID FK ecm_contacts | Customer relationship anchor |
| `primaryContactName` / `Mobile` / `Email` | snapshot | |
| `companyId` | UUID? FK ecm_companies | |
| `employmentTypeCode` · `cityCode` · `stateCode` | Tier 1 | + label snapshots |

A customer may appear on **many** Deals; this FK never implies exclusivity.

### Commercial request (family-extensible)

| Field | Type | Notes |
|-------|------|--------|
| `currencyCode` | string | default INR |
| `requestedAmount` | decimal? | Loans / investments / premiums as applicable |
| `approvedAmount` | decimal? | Generic “approved / sanctioned / allotted” |
| `fulfilledAmount` | decimal? | Disbursed / invested / issued |
| `commercialTerms` | JSON? | Family-specific terms (ROI, tenure, SIP amount, sum assured, …) until typed columns proven |
| Typed lending fields (nullable) | | `interestRate`, `tenureMonths`, `lendingType`, BT fields, property fields, CIBIL band — **optional extension**, not required for non-lending Deals |

### Counterparty (summary)

| Field | Type | Notes |
|-------|------|--------|
| `primaryCounterpartyType` | enum | `lender` · `amc` · `insurer` · `issuer` · `institution` · `other` |
| `primaryCounterpartyId` | UUID? | Polymorphic toward provider registries (Lender Registry first; AMC/Insurer registries later) |
| `primaryCounterpartyName` | string? | Snapshot |
| `primaryCounterpartyProgramId` | UUID? | Program / scheme / plan |
| **Detail** | `DealCounterpartyAssignment[]` | N counterparties per Deal when required |

**Do not** place `primaryLenderId` as the only provider FK on the root. Prefer counterparty fields; map lender as `counterpartyType = lender` for lending Deals.

### Revenue & commissions

| Field | Type | Notes |
|-------|------|--------|
| `expectedRevenue` / `revenueReceived` / `revenuePercent` | decimal | |
| `payoutConfigured` | boolean | |
| `settlementCompleted` | boolean | Accounting — not a pipeline stage |
| `DealCommissionLink[]` | | Per-Deal commission objects |

### Priority / source / risk

| Field | Type | Notes |
|-------|------|--------|
| `priority` | enum | urgent · high · medium · low |
| `isUrgent` / `isDelayed` | boolean | |
| `riskBand` | string? | |
| `sourceCode` / `sourceContactId` | | |

### Collections (all keyed by `dealId`)

| Collection | Purpose |
|------------|---------|
| `DealDocumentLink` | Document instances |
| `DealTask` / `DealActivity` | Work items |
| `DealNote` | Notes |
| `DealTimelineEvent` | Append-only history |
| `DealAssignment` | People roles |
| `DealCommercialVersion` | Versioned commercials |
| `DealAccountingLink` | Accounting |
| `DealCommissionLink` | Commissions |
| `DealNotificationLink` | Notifications |
| `DealIntelligenceLink` | AI / Mission Control / CHANAKYA |
| `DealWorkflowBinding` | Workflow engine |

### Audit (Tier 0)

`versionNumber`, `createdAt/By`, `updatedAt/By`, soft-delete columns, `rowVersion` / etag.

## 2.4 Child sketches (amended)

### `DealParticipant`
`dealId`, `ecmContactId`, `role` (primary_customer · co_applicant · guarantor · nominee · … — family-extensible), ownership fields where relevant, audit.

### `DealCounterpartyAssignment` *(replaces lender-only child as the normative model)*
`dealId`, `counterpartyType`, `counterpartyRegistryId`, `programId?`, `isPrimary`, `pipelineStage?`, `pipelineSubStage?`, `applicationRef?`, `decision?`, `decisionAt?`, `extension` JSON for family-specific pipeline, audit.

Lending UI continues to call this “Lender Pipeline” when `counterpartyType = lender`.

### Remaining children
`DealDocumentLink`, `DealTask`, `DealActivity`, `DealTimelineEvent`, `DealAssignment`, `DealCommercialVersion`, `DealCommissionLink`, `DealAccountingLink`, `DealNotificationLink`, `DealIntelligenceLink`, `DealWorkflowBinding` — each **must** include `dealId`; none may invent a parallel transactional root.

## 2.5 Mapping from today’s `LoanFile` (migration bridge only)

| LoanFile | EnterpriseDeal |
|----------|----------------|
| `id` | `legacyLoanFileId` + new Deal UUID |
| One LoanFile row | **One Deal** with `productFamily = lending` |
| `lenders[]` | `DealCounterpartyAssignment` where type = lender |
| Same customer, new loan | **New Deal** (never reuse) |

---

# DELIVERABLE 3 — Lifecycle Design

## 3.1 Principles

1. Lifecycle belongs to the **Deal**, not to a product silo.  
2. **Stage catalogs may vary by `productFamily`** (lending vs MF vs insurance).  
3. Initial certified catalog = **lending journey** (current Soft Go-Live surface).  
4. Future families add stage masters **without** changing the Deal aggregate root.  
5. Counterparty pipeline state is **per assignment**, not a second Deal identity.

## 3.2 Axes (do not collapse)

| Axis | Purpose |
|------|---------|
| **A. Business Journey Phase** | Where the operator is in the enterprise journey for this Deal |
| **B. Gross Stage** | Operational stage from the family stage master |
| **C. Counterparty Pipeline** | Per-provider progress (e.g. lender login / credit) |

## 3.3 Initial certified journey (lending family)

Preserved for Soft Go-Live continuity (Chanakya Loan Journey order frozen):

```
Contact → Opportunity Workspace → Strategic Workspace → Document Center
→ Credit Workbench → Loan Workspace → Lender Pipeline → Tasks → Timeline
→ Approval → Disbursement → Accounting → Closure
```

Phases: Lead Qualification → Credit Readiness → Loan Execution → Post Disbursement.

**Interpretation under Foundation Amendment:** these workspaces operate **on a Deal** whose `productFamily = lending`. They do not define a separate “loan entity.”

## 3.4 Initial gross stages (lending family)

```
raw_lead → pre_login → logged_in → credit_wip → soft_approved
→ final_approved → closure_wip → won
```

Side statuses: `on_hold` · `lost` · `cancelled` · `archived`.

## 3.5 Future family catalogs (placeholders — not implementation)

| Family | Illustrative stages (non-normative until certified) |
|--------|-----------------------------------------------------|
| Mutual Fund | intent → KYC → scheme_selection → order → allotted → servicing |
| Insurance | intent → need_analysis → quotation → proposal → underwriting → issued → servicing |
| Bonds / PMS | intent → suitability → allocation → executed → servicing |

Each remains **one Deal** with its own independent lifecycle.

## 3.6 Transition rules (universal)

Every stage/status change on a Deal:

1. Updates Deal lifecycle fields  
2. Appends `DealTimelineEvent`  
3. Emits audit / EDL when policy-significant  
4. Never creates a second transactional identity  
5. Never reuses a closed Deal for a new commercial engagement — **open a new Deal**

---

# DELIVERABLE 4 — Relationship Diagram

```text
                    ENTERPRISE IDENTITY (Org / User / EUM)
                                    │
                    ECM CONTACT / COMPANY (relationships)
                                    │ 1
                                    │
                                    │ N parallel Deals
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│           ★ ENTERPRISE DEAL — aggregate root (transactions) ★        │
│     One transaction = One Deal · ID immutable · Never reused         │
└───┬──────────┬──────────┬──────────┬──────────┬──────────┬───────────┘
    │          │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼          ▼
 Product    Counterparty  Document   Workflow  Accounting  Mission /
 (1→N       (Lender|AMC|  Registry   Engine    Commissions CHANAKYA /
  Deals)     Insurer|…)   Tier 2               Notifications AI
  Tier 2     Tier 2+

Customer ──relationship──► many Deals
Product  ──classifies───► many Deals
Deal     ──fulfills via──► Counterparty assignment(s)
```

### Relationship rules (amended)

| Related system | Cardinality | Rule |
|----------------|-------------|------|
| ECM Contact | Customer 1 → N Deals | Unlimited parallel Deals; each Deal independent |
| Product Registry | Product 1 → N Deals | Product classifies; never owns customer state |
| Counterparty | Deal 0..N | Generalized type; lender is one type |
| Document / Task / Activity / Note / Timeline / Workflow / Accounting / Commission / Notification / AI | N → 1 Deal | **Must** FK `dealId`; no independent transactional roots |
| Mission Control / CHANAKYA | derived | Observe Deal SSOT only |
| “Loan File” / “Opportunity” UI | 1 → 1 Deal | Views of the same Deal |

---

# DELIVERABLE 5 — Migration Strategy

## 5.1 States

```
CURRENT                 HYBRID                      FULL ENTERPRISE
───────                 ──────                      ───────────────
localStorage LoanFile   Dual-write/read Deal        Deal authoritative
Loan-centric mental     Deal root + lending view    All product families
model                   flags                       on same Deal model
```

## 5.2 Hybrid rules (amended)

1. Each migrated / newly created lending engagement → **exactly one Deal** (`productFamily = lending`).  
2. Dual-write from `createLoanFileFromInput` / OW Save → Deal upsert by `legacyLoanFileId` (idempotent).  
3. **Never** map two commercial engagements onto one Deal.  
4. Import dry-run + checksum; no silent data loss.  
5. My Deals dual-read via `DEAL_REGISTRY_PORT_RUNTIME`.  

## 5.3 Full enterprise

- localStorage writes blocked in production  
- All modules bind to `enterpriseDealId`  
- New MF / Insurance / etc. create Deals on the **same** table — no second registry  

## 5.4 Data-loss prevention

Unchanged controls from v0.1 (idempotent keys, soft delete, import batches, dual-write ack, rollback flags), with explicit rule:

> Migrating N historical LoanFiles yields N Deals — never collapsed by customer or product.

---

# DELIVERABLE 6 — Module Impact Analysis

| Module | Impact | Amendment note |
|--------|--------|----------------|
| **Any new feature** | Gate | Must relate to a Deal or to master data that supports Deals — or justify exception under F0 |
| **Contacts** | Critical | Start **Deal** (any product); customer may already have other Deals |
| **My Deals** | Critical | Universal Deal registry; filter by product family / product; tabs = product families |
| **Opportunity / Strategic Workspace** | Critical | Planning **view of a Deal** (typically lending); Save persists Deal |
| **Loan Workspace / Lender Pipeline** | Critical | Lending **execution view** of a Deal; counterparties typed lender |
| **Document Center / Credit Workbench** | High | Always `dealId`; checklists may vary by product family |
| **Tasks / Activities / Timeline / Notes / Communications** | High | Children of Deal only |
| **Accounting / Commissions** | High | Links on Deal; per-Deal independence |
| **Mission Control / Dashboards / Reports / Analytics** | High | Aggregate / measure Deals; never invent loan-only SSOT |
| **CHANAKYA / Saarthi / AI / Search** | High | Context = Deal; conversations linked by `dealId` |
| **Future MF / Insurance / Bonds / PMS** | Design-ready | New stage catalogs + counterparties — **same Deal root** |
| **Auth / RBAC / Org / Reference Masters** | Medium | Master / identity layers that **support** Deals (F0) |

**Forbidden after Full Enterprise:** any module introducing a parallel transactional identity that is not an alias of `enterpriseDealId`.  
**Questioned by F0:** any feature that cannot relate to a Deal or to enterprise master data that supports Deals.  
**Normative split:** Master Registries support Deals · Transactional Entities belong to Deals.

---

# DELIVERABLE 7 — Implementation Plan (Waves)

Principles unchanged: independently deployable · reversible · certifiable.  
**Wave 0 status:** Foundation Amendment incorporated — awaiting **final ARB approval** before Wave 1.

### Wave 0 — Architecture & Contracts Freeze
| | |
|--|--|
| **Objective** | Freeze F0 constitutional text + Core Principles 1–6, F1–F7, Deal-as-root, counterparty model |
| **Certification** | Final ARB acceptance of **v0.4** + ADR-016 **Accepted** |

### Wave 1 — Schema & Persistence Foundation
| | |
|--|--|
| **Objective** | `enterprise_deals` + children including **`DealCounterpartyAssignment`** (not lender-only root FKs); `productFamily`; nullable lending extensions |
| **Risk** | Over-fitting lending columns into required core — mitigate with family extensions |
| **Rollback** | Idle tables / reverse migration in non-prod |
| **Certification** | Schema review against F1–F7; repository smoke |

### Wave 2 — Deal Persistence API
| | |
|--|--|
| **Objective** | CRUD/list/import; create always allocates **new** Deal ID; tenancy; productFamily filters |
| **Rollback** | Flag / disable routes |
| **Certification** | Contract + tenancy + “never reuse Deal” tests |

### Wave 3 — Dual-Write Create/Save
| | |
|--|--|
| **Objective** | Lending create paths + OW Save → Deal; return Deal Number |
| **Flag** | `DEAL_REGISTRY_DUAL_WRITE` default OFF |
| **Certification** | One create → one Deal row; second create for same customer → second Deal |

### Wave 4 — My Deals Dual-Read
| | |
|--|--|
| **Objective** | Registry reads Deal API; empty-state honesty; product family filters |
| **Flag** | `DEAL_REGISTRY_PORT_RUNTIME` default OFF |
| **Certification** | Soft Go-Live: create appears in My Deals from API |

### Wave 5 — Workspace Consumers
| | |
|--|--|
| **Objective** | Journey modules on `enterpriseDealId`; lender pipeline via counterparty assignments |
| **Certification** | Full lending journey on one Deal ID |

### Wave 6 — Intelligence, Cutover, Multi-family readiness
| | |
|--|--|
| **Objective** | Mission Control / CHANAKYA / Search on Deal; block local writes; document extension path for MF/Insurance without new transactional root |
| **Certification** | Empty localStorage proof; ESC checklist |

### Flag matrix

| Flag | Default | Purpose |
|------|---------|---------|
| `DEAL_REGISTRY_DUAL_WRITE` | OFF | Write Deal on create/save |
| `DEAL_REGISTRY_PORT_RUNTIME` | OFF | Read Deal API |
| `DEAL_REGISTRY_BLOCK_LOCAL_WRITE` | OFF | Hard-stop local SSOT writes |
| `DEAL_REGISTRY_IMPORT_ENABLED` | OFF | Browser import |

### Non-goals

- Redesigning ECM  
- Replacing Tier 1/2 masters  
- Building full Accounting/AMC/Insurer registries in this program (counterparty **model** yes; every provider registry may follow)  
- Changing Chanakya “advise never block” constitution  
- Implementing MF/Insurance journeys in Wave 1–5 (architecture must **allow** them)

---

## ADR cross-reference

**ADR-016** incorporates Foundation Principle **F0** (pending final acceptance of **v0.4**).

Decision summary:

> Catalyst One is a Deal-Centric Enterprise Operating Platform. A Deal is the atomic transactional unit and SSOT for execution, workflow, intelligence, collaboration, accounting, analytics, AI, and lifecycle. Master Registries support Deals; Transactional Entities belong to Deals. Every module shall conform.

Constitutional text: `docs/architecture/FOUNDATION-PRINCIPLE-DEAL-CENTRIC.md`  
Agent rule: `.cursor/rules/deal-centric-enterprise.mdc`

---

## Final ARB Decision Request

Please **finally approve** this **v0.4** package confirming:

1. **F0** constitutional text is binding (including Core Principles 1–6)  
2. Master Registries support Deals; Transactional Entities belong to Deals  
3. Foundation Principles F1–F7 remain normative detail  
4. Generalized **counterparty** model (lender as specialization)  
5. Customer 1→N Deals; Product 1→N Deals  
6. Aggregate-root rule for all transactional modules  
7. Waves 0–6 remain the execution plan after acceptance  

**Pause:** No implementation until final ARB approval of this revised architecture.

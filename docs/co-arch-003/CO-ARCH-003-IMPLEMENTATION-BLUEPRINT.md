# CO-ARCH-003 — Opportunity-Centric Lending Domain Model  
# Implementation Blueprint (PLAN ONLY)

**Status:** **APPROVED** (business architecture) · **Phase 0 COMPLETE** · **Phase 1 schema AWAITING APPROVAL** (Plan Mode)  
**Date:** 2026-07-23  
**Authority:** Business Architecture Approved (Contact → Opportunity → Deal)  
**Supersedes (domain grain):** CO-ARCH-002 / ADR-016 / F0 interpretation that treated Opportunity and Deal as the same transactional entity; LoanFile-as-everything spine  
**Does not discard:** Contact (ECM), Lender Registry, Product Registry, Document Registry, enterprise persistence stack, journey UX patterns (to be remapped)

**Current gate:** Phase 0 constitutional docs complete. Opportunity Registry **schema** submitted for review.  
**Blocked:** Prisma migration create/apply · Phase 1 code · Deal refactor · workspaces — until schema explicitly approved.

---

## Constitutional restatement (F0′ for lending)

1. **Contact** is the party root.  
2. **Opportunity** (Lead) is the **financial requirement** root — exists before any lender.  
3. **Deal** is the **lender execution** root — exists only after a lender/program is identified.  
4. One Contact → many Opportunities → many Deals per Opportunity.  
5. Requirement lifecycle ≠ lender pipeline.  
6. Creating a requirement creates an **Opportunity**, never a Deal.  
7. Identifying/assigning a lender creates a **Deal**.

### Business invariants (constitutional — frozen)

Full text: `docs/co-arch-003/CO-ARCH-003-BUSINESS-INVARIANTS.md`

| ID | Invariant |
|----|-----------|
| **BI-1** | An Opportunity may exist with **zero** Deals. |
| **BI-2** | A Deal must always belong to **exactly one** valid Opportunity. |
| **BI-3** | A Deal cannot exist until a valid Opportunity exists **and** a lender is identified/assigned. |
| **BI-4** | Opportunity stages (requirement readiness) and Deal stages (lender execution) are independent — never overlap or interchange. |

---

## 1. Database Architecture

### 1.1 Design principles

- Postgres remains Tier-3 SSOT (no browser SoR for new transactional roots).  
- Separate tables for Opportunity and Deal (not JSON nesting as SoR).  
- Soft-delete + audit fields consistent with ECM / EnterpriseDeal patterns.  
- Organization-scoped uniqueness for business numbers.  
- Preserve bridge IDs during migration (`legacyLoanFileId`, etc.).  
- Honour **BI-1 … BI-4** in every schema and API decision.
### 1.2 Opportunity table (new) — suggested name `enterprise_opportunities`

| Column group | Examples | Notes |
|--------------|----------|--------|
| Identity | `id` (cuid), `organization_id`, `opportunity_number` (e.g. `OPP-2026-000123`) | Business-facing number ≠ Deal number |
| Party | `primary_contact_id` → `ecm_contacts.id` (required for lending) | Company optional: `company_id` |
| Requirement | `product_id` / `product_label`, `product_family`, `transaction_type`, `requested_amount`, `currency_code` | One product requirement per row |
| Lifecycle | `requirement_stage` (Raw Lead, Qualified, Documents Received, Ready for Market, …) | **Not** lender pipeline |
| Ownership | RM / team / branch / source | Same patterns as today |
| Fulfilment policy | `fulfiliment_mode` (`exclusive` \| `additive` \| `policy_driven`) | Home Loan vs WC split |
| Fulfilment rollup | `fulfilled_amount`, `fulfilment_status` (open / partially_fulfilled / fulfilled / abandoned) | Derived + stored for queues |
| Continuity | `legacy_loan_file_id` nullable | Bridge from old LoanFile |
| Audit | `created_at/by`, `updated_at/by`, `is_deleted`, … | Soft delete |

**Indexes:** `(organization_id, opportunity_number)` unique; `(organization_id, primary_contact_id)`; list indexes by stage/RM/updated_at.

**Optional children (later waves):** Opportunity participants, Opportunity notes, Opportunity timeline — or shared polymorphic links (see §6).

### 1.3 Deal table — evolution of `enterprise_deals`

**Recommendation:** **Retain table `enterprise_deals`**, redefine meaning to **per-lender Deal**, and add required Opportunity FK.

| Change | Detail |
|--------|--------|
| Add | `opportunity_id` → `enterprise_opportunities.id` (**required** for new lending Deals) |
| Add / harden | `lender_id` / `lender_program_id` / counterparty fields (**required** for new Deals — no Deal without lender) |
| Keep | `deal_number` (`DEAL-YYYY-######`), pipeline fields (`gross_stage` / sub-stage as **lender** pipeline), amounts, commercial JSON, soft delete |
| Repurpose | `legacy_loan_file_id` — may point to historical LoanFile **or** become nullable once Opportunity owns the bridge |
| Deprecate as SoR | Using a Deal row as “pre-lender Home Loan requirement” |

**Uniqueness:** `(organization_id, deal_number)` unique; consider `(organization_id, opportunity_id, lender_id, program_id)` unique for active (non-deleted) rows to prevent duplicate active Deals per lender on same Opportunity (policy-configurable).

### 1.4 Relationships / foreign keys

```text
ecm_contacts (Contact)
    1 ─── * enterprise_opportunities
                1 ─── * enterprise_deals
                            * ─── 1 enterprise_lenders (or program)
```

| FK | From | To | Rule |
|----|------|-----|------|
| `primary_contact_id` | Opportunity | Contact | Required (lending) |
| `opportunity_id` | Deal | Opportunity | Required (new lending Deals) |
| `lender_id` / program | Deal | Lender registry | Required (new Deals) |
| Optional | Deal | Contact | Denormalized display only; SoR party is Opportunity.contact |

**Invariant (app + DB check where practical):**  
`Deal.primary_contact_id` (if stored) must match `Opportunity.primary_contact_id`.

### 1.5 Numbering

| Entity | Format | Allocator |
|--------|--------|-----------|
| Opportunity | `OPP-YYYY-######` | New `enterprise_opportunity_number_sequences` |
| Deal | `DEAL-YYYY-######` | Existing `enterprise_deal_number_sequences` |

UI must **stop** deriving `OPP-*` from `LoanFile.fileNumber` (`RC-2026-*` hack).

### 1.6 Migration strategy (schema)

1. **Additive first:** create `enterprise_opportunities` (+ sequence).  
2. Add nullable `opportunity_id` on `enterprise_deals`.  
3. Backfill Opportunities + link Deals (data phases below).  
4. Enforce `opportunity_id NOT NULL` for lending family (check constraint or app gate).  
5. Enforce lender required on new Deals.  
6. Only later: drop obsolete columns / LoanFile authority.

No destructive drops in early waves.

---

## 2. Existing Tables — Retain / Rename / Deprecate

### 2.1 Summary

| Artifact | Future |
|----------|--------|
| **ECM Contact / Company** | **Retain** — Contact root unchanged |
| **`enterprise_opportunities`** | **Create** — requirement SoR |
| **`enterprise_deals`** | **Retain & redefine** — per-lender Deal SoR |
| **`EnterpriseDealCounterpartyAssignment`** | **Deprecate as lender-case SoR**; migrate into Deal row (or 1:1 Deal↔assignment during transition); table may remain for non-lending counterparties or historical audit |
| **`LoanFile` (TypeScript + localStorage)** | **Deprecate as transactional SoR**; temporary read cache / compatibility shim only; eventual removal (Phase C style) |
| **Deal child tables** (tasks, docs links, activities, notes, timeline, commission, accounting, …) | **Retain**, re-home ownership: some move to Opportunity scope (see §6) |
| **Enterprise Lender / Product / Document registries** | **Retain** — masters supporting Opportunity + Deal |
| **EOLE types** (`enterprise-opportunity-lifecycle-engine`) | **Evaluate**: align or absorb into Opportunity Registry; avoid parallel SoR |

### 2.2 LoanFile — future

| Phase | Role |
|-------|------|
| Now | De facto Opportunity+Deal+lenders[] blob |
| Transition | Compatibility DTO mapped **from** Opportunity + Deal(s); writes go to Postgres registries |
| End state | Removed as SoR; optional projection type for legacy UI only |

`compass:loan-files-data` becomes **cache only**, then removed under CO-GOV-001.

### 2.3 EnterpriseDeal — future

| Today (CO-ARCH-002) | Tomorrow (CO-ARCH-003) |
|---------------------|-------------------------|
| One row ≈ one customer engagement / LoanFile | One row ≈ **one lender Deal** under an Opportunity |
| Pre-lender “create Deal” allowed | **Forbidden** — create Opportunity instead |
| Lenders as `lenders[]` / counterparty children | Lender identity **on the Deal** |

### 2.4 EnterpriseDealCounterpartyAssignment — future

| Option | When |
|--------|------|
| **A (recommended for lending):** Each lending assignment **becomes** a Deal row; assignment table stops being the lender pipeline SoR | Cleanest match to frozen model |
| **B:** Keep assignment as technical child 1:1 with Deal | Only if multi-counterparty non-lending deals need the generalized pattern |

For **lending**, prefer **A**. Non-lending product families can keep generalized counterparty patterns later without blocking lending cutover.

### 2.5 My Deals registry mapping

Today: one My Deals row per LoanFile / engagement Deal.  
Tomorrow: one My Deals row per **lender Deal**.  
My Opportunities: new queue — one row per Opportunity.

---

## 3. Migration Strategy (data) — no history loss

**Goal:** Every historical customer journey remains explainable: who → what requirement → which lender cases → outcomes.

### Phase 1 — Inventory & classify (read-only)

1. Inventory `LoanFile` localStorage + `enterprise_deals` + counterparty assignments.  
2. Classify each legacy row:
   - **Requirement-only** (no lender / empty lenders) → Opportunity only  
   - **Single lender** → Opportunity + one Deal  
   - **Multi lender** → Opportunity + N Deals  
3. Produce migration report (counts, orphans, conflicts).  
4. No user-facing cutover yet.

### Phase 2 — Dual-write / dual-read (additive)

1. Deploy Opportunity Registry (API + flags) **idle until certified**.  
2. New creates: **Opportunity-first**; lender assign → **Deal**.  
3. Legacy UI still readable via projection from Opportunity/Deal **or** LoanFile shim.  
4. Backfill job (batch, reversible):
   - For each legacy LoanFile / engagement Deal: create Opportunity (`OPP-…`), copy product/amount/contact/requirement stage.  
   - For each lender in `lenders[]` or counterparty assignment: create Deal (`DEAL-…`) linked to that Opportunity + lender + pipeline stage.  
   - If zero lenders: Opportunity only; **do not** invent a Deal.  
5. Store bridges: `opportunity.legacy_loan_file_id`, `deal.legacy_loan_file_id` / assignment id.  
6. Verify: Contact Abhiraj-style cases → Opportunity exists; Deals only if lenders exist.

### Phase 3 — Cutover & decommission

1. Flip read SSOT: My Opportunities / My Deals / workspaces read Postgres registries.  
2. Block legacy LoanFile-primary create (fail closed).  
3. Soft-retire localStorage LoanFile SoR.  
4. Mark counterparty-as-pipeline deprecated for lending.  
5. Constitutional docs amended; CO-P0-006 reframed (primary write applies to **Opportunity** create and **Deal** create separately).  
6. Hard-delete / archive legacy only after certification soak.

**History preservation rules**

- Never delete Customer/Contact rows.  
- Never drop Deal/Opportunity rows without soft-delete + reason.  
- Timeline/audit: copy or link events to the correct new parent (Opportunity vs Deal) per §6 classification.  
- Historical “OPP-2026-2004” display strings: map via `legacy_loan_file_id` / stored old `fileNumber` on Opportunity for search continuity.

---

## 4. Routing Strategy

### 4.1 Recommended routes

| Route | Purpose |
|-------|---------|
| `/my-opportunities` | Requirement work queue (Workspace 1) |
| `/opportunities/:opportunityId` | Opportunity Workspace (canonical) |
| `/opportunities/:opportunityId/deals` | Optional deep-link to child Deals tab (same workspace) |
| `/opportunities/:opportunityId/deals/:dealId` | Open Deal context **within** Opportunity shell **or** redirect to Deal Workspace with return context |
| `/my-deals` | Lender execution queue (Workspace 2) — **retain path** |
| `/deals/:dealId` | Deal Workspace (lender execution desk) |

**Aliases / redirects (compatibility)**

| Legacy | Future |
|--------|--------|
| `/opportunities` (Strategic Workspace entry) | Prefer `/my-opportunities` for queue; `/opportunities/:id` for workspace |
| `/loan-files`, `/loan-information` | Redirect/map into Opportunity create or Opportunity Workspace; do not mint Deals |
| `?file=` / `?opportunityId=` as LoanFile id | Migrate to `opportunityId` = Opportunity cuid/number; `dealId` for lender case |

### 4.2 Query contract (frozen target)

- Opportunity context: `opportunityId` (Postgres Opportunity id; display number separate).  
- Deal context: `dealId` (Postgres Deal id).  
- Contact context: `contactId` when entering from Contacts.  
- Deprecate dual meaning of `opportunityId` ≈ `fileId` ≈ OPP string from `fileNumber`.

### 4.3 Primary nav (Column 1)

Suggested order impact:

- Keep **Contacts**  
- Add / elevate **My Opportunities**  
- Keep **My Deals** (meaning changes to lender Deals only)  
- **Loan Workspace** label → migrate toward Opportunity Workspace / Deal Workspace composition (avoid three conflicting desks long-term)

---

## 5. Workspace Strategy

### 5.1 My Opportunities

- Rows = Opportunities (Contact name, product, amount, requirement stage, RM, ageing).  
- Click → `/opportunities/:opportunityId`.  
- Primary CTA on empty Deals: **Identify / Assign Lender** (creates Deal).

### 5.2 My Deals

- Rows = Deals only (Lender, product from parent Opportunity, Deal pipeline stage, amounts, RM).  
- Click → `/deals/:dealId` (Deal Workspace) with breadcrumb back to parent Opportunity.  
- Filter by lender, Deal stage, Opportunity, Contact.

### 5.3 Opportunity Workspace

Layout (frozen intent):

1. Opportunity header (Contact, product, amount, requirement stage)  
2. **Child Deals** board/table (empty state until lenders assigned)  
3. Documents (Opportunity-scoped + rollup indicators)  
4. Tasks  
5. Timeline  
6. Communications  

Actions: Edit requirement · Change requirement stage · Assign lender (→ create Deal) · Open Deal.

### 5.4 Deal Workspace

- Lender execution desk: pipeline, bank-specific docs, login/credit/PD, sanction, disbursement.  
- Header shows parent Opportunity + Contact (read-only context).  
- CTAs: Continue pipeline · Back to Opportunity · Open Contact.

### 5.5 Navigation between them

```text
My Opportunities → Opportunity Workspace ⇄ Deal Workspace ← My Deals
         ↑                                      │
         └──────── Contact Workspace ───────────┘
```

Continue/Back journey map remapped:

- Contact → Opportunity (not “create Deal”)  
- Opportunity → (optional) Credit/Docs at Opportunity scope → Assign Lender → Deal → Lender Pipeline (Deal-scoped)  
- Deal never orphans: always has `opportunityId`

---

## 6. Business Objects — Ownership Classification

Legend: **C** Contact · **O** Opportunity · **D** Deal · **S** Shared/link (explicit FK to one primary + optional cross-link)

| Object | Owner | Notes |
|--------|-------|-------|
| Identity / KYC profile | **C** | Progressive completeness |
| Company / employment masters | **C** (+ company registry) | |
| Financial requirement (product, amount) | **O** | |
| Requirement lifecycle / Raw Lead→Ready for Market | **O** | |
| Strategic qualification / LIFE strategy | **O** | Shortlist may be O-scoped until Deal created |
| Lender analysis / comparison (pre-assign) | **O** | Becomes D when lender assigned |
| Eligibility (customer/product) | **O** (primary); **D** for lender-specific eligibility | |
| Credit assessment (file-level) | **O** primary; lender credit notes **D** | |
| Lender identity / program | **D** | Required to create Deal |
| Lender pipeline status | **D** only | |
| Sanction letter | **D** | |
| Disbursement / fulfilment tranche | **D** | O rollup sums D disbursements |
| Accounting entries (fee, payout) | **D** primary; O rollup for requirement P&L | |
| Commission | **D** | Payable against lender Deal |
| Login pack / bank forms | **D** | |
| Customer KYC / income / property docs | **O** (shared across Deals) | Deal may **link** copies/status |
| Tasks | **S** — task.`scope` = O \| D | Queue filters by scope |
| Activities | **S** — O \| D | |
| Notes | **S** — O \| D | |
| Timeline / audit events | **S** — emit with `opportunityId` and/or `dealId` | |
| Communications / outbox | **S** — recipient from C; context O and/or D | |
| Participants (co-app, guarantor) | **O** primary; Deal may reference | |
| Chanakya / readiness | Dual engines: O readiness vs D pipeline health | Never conflate metrics |

**Hard rules**

- No lender pipeline field on Opportunity.  
- No “Disbursed” as Opportunity stage (Opportunity uses fulfilment status derived from Deals).  
- No Deal without lender + Opportunity.

---

## 7. Implementation Roadmap (small safe phases)

Aligned with CO-GOV-001: Local → Preview → Production; certify each phase.

### Phase 0 — Constitutional & program freeze (docs only)

- Amend F0 / ADR-016 / deal-centric rules to Opportunity-centric lending grain.  
- Publish this blueprint as accepted.  
- Freeze vocabulary glossary.  
- **Exit:** ARB sign-off.

### Phase 1 — Opportunity Registry (foundation)

- Schema `enterprise_opportunities` + number sequence.  
- Repository / service / API (CRUD, search by contact).  
- Flags (idle until certified).  
- Admin/verify scripts.  
- **No** UI cutover yet.  
- **Exit:** Local API create Opportunity for Contact; row in Postgres.

### Phase 2 — Deal Registry redefinition

- Add `opportunity_id` (+ lender required gates for new lending Deals).  
- Change create contract: Deal create requires Opportunity + lender.  
- Stop treating engagement-without-lender as Deal.  
- Dual-write from lender-assign actions only.  
- **Exit:** Assign HDFC → Deal row linked to Opportunity; Abhiraj Home Loan without lender → Opportunity only.

### Phase 3 — Workspaces & routing

- My Opportunities queue + `/opportunities/:id` shell with Child Deals.  
- Remap My Deals to per-lender Deal rows.  
- Deal Workspace `/deals/:id`.  
- Redirects from `/loan-files` / loan-information create → Opportunity.  
- **Exit:** UX matches frozen workspace design on Local.

### Phase 4 — Object re-homing (docs/tasks/timeline/comms)

- Scope fields / APIs per §6.  
- Opportunity-shared docs vs Deal-specific docs.  
- Metrics split: requirement funnel vs lender funnel (SSOT calculators once each).  
- **Exit:** No pipeline status on Opportunity UI; CHANAKYA messages respect scope.

### Phase 5 — Historical data migration

- Execute Phase 1–3 data migration strategy (§3).  
- Reconcile reports; fix orphans.  
- **Exit:** Zero silent drops; sample certification pack (Abhiraj-like, multi-lender, WC split).

### Phase 6 — Testing & Local Certification

- Unit/integration on invariants.  
- Business UAT scripts: create Opp → no Deal; assign lenders → N Deals; exclusive vs additive fulfilment.  
- Regression: Contact ECM, Lender Registry, auth unchanged.  
- **Exit:** Local Certification reports (Technical, Business, Regression).

### Phase 7 — Preview → Production cutover (CO-GOV-001)

- Preview env mirrors + deploy.  
- Production approval gate; env flags; soak; rollback runbook (Opportunity/Deal flags).  
- Decommission LoanFile SoR / obsolete dual paths.  
- **Exit:** Production Certification.

---

## 8. Explicit non-goals (this blueprint)

- Immediate deletion of `enterprise_deals` or LoanFile code.  
- Big-bang rewrite of CHANAKYA in Phase 1.  
- Treating this document as permission to code.  
- Preserving CO-ARCH-002 “Deal = engagement” grain.

---

## 9. Success criteria (program-level)

1. Creating Home Loan ₹25L for a Contact creates **Opportunity only**.  
2. Assigning HDFC/SBI creates **separate Deal** rows under that Opportunity.  
3. My Opportunities ≠ My Deals content.  
4. Opportunity Workspace lists child Deals.  
5. Lender pipeline statuses exist only on Deals.  
6. Historical journeys remain reconstructible via bridges.  
7. F0/ADR docs amended to match this model.

---

## 10. Approval checkpoint

| Item | Status |
|------|--------|
| Business model Contact → Opportunity → Deal | **Approved** (input) |
| This implementation blueprint | **Awaiting approval** |
| Implementation coding | **Blocked** until separate prompt |

After approval, issue a phase-scoped implementation prompt (recommend start with **Phase 0 docs amendment + Phase 1 Opportunity Registry** only).

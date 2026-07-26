# Catalyst One — Enterprise Architecture Baseline Report

**Document type:** Enterprise Architecture Baseline Audit  
**Status:** **DRAFT — Submitted for Product Architecture Review**  
**Date:** 2026-07-25  
**Authority:** Product Architecture  
**Classification:** ARCHITECTURE AUDIT ONLY  

**Explicit non-goals**

- No implementation  
- No refactoring  
- No cleanup  
- No routing, UI, database, or code modifications  
- No file removal  

**Purpose**

Establish the official architectural baseline for future Product Architecture Reviews, implementation programmes, and Constitutional Health Checks.

**Related constitutional artefacts**

| Artefact | Status |
|----------|--------|
| ADR-018 Start Loan Journey / Hub / Lead Information | FROZEN |
| ADR-019 Deal Workspace Identity | APPROVED · Architecture CERTIFIED · FROZEN · Implementation not authorised |
| CAD-2026-001 / ADR-017 Business Data Provenance | CERTIFIED |
| Pre-Launch Single Implementation Rule | IN FORCE until Go-Live |
| Business Capability Ownership | IN FORCE (ADR-019 §3A) |
| Constitutional Health Check | IN FORCE |

---

## 1. Executive Architecture Summary

Catalyst One is a **Next.js App Router** enterprise operating platform for lending journey execution, with Prisma-backed enterprise registries, a family of composition-based enterprise engines, Mission Control intelligence surfaces, and CHANAKYA advisory AI.

### Strengths (baseline)

1. **Clear Opportunity-side identity progress** — ADR-018 delivered Execution Hub (`/loan-journey`), Lead Information (`/lead-information`), and Draft → Requirement Captured lifecycle.  
2. **Enterprise Registries** — Opportunity, Deal, Contact/ECM, Lender, Product, Document, Reference Masters, Invoice Party with Tier 0–3 master-data model (ADR-015).  
3. **Constitutional governance pack** — CAD-2026-001, Single Implementation Rule, Business Capability Ownership, Constitutional Health Check, Replacement Certification.  
4. **Separation of queues** — My Opportunities vs My Deals.  
5. **Document Center governance** — single authoring SSOT for Opportunity documents.

### Primary architectural tensions (baseline)

1. **Deal Workspace identity** — Product language and ADR-019 target `/deals/:dealId`; live execution still on `/loan-files` + Loan Workspace chrome (architecture frozen; implementation not authorised).  
2. **LoanFile dual role** — Still runtime DTO / localStorage cache alongside Enterprise Deal Registry (Phase B dual-write; Phase C retirement not complete).  
3. **Engine maturity variance** — Many engines use in-memory ports; Credit & Risk vs EPDE/ERDE boundaries need Product clarity.  
4. **Naming collisions** — `/credit-bench` = Lead Creation; `/credit-workbench` = Credit Bench; Chanakya journey labels vs Canonical Journey Header.  
5. **FS-01 / FS-02 gates** — Opportunity runtime awaiting Product Owner “FS-01 Approved”; FS-02 Deal runtime backlog must not fork from ADR-019.

### One-sentence baseline

Catalyst One has a **certified Opportunity journey identity** and a **certified Deal Workspace identity (architecture only)**; production code still hosts Deal execution under the **Loan Files / Loan Workspace** surface, with LoanFile as a transitional implementation artefact.

---

## 2. Enterprise System Architecture

### 2.1 Applications / platforms

| Surface | Route group | Role |
|---------|-------------|------|
| Public Auth | `src/app/(auth)/` | Login, password, org registration, invitation |
| Catalyst One Dashboard | `src/app/(dashboard)/` | Primary operational + admin UI |
| Mission Control | `src/app/(mission-control)/` | Executive / ops intelligence |
| Horizon | `src/app/(horizon)/` | Horizon planning workspace |
| API | `src/app/api/` | Next.js route handlers (incl. auth per ADR-014) |
| Server domain | `server/` | Prisma repositories & services |

**Note:** Nested `compass/` tree may contain a parallel app — **NEEDS PRODUCT DECISION** on boundary.

### 2.2 Domains (logical)

| Domain | Description |
|--------|-------------|
| Party / Contact | ECM people & companies |
| Opportunity | Requirement planning & pre-lender execution |
| Deal | Lender-specific transactional execution |
| Document | Document definitions + Opportunity document instances |
| Lender / Counterparty | Lender Registry & programmes |
| Product | Product Library / Product Registry |
| Credit & Risk | Policy, rules, eligibility modelling |
| Workflow | Workflow definition & orchestration |
| Accounting | Invoicing, payees, financial ops |
| Intelligence | CHANAKYA, Radar, Mission Control, Executive Intelligence |
| Identity & Access | Users, roles, permissions, org |
| Governance | EDL, ECG, Architecture Atlas, System Modes |

### 2.3 Services (representative)

| Layer | Examples |
|-------|----------|
| Opportunity | `server/services/enterprise-opportunity/`, `src/lib/enterprise-opportunity/` |
| Deal | `server/services` + `src/lib/enterprise-deal/` (DAL, dual-write, primary-write) |
| Lender / Product / Document registries | `server/services/*-registry/`, matching repositories |
| Auth | `server/services/auth.service.ts`, `token.service.ts` |
| Contact / ECM | `src/lib/enterprise-contact-master/`, `src/lib/enterprise-registry/` |

### 2.4 Engines & platforms

See §6 (Enterprise Engine Inventory) and Mission Control / CHANAKYA platforms in §10.

---

## 3. Business Capability Inventory

| Capability | Purpose | Status | Canonical Route | Primary Workspace | SSOT / Data Owner | Registry | Related ADR/CAD | Implementation Status |
|------------|---------|--------|-----------------|-------------------|-------------------|----------|-----------------|------------------------|
| Dashboard | “What should I work on today?” | Active | `/dashboard` | User Home Dashboard | Mixed widgets | — | CO-SPRINT-114 | Canonical; some LoanFile-backed widgets |
| CHANAKYA Radar | Prioritisation / health Kanban | Active | `/chanakya-radar` | Radar | Radar derive + Opp/Deal feeds | — | Radar rules | Canonical; `/pipeline` redirect alias |
| Contacts | Party registry | Active | `/contacts` | Contact Workspace | ECM Contact | Contact / Party Registry | Contact rules | Canonical |
| My Opportunities | Requirement queue | Active | `/my-opportunities` | My Opportunities | Opportunity Registry | Opportunity Registry | CO-ARCH-003 | Canonical |
| My Deals | Lender Deal queue | Active | `/my-deals` | My Deals | Enterprise Deal Registry | Deal Registry | ADR-016 / CO-ARCH-002 | Canonical queue; **open path dual** |
| Loan Journey (Hub) | Journey orchestration | Active | `/loan-journey` | Execution Hub | Orchestration (not Opp/Deal SSOT) | — | ADR-018 | Canonical |
| Lead Information | Capture Product + Amount | Active | `/lead-information` | Lead Information | Opportunity Registry | Opportunity Registry | ADR-018 | Canonical |
| Opportunity — Lead Creation | OW enrichment entry | Active | `/credit-bench` | CreditBenchWorkspace | Opportunity Registry | Opportunity Registry | FS-01, CAD-2026-001 | Canonical route; **name debt** |
| Document Center | Document authoring | Active | `/document-center` | Document Center | Document Center / Document Registry | Document Registry | Doc Center governance | Canonical; `/documents` alias |
| Credit Workbench | Eligibility evaluation | Active | `/credit-workbench` | Enterprise Credit Workspace | Opportunity Registry (+ credit engines) | — | FS-01 | Canonical |
| LIFE | Strategy / lender shortlist | Active | `/opportunities` | Opportunity Workspace / LIFE | Opportunity Registry + LIFE | — | FS-01 | Canonical |
| Lender Pipeline | Per-lender Deal stages | Active | Hosted on `/loan-files?file=` | Loan Workspace modal | Deal Registry / LoanFile lenders | Deal Registry | CO-ARCH-003 | Dual host (Loan Files) |
| Deal Workspace | Post–Move to Deal execution | Architecture only | **Target** `/deals/:dealId` | Deal Workspace | Enterprise Deal Registry | Deal Registry | **ADR-019** | Arch FROZEN; **impl not authorised**; live = `/loan-files` |
| Accounting | Financial ops | Active | `/accounting` | Accounting | Accounting / Invoice Party | Invoice Party | CO-ARCH-003 Phase 2B | Canonical (evolving) |
| Lenders | Lender directory / ELW | Active | `/lenders` | Enterprise Lender Workspace | Lender Registry | Lender Registry | CO-ARCH-001 | Canonical |
| Tasks | Follow-ups / task board | Active | `/tasks` | Tasks | Task engine (+ entity links) | — | — | Canonical; entity links dual |
| Mission Control | Ops / executive intelligence | Active | `/mission-control` | Mission Control modules | Multi-engine | — | CO-SPRINT MC | Canonical |
| Administration | Configuration only | Active | `/admin` | Administration Console | Config / masters / EDL | Multiple Tier 1–2 | Nav freeze | Canonical |
| Horizon | Forward planning | Active | `/horizon` | Horizon | Horizon module | — | — | Canonical (maturity TBD) |
| Investments | Future product line | Placeholder | `/investments` | — | TBD | — | — | Planned (“Soon”) |
| Loan Information (legacy) | LoanFile create form | Legacy | `/loan-information` | LoanCreateFormDialog | LoanFile (legacy) | — | Superseded by ADR-018 | Legacy create path |

---

## 4. Registry Inventory

| Registry | Purpose | Admin / UI | Code SSOT (indicative) | Persistence |
|----------|---------|------------|------------------------|-------------|
| Tier 0 Registry metadata | Audit, attachments, import batches | Architecture / registry services | `server/repositories/enterprise-registry/` | Prisma |
| Reference Masters (Tier 1) | Domain lookups (city, employment, …) | `/admin/reference-masters` | `src/constants/enterprise-master-data/` | Prisma `EnterpriseReferenceMaster` |
| Product Registry | Products, categories, groups | `/admin/product-library` | `server/services/product-registry/` | Prisma |
| Document Registry (definitions) | Document types & definitions | Document Registry APIs / admin | `server/services/document-registry/` | Prisma |
| Document Registry (instances) | Uploaded Opportunity documents | Document Center | `src/lib/document-registry/` | Runtime + links |
| Lender Registry | Lenders, programmes, contacts | `/admin/lender-registry`, `/lenders` | `src/lib/enterprise-lender-registry/` | Prisma |
| Opportunity Registry | Requirement SSOT | `/my-opportunities`, OW stages | `server/services/enterprise-opportunity/` | Prisma `EnterpriseOpportunity` |
| Deal Registry | Lender execution SSOT | `/my-deals`, `/loan-files` | `src/lib/enterprise-deal/` | Prisma `EnterpriseDeal` (+ flags) |
| Contact / Party (ECM) | People & companies | `/contacts` | `src/lib/enterprise-contact-master/` | Prisma ECM models |
| Invoice Party | Accounting counterparty | Accounting masters | `src/lib/invoice-party/` | Prisma |
| Enterprise Asset Library | Configurable assets | `/admin/enterprise-assets` | `src/lib/enterprise-asset-framework/` | Framework |
| Foundation Libraries | Cross-domain catalogues | `/admin/foundation-libraries` | `src/lib/enterprise-foundation-libraries/` | Tiered |
| Organization Documents | Corporate docs | `/organization/documents` | `src/lib/organization-documents/` | Org surfaces |
| Workflow Definition Registry | Workflow defs/versions | `/admin/workflow-engine/registry` | `src/lib/enterprise-workflow-engine/` | Often in-memory ports |
| Architecture / Atlas Registry | Platform asset catalogue | `/admin/architecture/atlas` | Atlas components | Config/UI |

**Distinguish:** Business Registries (SSOT) vs in-process `*-registry.ts` plugin catalogues inside engines.

---

## 5. Register Inventory

PMO / governance **Registers** (human-governed lists) live primarily under `docs/pmo/registers/`:

| Register | Purpose |
|----------|---------|
| ADR Register | Architecture Decision Records index |
| Decision Register | Product / architecture decisions |
| Risk Register | Programme risks |
| Issue Register | Open issues |
| Change Register | Controlled changes |
| Program Backlog Register | Backlog items |
| Architecture Freeze Register | Frozen architecture items |

**Enterprise Decision Ledger (EDL)** is a constitutional **ledger** (append-only memory), not a PMO register — `/admin/enterprise-decision-ledger`.

---

## 6. Enterprise Engine Inventory

| Engine | Acronym / name | Primary location | Notes |
|--------|----------------|------------------|-------|
| Enterprise Workflow Engine | EWE | `src/lib/enterprise-workflow-engine/` · `/admin/workflow-engine` | Definition / stage library |
| Workflow Orchestration Engine | EWOE | `src/lib/enterprise-workflow-orchestration-engine/` · `/workflow` | Orchestration surface |
| Rules Decision Engine | ERDE | `src/lib/enterprise-rules-decision-engine/` | Rule evaluation |
| Policy Decision Engine | EPDE | `src/lib/enterprise-policy-decision-engine/` | Sole hard-block policy authority (Chanakya principles) |
| Credit & Risk Engine | CRE | `src/lib/credit-risk-engine/` · `/admin/credit-risk-engine` | Admin-heavy; **boundary vs EPDE/ERDE NEEDS PRODUCT DECISION** |
| Document Intelligence Engine | EDIE | `src/lib/enterprise-document-intelligence-engine/` | Document intelligence ports |
| Identity & Access Engine | EIAE | `src/lib/enterprise-identity-access-engine/` | Auth/MFA placeholders |
| Roles & Permissions Engine | RPE | `src/lib/roles-permissions-engine/` · `/admin/roles-permissions` | Module permissions backbone |
| Notification & Communication Engine | ENCE | `src/lib/enterprise-notification-communication-engine/` | Outbox / templates pattern |
| Event Integration Engine | EEIE | `src/lib/enterprise-event-integration-engine/` | Pub/sub registries |
| Decision Engine | EDE | `src/lib/enterprise-decision-engine/` | Knowledge registry |
| LIFE Engine | LIFE | `src/lib/enterprise-life-engine/` | Lender strategy |
| Opportunity Lifecycle Engine | EOLE | `src/lib/enterprise-opportunity-lifecycle-engine/` | Opportunity pipeline helpers |
| Financial Operations Engine | EFOE | `src/lib/enterprise-financial-operations-engine/` | Invoice/adjustment/recovery |
| Enterprise Configuration (ECG) | ECG | `src/lib/enterprise-interface-configuration-grants/` · `/admin/ecg` | Interface configuration grants |
| Enterprise Decision Ledger | EDL | `src/lib/enterprise-decision-ledger/` | Constitutional config memory |
| System-Driven Enterprise | SDE | `src/lib/system-driven-enterprise/` | Ops monitoring feed |
| Executive Intelligence Platform | EI | `src/lib/executive-intelligence-platform/` | Mission Control visuals |
| CHANAKYA family | Guide, Radar, Live Intelligence, Briefing, Phase 5, Identity, … | `src/lib/chanakya-*` | Advisory; never hard-block |
| Additional composition engines | EC360, EPNE, EOWE, ETE, EME, … | `src/lib/enterprise-*-engine/` | Port/composition pattern; maturity varies |
| Legacy `src/lib/workflow-engine/` | — | Thin/legacy | **NEEDS PRODUCT DECISION** vs EWE |

Many engines default to **in-memory ports** pending Prisma cutover — treat production readiness as per-engine Product decision.

---

## 7. Security Architecture

| Area | Current state |
|------|----------------|
| **Authentication** | Custom JWT session (not NextAuth/Clerk). Shared `server/services/auth.service.ts` + Next `/api/auth/*` (ADR-014). Client `auth-provider`. |
| **Authorisation** | Role checks + RPE module permissions |
| **RBAC roles** | `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `ANALYST`, `VIEWER` (`src/constants/roles.ts`) |
| **Permissions** | RPE — View / Create-Edit / Admin per module; Super Admin governance |
| **Enterprise User Management** | `/admin/users` — platform access vs directory contact |
| **MFA** | Placeholders only (`enabled: false`); Mission Control notes “Future MFA — not implemented” |
| **Break Glass** | Security Operations / Enterprise Security Framework — **signals/UI only**; no activation/auth execution |
| **Identity domains** | Platform users vs ECM Contacts; Organization registration / invitation |
| **Security policies** | Admin System Modes, ECG, Mission Control Security Operations (observability posture) |
| **Certification admin (frozen)** | `admin@compass.com` / `Admin@123` / `SUPER_ADMIN` when applicable |

---

## 8. Workflow & Lifecycle Architecture

### 8.1 Opportunity lifecycle (ADR-018 / Wave 1)

`draft` → `requirement_captured` → `active` | `on_hold` → terminal `won` | `lost` | `cancelled` | `archived`

Uniqueness (Contact + Product) from Requirement Captured onward.

### 8.2 Deal lifecycle (Prisma)

`active` | `on_hold` | `won` | `lost` | `cancelled` | `archived`  
Operational health: `on_track` | `at_risk` | `delayed` | `completed`  
Lender grain: gross stage / sub-stage on Deal (Lender Pipeline).

**Gap:** No dedicated TypeScript Deal lifecycle SSOT mirroring Opportunity — **NEEDS PRODUCT DECISION**.

### 8.3 Canonical Journey Header (frozen sequence)

1. Lead Creation → `/credit-bench`  
2. Documents → `/document-center`  
3. Credit Bench → `/credit-workbench`  
4. LIFE → `/opportunities`  
5. Lender Pipeline → `/loan-files` (lenders tab)  
6. Disbursed  
7. Journey Complete  

### 8.4 Certified business journey (ADR-018 Continu)

```text
Contact → Start Loan Journey → Draft Opportunity → /loan-journey
  → Lead Information → Requirement Captured → Opportunity Workspace
  → Documents → Credit → LIFE → Move to Deal → Deal Workspace
  → Loan File (implementation/runtime per ADR-019)
```

### 8.5 Workflow engines

EWE (definitions) + EWOE (orchestration) + EPDE (policy hard-block) + SDE (ops monitoring). Chanakya advises; does not block.

---

## 9. Navigation & Routing Architecture

### 9.1 Primary navigation (Column 1 — frozen order)

Dashboard · CHANAKYA Radar · Contacts · My Opportunities · My Deals · **Loan Journey** · Investments · Tasks · Documents · Lenders · Accounting · Mission Control · Horizon · Administration · Settings

### 9.2 Canonical routes (selected)

| Capability | Canonical |
|------------|-----------|
| Hub | `/loan-journey` |
| Lead Information | `/lead-information` |
| Opportunity stages | `/credit-bench`, `/document-center`, `/credit-workbench`, `/opportunities` |
| Deal Workspace (architecture) | `/deals/:dealId` (**not implemented**) |
| Deal host (live) | `/loan-files?file=` |
| Queues | `/my-opportunities`, `/my-deals` |

### 9.3 Compatibility / temporary routes

| Route | Disposition |
|-------|-------------|
| `/loan-files` (Deal execution) | Live host; ADR-019 demotes to alias after Replace |
| `/loan-files?entry=dashboard` | Redirects to Hub |
| `/loan-information` | Legacy LoanFile create |
| `/documents` | Redirect → Document Center |
| `/pipeline` | Redirect → CHANAKYA Radar |
| `/customers` | Residual vs Contacts |

### 9.4 Three-column nav model

Column 1 primary · Column 2 Administration/Settings context · Column 3 workspace (`src/config/navigation.ts`).

---

## 10. Module Inventory

### Operational

Dashboard, Radar, Contacts, My Opportunities, My Deals, Loan Journey, Lead Information, Opportunity Workspace (stages), Document Center, Credit Workbench, LIFE, Loan Files / Lender Pipeline, Accounting, Lenders, Tasks, Dialogue, Communication, Reports / Enterprise Intelligence, AI Assistant, Horizon, Investments (placeholder), Customers (residual), Opportunity Compass, Contact Strategy, Workflow, Decisions / Experience Console.

### Mission Control

Executive Briefing, Operations Intelligence, Relationship Heat Map, Search, Security Operations, Observability, Alert Center, Situation Room.

### Administration / Organization

Administration Console, Users, Roles & Permissions, Lender Registry, Reference Masters, Product Library, Enterprise Assets, EDL, Foundation Libraries, UGJ, CHANAKYA Identity/Phase 5, Credit Knowledge Framework, Credit & Risk Engine, Architecture/Atlas, Workflow Engine, ECG, System Modes, Build Information, Organization profile/directors/docs/bank/signatures/seal.

---

## 11. Governance Inventory

### CADs

| ID | Topic |
|----|--------|
| CAD-2026-001 | Business data provenance — no invented business values (ADR-017) |

### ADRs (`docs/adr/`)

| ID | Title | Status |
|----|-------|--------|
| ADR-014 | Authentication Gateway Migration | Accepted |
| ADR-015 | Enterprise Master Data Tier Model | Accepted |
| ADR-016 | Enterprise Deal Transactional SSOT | Partially superseded by CO-ARCH-003 F0′ |
| ADR-017 | Business Data Provenance (CAD-2026-001) | Accepted |
| ADR-018 | Start Loan Journey / Hub / Lead Information | **FROZEN** |
| ADR-019 | Deal Workspace Identity (CO-ARCH-004-DWI) | **APPROVED · Architecture CERTIFIED · FROZEN · Impl not authorised** |

### Engineering governance rules (selected always-on)

Constitutional Health Check · Single Implementation Rule · Business Capability Ownership · CAD-2026-001 · Deal-centric F0′ · Navigation freeze · Chanakya operating principles · Metric single implementation · Workspace intelligence scope · Document Center governance · Start Loan Journey · Opportunity runtime FS-01 · Certification / deployment policies.

### Frozen architecture (examples)

ADR-018 flow · Canonical Journey Header sequence · Primary nav order · Document Center as sole document authoring · Progressive Contact minimums · Chanakya non-blocking · ADR-019 Deal identity (architecture).

### Constitutional policies

Implementation never precedes architectural integrity · Replace → one active implementation · Architecture Impact Report on conflict · Replacement Certification · Business Capability Ownership five pillars.

---

## 12. Technical Debt Assessment

| ID | Debt | Impact | Severity |
|----|------|--------|----------|
| TD-01 | Deal Workspace live on Loan Files vs ADR-019 `/deals/:dealId` | BAT identity confusion; dual capability language | **Critical** (arch decided; impl pending) |
| TD-02 | LoanFile localStorage + Deal Registry dual-write | Dual SoR risk; rollback complexity | **High** |
| TD-03 | My Deals open path may still target OW `/credit-bench` | Wrong grain (Deal queue → Opportunity desk) | **High** |
| TD-04 | `/credit-bench` vs `/credit-workbench` naming | Operator / BAT confusion | **Medium** |
| TD-05 | Chanakya journey labels vs Canonical Header / ADR-018 | Vocabulary inconsistency | **Medium** |
| TD-06 | FS-01 awaiting PO “FS-01 Approved” | Certification gate | **High** (governance) |
| TD-07 | FS-02 Move to Deal UX / orchestration / pipeline sync | Deal transition quality | **High** |
| TD-08 | Engine in-memory ports vs Prisma | Production readiness variance | **High** |
| TD-09 | Credit Risk vs EPDE/ERDE ownership | Policy/rules SSOT ambiguity | **Medium** |
| TD-10 | Parallel Loan create (`/loan-information`, CreateLoanModal) | Conflicts with ADR-018 Start path | **High** |
| TD-11 | MFA / Break Glass placeholders | Security posture incomplete for Go-Live | **High** (security) |
| TD-12 | `MY_OPPORTUNITIES` vs PROTECTED_ROUTES coverage | Auth middleware gap risk | **Medium** |
| TD-13 | CO-ARCH-004 programme ID collision (Lender vs Deal Identity) | Doc ambiguity | **Low** (ops naming) |
| TD-14 | Residual Priority-2 fabricated Deal seeds | CAD-2026-001 residual | **Medium** |
| TD-15 | Nested `compass/` app boundary | Build/deploy confusion risk | **Medium** |

---

## 13. Legacy & Redundancy Assessment

| Item | Classification | Reason |
|------|----------------|--------|
| `/pipeline` | **COMPATIBILITY ONLY** | Redirect to Radar; do not restore Loan Board |
| `/documents` | **COMPATIBILITY ONLY** | Redirect to Document Center |
| `/loan-information` + LoanCreateFormDialog (requirement capture) | **RETIRE** | Superseded by Lead Information (ADR-018) |
| CreateLoanModal as Start Journey | **RETIRE** | Start must create Draft Opportunity only |
| CreateLoanModal as Deal create | **MERGE** / **REPURPOSE** | Into certified Deal create under Deal Registry / ADR-019 |
| `/loan-files` as Execution Hub | **RETIRE** | Done — Hub is `/loan-journey` |
| `/loan-files` as Deal Workspace UI | **COMPATIBILITY ONLY** | Live host until ADR-019 Replace Certification |
| `/deals/:dealId` | **NEEDS PRODUCT DECISION** | Architecture approved; impl programme not authorised |
| LoanFile as business SoR | **COMPATIBILITY ONLY** → eventual **RETIRE** | Phase C after Deal Registry sole authority |
| LoanFile as Deal Workspace DTO | **COMPATIBILITY ONLY** | ADR-019: implementation artefact |
| `ensure-loan-workspace` for Opportunity business display | **RETIRE** (forbid) | CAD-2026-001 / FS-01 |
| `ensure-loan-workspace` for Deal attach | **MERGE** | Into ADR-019 / FS-02 Deal transition |
| `/customers` journey role | **MERGE** / **RETIRE** | Contacts is Party Registry |
| `/credit-bench` route name | **REPURPOSE** or **NEEDS PRODUCT DECISION** | Means Lead Creation |
| Credit Bench vs Credit Workbench synonyms | **MERGE** (glossary) | Align labels |
| My Deals → OW Lead Creation open | **NEEDS PRODUCT DECISION** | Should open Deal Workspace |
| Thin `src/lib/workflow-engine/` | **MERGE** / **RETIRE** | Prefer EWE |
| Dual Opportunity runtime formulas | **RETIRE** | Metric single-implementation rule |
| In-process engine “registries” named like business Registries | **REPURPOSE** (naming) | Distinguish catalogues from SSOT Registries |

---

## 14. Architecture Health Assessment

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Architectural consistency | **Yellow** | Opportunity identity strong; Deal identity certified but not implemented; Loan Files dual language |
| SSOT compliance | **Yellow** | Opportunity Registry clear; Deal Registry + LoanFile dual-write; CAD residuals |
| Routing consistency | **Yellow** | Hub/Lead Information clean; Deal still `/loan-files`; aliases exist |
| Business Capability Ownership | **Yellow** | Five pillars adopted; Deal pillars target-only until Replace |
| Single Implementation Rule | **Yellow** | Policy in force; Deal desk still dual-named; Loan create parallel paths |
| Constitutional Health Check | **Green (governance)** | Rule + template in force; compliance is behavioural going forward |
| Security readiness for Go-Live | **Yellow / Red** | Auth present; MFA/Break Glass not production-grade |
| Engine production maturity | **Yellow** | Uneven Prisma cutover |
| Governance maturity | **Green** | ADR/CAD/rules/certification pack strong |

**Overall baseline health:** **Yellow — Governed progress with known dual-path and Deal-identity gaps before Go-Live.**

---

## 15. Recommendations (prioritised before Go-Live)

### P0 — Constitutional / identity

1. **Do not implement ADR-019 until** separate implementation roadmap + Wave 1 are Product Owner–approved.  
2. When authorised, execute Deal Workspace Replace under Single Implementation Rule + Replacement Certification (`/deals/:dealId` sole active desk).  
3. Keep ADR-018 frozen; do not reintroduce Start → LoanFile / Credit Bench shortcuts.

### P1 — Dual-path elimination

4. Retire `/loan-information` and Start-path Create Loan from active journey.  
5. Fix My Deals open target to Deal Workspace (not Opportunity Lead Creation).  
6. Plan LoanFile localStorage Phase C retirement after Deal Registry sole authority.  
7. Align FS-02 backlog under ADR-019 programme (no forked Deal cleanup track).

### P2 — Clarity & SSOT

8. Resolve Credit Bench naming (`/credit-bench` vs `/credit-workbench`) via Product Decision.  
9. Unify journey vocabulary (Chanakya map vs Canonical Header vs ADR-018).  
10. Publish Deal lifecycle TypeScript SSOT.  
11. Clarify Credit & Risk Engine vs EPDE/ERDE ownership.  
12. Confirm `PROTECTED_ROUTES` coverage for all canonical queues (incl. My Opportunities).

### P3 — Security & engines

13. MFA production plan.  
14. Break Glass: either implement with controls or explicitly defer with risk acceptance.  
15. Per-engine Prisma cutover certification checklist.  
16. Nested `compass/` app boundary decision.

### P4 — Hygiene

17. Prefer ADR-019 / CO-ARCH-004-DWI naming vs Lender CO-ARCH-004 collision.  
18. Maintain this Baseline as living SSOT for Architecture Reviews (version on each major ADR freeze).

---

## 16. Document control

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-07-25 | Initial Enterprise Architecture Baseline Audit for Product Architecture Review |

---

## Appendix A — Review checklist

- [ ] Product Architecture accepts this document as official baseline  
- [ ] Corrections / additions recorded  
- [ ] Baseline version promoted to **ACCEPTED**  
- [ ] Implementation programmes must cite baseline version in Architecture Impact / Wave plans  

## Appendix B — Explicit audit attestation

This report was produced as an **Architecture Audit only**. No production code, routes, UI, database schema, or files were modified or removed in producing this baseline.

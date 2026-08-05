# Catalyst One — Enterprise Project Status

**Document ID:** CO-DOCS-001  
**Document type:** Enterprise Project Status (consolidated)  
**Last updated:** 2026-07-29  
**Branch context:** `compass-hl03-conversation-first`  
**Authority:** Enterprise Documentation Office (PMO)  
**Change control:** Documentation only — no code, migrate, deploy, or live-data changes in this update

---

## 1. Overall Platform Status

| Dimension | Status |
|-----------|--------|
| **Overall** | **Partial production readiness** — core Opportunity / Deal / Lender / Document / WP registries live on applied migrations; several recent capability waves are **implemented in code** but **await migration approval, BAT, and/or deploy** |
| **Production DB migrations** | **29 applied** · **2 pending** (Document Package 003 + 005) — per CO-MIG-001 status check |
| **Official Go-Live** | **Not declared** — pre–Go-Live single-implementation policy still active |
| **Authentication (cert)** | Frozen: `admin@compass.com` / `Admin@123` / `SUPER_ADMIN` — **unchanged** |
| **Primary production URL** | https://catalyst-one-two.vercel.app (ops reports may lag local certified trees) |

### Current Health Summary

| Area | Health |
|------|--------|
| Opportunity Runtime (FS-01) | Implementation complete · **PO “FS-01 Approved” still required** for FOUNDATION CERTIFIED |
| Deal / Lender Pipeline | Operational · Kanban vocabulary unification implemented (CO-INC-001A) · BAT outstanding |
| Document Registry (CO-DOC-002) | Applied · durable sink in use |
| Document Packages | Code complete (CO-DOC-005) · **migration pending** · local/reconstruct fallback until migrate |
| Wealth Partner Registry | Applied (CO-WP-001) · consistency UX issue under investigation (CO-WP-006) |
| Product / Lender / Programs | Masters live · baseline program seed implemented (CO-PROG-004) · BAT/deploy pending |
| Mission Control / Search | Intelligence + package search hooks implemented · BAT pending for latest waves |
| Governance / Reset / Metrics | CO-ADMIN-004/005, CO-PERF-001 implemented · certification as per individual reports |

---

## 2. Status buckets (quick view)

### Completed (implementation accepted in repo / migrations applied where required)

- Opportunity Workspace foundations (ADR-018 waves applied on DB; ongoing enrichment)
- Loan / Deal Workspace + Enterprise Deal Registry
- Lender Registry + Lender Program Portal foundations
- Lender Pipeline (with CO-INC-001A vocabulary unification in code)
- Enterprise Document Registry (CO-DOC-002 migration applied)
- Wealth Partner Registry schema (CO-WP-001 applied)
- Product Library / Product–Lender Master (CO-ADMIN-005/006)
- Production Reset ledger (CO-ADMIN-004)
- Enterprise Metrics Engine Phase 1 (CO-PERF-001)
- RM Workspace projection (CO-BIZ-005)
- Mission Control Enterprise Intelligence (CO-MC-002 — ready for BAT)
- CO-MIG-001 migration consolidation assessment
- CO-DOC-004 / CO-WP-006 / CO-BUILD-001 investigations (docs only)
- CO-DWS-001 Deal Workspace validation stabilization (Invoice Party no longer blocks Lender Pipeline; readiness + Action Center warnings; **no migrate / no deploy**)
- CO-ID-001 Enterprise Identity Model freeze (Contact SSOT; WP onboard-from-Contact; Contact Roles section; **no migrate / no deploy**)

### In Progress

- Enterprise Document Package Registry operational cutover (code done; migrate + BAT open)
- Default Commercial Program seeding adoption (CO-PROG-004 code done; admin seed + BAT open)
- FS-01 Product Owner certification
- Wealth Partner onboarding / commercial path follow-through (partial; see WP modules)
- Pre–Go-Live certification backlog (FS-02 not started)
- CO-DWS-001 BAT (code complete; verify `npm run verify:co-dws-001`)
- CO-ID-001 / CO-WP-006 BAT (code complete; verifies `npm run verify:co-id-001` · `npm run verify:co-wp-006`)

### Pending Approval

- Execute Document Package migrations (DOC-003 + DOC-005) — CO-MIG-001 Wave 1
- Deploy approval for Document Package + Program Seed BAT environments (change-control holds)
- CO-WP-006 recommended UX/fix implementation (RCA complete; code not approved)
- Any Vercel production promote of recent local trees

### Pending Migration

| Migration | Module | Risk |
|-----------|--------|------|
| `20260729140000_co_doc_003_document_package_upload` | Document Package Upload | Low |
| `20260729160000_co_doc_005_document_package_registry` | Document Package Registry | Low–Med |

See: `docs/co-mig-001/CO-MIG-001-ENTERPRISE-MIGRATION-CONSOLIDATION-REPORT.md`

### Pending BAT

- Document Package Registry (post-migrate): folder upload, refresh, logout/login, preview-by-record, download
- CO-PROG-004: Seed Default Programs → wizard supported products non-empty; re-seed idempotency
- CO-INC-001A / 001B: Kanban drag across LenderCaseStage chain
- CO-MC-002 Mission Control intelligence surfaces
- CO-MDM-001 / CO-DOM-001 / CO-ADMIN masters as listed in readiness reports
- FS-01 Opportunity Runtime re-BAT after blockers cleared
- CO-DWS-001: Open Deal without Invoice Party; move pipeline stages; readiness + Action Center warning only; accounting gate reserved

### Known Issues

| ID | Issue | Severity | Notes |
|----|-------|----------|-------|
| CO-DOC-004 / cutover | Packages not durable until DOC-005 migrate | High (doc UX) | Mitigated in code via v2 cache + reconstruct; full cross-device needs migrate |
| CO-WP-006 | “Already converted” but partner not visible in Registry | Medium | **Fixed in code (CO-WP-006)** — guided Open Existing + list error toast; BAT/deploy pending |
| Dual timestamp migrations | `20260728120000` used twice (WP + opportunity source) | Low (process) | Both applied; enforce unique timestamps |
| Untracked pending SQL | DOC-003/005 folders may be untracked | Medium (ops) | Commit before prod `migrate deploy` |
| FS-01 | Not FOUNDATION CERTIFIED / FROZEN | High (governance) | Awaiting PO **“FS-01 Approved”** |
| package.json npm toast | VS Code “failed to parse package.json” | Low | CO-BUILD-001: on-disk JSON valid; likely stale detection |

---

## 3. Module status (detail)

### 3.1 Opportunity Workspace

| Field | Content |
|-------|---------|
| **Objective** | Opportunity Registry as SSOT; ADR-018 journey; CAD-2026-001 provenance |
| **Current Status** | **Operational / Implementation Complete** (FS-01 certification pending) |
| **Date Implemented** | Ongoing · ADR-018 waves Jul 2026 · CO-OPP-002/003 Jul 28 |
| **Summary** | Draft → Requirement Captured → Active; Lead Information capture; OW stages; business source / commercial fields |
| **Impacted** | Opportunity APIs/services · OW UI · lifecycle constants · uniqueness indexes (applied) |
| **Verification** | Static/verify scripts per wave; production probes historically mixed |
| **BAT Status** | **Outstanding** for latest OPP waves; FS-01 PO approval open |
| **Pending Actions** | FS-01 PO certification; FS-02 backlog after freeze |
| **Production Readiness** | **Conditional** — do not mark FS-01 frozen without PO |

### 3.2 Loan Workspace

| Field | Content |
|-------|---------|
| **Objective** | Deal execution desk over Enterprise Deal Registry; journey chrome |
| **Current Status** | **Operational** |
| **Date Implemented** | CO-ARCH-002 / ADR-019 programme · ongoing |
| **Summary** | Deal SSOT; workspace layout standards; **CO-DWS-001** Invoice Party no longer blocks Lender Pipeline (readiness + Action Center warnings; accounting-only hard gate) |
| **Impacted** | Deal services · workspace hosts · pipeline projection · validation SSOT |
| **Verification** | `npm run verify:co-dws-001` · Deal registry verify scripts (historical) |
| **BAT Status** | Ongoing / scenario-based · **CO-DWS-001 BAT open** |
| **Pending Actions** | CO-DWS-001 BAT checklist; align with FS-02 Deal Runtime Separation when opened |
| **Production Readiness** | **Conditional Go-Live** with deal cutover gates |

### 3.3 Lender Workspace / Lender Registry

| Field | Content |
|-------|---------|
| **Objective** | Enterprise Lender master + ELW comparison surfaces |
| **Current Status** | **Operational** |
| **Date Implemented** | CO-ARCH-001 I4c · CO-ARCH-004 · Go-Live P0 extension (Jul 21–22) |
| **Summary** | Lender identity SSOT; supported products capability; admin registry |
| **Impacted** | `enterprise_lenders` · lender-registry APIs · admin UI · ELW |
| **Verification** | Tier-2 seed / admin verifies |
| **BAT Status** | Masters largely BAT-capable; program seeding BAT open (CO-PROG-004) |
| **Pending Actions** | Run Seed Default Programs in BAT env when approved |
| **Production Readiness** | **Ready for continued BAT** |

### 3.4 Lender Pipeline

| Field | Content |
|-------|---------|
| **Objective** | Per-lender negotiation stages inside Deal workspace (Kanban) |
| **Current Status** | **Operational** + vocabulary fix landed |
| **Date Implemented** | Core earlier · **CO-INC-001A 2026-07-29** |
| **Summary** | Canonical `LenderCaseStage`; stop snap-back from PipelineStage write map |
| **Impacted** | `deal-lender-stage-map` · `deal-stage-rules` · `lender-pipeline` · projections |
| **Verification** | `verify:co-inc-001a` (static) |
| **BAT Status** | **Pending BAT** (DnD across full stage chain) |
| **Pending Actions** | BAT on certification deploy; legacy gross_stage normalize-on-write |
| **Production Readiness** | **Ready for BAT deploy** (no migrate) |

### 3.5 Kanban Stage Vocabulary Unification (CO-INC-001 / 001A)

| Field | Content |
|-------|---------|
| **Objective** | One stage vocabulary end-to-end for Kanban persist/reload |
| **Current Status** | **Implementation Complete** |
| **Date Implemented** | 2026-07-29 |
| **Summary** | RCA (001) + unification (001A); identity persist of LenderCaseStage |
| **Impacted** | Docs `docs/co-inc-001/` · stage map / rules / pipeline helpers |
| **Verification** | Static verify PASS |
| **BAT Status** | **Pending** |
| **Pending Actions** | Deploy for BAT when approved |
| **Production Readiness** | **Code ready · BAT pending** |

### 3.6 Wealth Partner Registry (CO-WP-001)

| Field | Content |
|-------|---------|
| **Objective** | First-class Wealth Partner enterprise registry |
| **Current Status** | **Migration applied · Operational** |
| **Date Implemented** | 2026-07-28 (migration `20260728120000_co_wp_001_…`) |
| **Summary** | WPT codes; contact/company identity; lifecycle/operational status |
| **Impacted** | Prisma WP models · WP APIs · registry UI |
| **Verification** | Migration applied on checked DB |
| **BAT Status** | Partial / ongoing |
| **Pending Actions** | Resolve CO-WP-006 UX after approval |
| **Production Readiness** | **Conditional** pending consistency fix + BAT |

### 3.7 Wealth Partner Onboarding (CO-WP-005)

| Field | Content |
|-------|---------|
| **Objective** | Draft + secure link / invite / self-reg path |
| **Current Status** | **Partially implemented / held** (historically stashed around DOC-003 BAT isolation) |
| **Date Implemented** | 2026-07-29 (partial) |
| **Summary** | Onboarding architecture extensions; migration may be prepared separately — confirm before execute |
| **Impacted** | WP registry services · onboarding UI (where present) |
| **Verification** | Confirm against current working tree / stash before BAT |
| **BAT Status** | **Not ready** until restored/certified |
| **Pending Actions** | Restore/certify onboarding wave; no migrate without approval |
| **Production Readiness** | **Not ready** |

### 3.8 Commercial Profile / Network (CO-WP-002/003)

| Field | Content |
|-------|---------|
| **Objective** | WP commercial profile + network intelligence |
| **Current Status** | **CO-WP-003 readiness reported** · CO-WP-002 creation failure historically addressed |
| **Date Implemented** | Jul 2026 (see WP docs) |
| **Summary** | Network members; intelligence readiness; creation failure RCA/fix path |
| **Impacted** | WP network models/UI · commercial fields |
| **Verification** | Per WP readiness docs |
| **BAT Status** | **Outstanding** for full WP suite |
| **Pending Actions** | Combined WP BAT after CO-WP-006 fix |
| **Production Readiness** | **Conditional** |

### 3.9 Wealth Partner Registry Consistency (CO-WP-006)

| Field | Content |
|-------|---------|
| **Objective** | RCA for “already converted” vs Registry list mismatch |
| **Current Status** | **Investigation Complete** · fix **not implemented** |
| **Date Implemented** | 2026-07-29 (docs only) |
| **Summary** | Same Prisma SSOT; duplicate check ignores lifecycle/status filters that can hide partners; dead-end duplicate message |
| **Impacted** | Docs `docs/co-wp-006/` |
| **Verification** | N/A (investigation) |
| **BAT Status** | N/A until fix |
| **Pending Actions** | Approve UX: show WP code, status, lifecycle, Open WP button |
| **Production Readiness** | **Blocked on fix approval** for WP conversion UX |

### 3.10 Enterprise Document Registry (CO-DOC-002)

| Field | Content |
|-------|---------|
| **Objective** | Durable transaction documents (Postgres + blob path) |
| **Current Status** | **Applied · Operational** |
| **Date Implemented** | 2026-07-27 (`co_doc_002_durable_transaction_documents`) |
| **Summary** | Upload Files sink; hydrate/sync; soft-fail when persistence unavailable |
| **Impacted** | `enterprise_transaction_documents` · document-registry lib/API |
| **Verification** | `doc:persistence:verify` / readiness docs |
| **BAT Status** | Largely exercised; keep regression in package BAT |
| **Pending Actions** | Preserve Upload Files unchanged through package cutover |
| **Production Readiness** | **Ready** (with ongoing BAT hygiene) |

### 3.11 Folder Upload (CO-DOC-003)

| Field | Content |
|-------|---------|
| **Objective** | Folder → Document Package grouping over Document Registry |
| **Current Status** | **Code complete** · migration **pending** |
| **Date Implemented** | 2026-07-29 (code) |
| **Summary** | Upload Folder UI; package panel; progress; child `packageId` stamps |
| **Impacted** | Document Center · document-package lib · pending migration 003 |
| **Verification** | `verify:co-doc-003` / readiness |
| **BAT Status** | Partial (pre-durable) · full BAT after migrate |
| **Pending Actions** | Approve/apply DOC-003+005; BAT refresh/login |
| **Production Readiness** | **Not until migrate + BAT** |

### 3.12 Enterprise Document Package Registry (CO-DOC-005)

| Field | Content |
|-------|---------|
| **Objective** | Packages as first-class durable enterprise entities |
| **Current Status** | **Implementation Complete (code)** · **Migration PENDING APPROVAL** · **No deploy** |
| **Date Implemented** | 2026-07-29 |
| **Summary** | Package registry API; hydrate/reconstruct; preview-by-record; timeline; search hooks; Prisma models prepared |
| **Impacted** | `src/lib/document-package/**` · package API · workspace UI · migration 005 |
| **Verification** | `verify:co-doc-005` PASS · TSC PASS |
| **BAT Status** | **Pending** (after migrate + deploy approval) |
| **Pending Actions** | CO-MIG-001 Wave 1 approve → migrate → Wave 2 deploy/BAT |
| **Production Readiness** | **Not ready** until Wave 1+2 |

### 3.13 Preview Engine

| Field | Content |
|-------|---------|
| **Objective** | Preview via Document Registry record → blob (not checklist typeRef) |
| **Current Status** | **Implemented in CO-DOC-005 code path** |
| **Date Implemented** | 2026-07-29 |
| **Summary** | `DocumentRegistryRecordPreviewDialog` · `previewDocumentRegistryRecord` |
| **Impacted** | Document Center package preview · document-package ops |
| **Verification** | Covered by CO-DOC-005 verify |
| **BAT Status** | **Pending** with package BAT |
| **Pending Actions** | Confirm preview for PDF/image/office in BAT |
| **Production Readiness** | Tied to Document Package cutover |

### 3.14 Mission Control

| Field | Content |
|-------|---------|
| **Objective** | Enterprise intelligence / ops surfaces |
| **Current Status** | **CO-MC-002 Implementation Complete · Ready for BAT** |
| **Date Implemented** | Jul 2026 (see MC readiness) |
| **Summary** | Enterprise intelligence architecture; search center consumes framework |
| **Impacted** | `src/mission-control/**` |
| **Verification** | `verify:co-mc-002` |
| **BAT Status** | **Pending** |
| **Pending Actions** | BAT; ensure package search hits post-DOC-005 |
| **Production Readiness** | **Conditional** |

### 3.15 Enterprise Search

| Field | Content |
|-------|---------|
| **Objective** | Locate entities including Document Packages |
| **Current Status** | **Enhanced (CO-DOC-005)** — Command Palette + MC Search package hits |
| **Date Implemented** | 2026-07-29 (package search wiring) |
| **Summary** | Package name / file / opportunity / uploader; API `?q=` post-migrate |
| **Impacted** | `command-palette.tsx` · MC `search/providers.ts` · package server-sync |
| **Verification** | CO-DOC-005 verify includes search wiring |
| **BAT Status** | **Pending** |
| **Pending Actions** | BAT search after package migrate |
| **Production Readiness** | **Conditional** |

### 3.16 Product Library

| Field | Content |
|-------|---------|
| **Objective** | Enterprise Product Master SSOT |
| **Current Status** | **Operational** (CO-ADMIN-005/006) |
| **Date Implemented** | Jul 2026 |
| **Summary** | Canonical catalog; admin CRUD; GOLD_LOAN added with CO-PROG-004 |
| **Impacted** | Product registry · canonical catalog · admin master UI |
| **Verification** | admin product verifies |
| **BAT Status** | Ongoing |
| **Pending Actions** | Ensure GOLD_LOAN seeded in product registry on BAT env |
| **Production Readiness** | **Ready for continued use** |

### 3.17 Commercial Program Library (CO-PROG-004)

| Field | Content |
|-------|---------|
| **Objective** | One-time baseline supported products + commercial program stubs |
| **Current Status** | **Implementation Complete (code)** · **No migrate required** · **No deploy** (per change control) |
| **Date Implemented** | 2026-07-29 |
| **Summary** | Create-missing seed; canonical product codes; admin **Seed Default Programs**; no website auto-sync; no overwrite of admin edits |
| **Impacted** | Baseline seed catalog · seed service/API · lender registry admin · program create persistence fields |
| **Verification** | `verify:co-prog-004` PASS · TSC PASS |
| **BAT Status** | **Pending** |
| **Pending Actions** | Approve BAT deploy; run Seed Default Programs; wizard non-empty products |
| **Production Readiness** | **Code ready · BAT pending** |

### 3.18 Enterprise Health / Metrics / Reset

| Field | Content |
|-------|---------|
| **Objective** | Metrics engine, production reset governance, ops health |
| **Current Status** | **Implemented** (EME Phase 1, Production Reset disabled-by-default) |
| **Date Implemented** | Jul 22–27 window (ADMIN-004, PERF-001, OPS reports) |
| **Summary** | Snapshot metrics; reset ledger; ops deployment status reporting |
| **Impacted** | Admin metrics/reset UIs · APIs · migrations applied |
| **Verification** | Respective verify scripts |
| **BAT Status** | Partial |
| **Pending Actions** | Keep reset disabled until explicit ops approval |
| **Production Readiness** | **Conditional** (reset must stay gated) |

### 3.19 Security Investigations

| Field | Content |
|-------|---------|
| **Objective** | Track security/integrity investigations (non-code where required) |
| **Current Status** | Soft-delete foundations applied; no open P0 security migrate in pending pair |
| **Date Implemented** | Soft-delete Jul 21; ongoing governance |
| **Summary** | CO-SPRINT-119 soft delete; auth frozen for certification |
| **Impacted** | Soft-delete adapters · auth policy docs |
| **Verification** | Governance readiness docs |
| **BAT Status** | N/A continuous |
| **Pending Actions** | No pending security migration in CO-MIG-001 pending set |
| **Production Readiness** | **Maintain freeze on cert credentials** |

### 3.20 Pending Migrations (CO-MIG-001)

| Field | Content |
|-------|---------|
| **Objective** | Consolidate and govern unapplied Prisma migrations |
| **Current Status** | **Assessment Complete** · **Nothing executed** |
| **Date Implemented** | 2026-07-29 (assessment) |
| **Summary** | Only DOC-003 + DOC-005 pending; Wave 1 DDL recommended |
| **Impacted** | Docs `docs/co-mig-001/` · canvas |
| **Verification** | `prisma migrate status` (read-only) |
| **BAT Status** | N/A |
| **Pending Actions** | Approval meeting → Wave 1 deploy of migrations |
| **Production Readiness** | N/A (governance artifact) |

### 3.21 Outstanding BAT Items (rollup)

| BAT item | Blocked by |
|----------|------------|
| Document Package full durability | Migrate DOC-003+005 + deploy |
| Preview-by-registry for packages | Same |
| CO-PROG-004 program seed adoption | Deploy/BAT approval |
| Kanban DnD (INC-001A) | Deploy/BAT approval |
| Mission Control CO-MC-002 | BAT schedule |
| FS-01 Opportunity Runtime | PO certification after re-BAT |
| Wealth Partner conversion UX | CO-WP-006 fix approval + BAT |
| WP Onboarding | Restore/certify CO-WP-005 |

---

## 4. Open Risks

1. **Document Package migrate delay** — users rely on browser cache/reconstruct; cross-device persistence incomplete.  
2. **FS-01 uncertified** — governance risk if treated as frozen.  
3. **WP-006 conversion UX** — operators blocked without Open Partner path.  
4. **Untracked migrations** — ops risk if `migrate deploy` run without git-committed SQL.  
5. **Dirty working tree / multi-wave local code** — production alias may not match latest local certified sets (see historical CO-OPS-002).  
6. **Duplicate migration timestamps (process)** — future collision risk if repeated.

---

## 5. Recommended Next Priorities

1. **Migration approval meeting** — approve CO-MIG-001 Wave 1 (DOC-003 → DOC-005); commit SQL; `migrate deploy` via `DIRECT_URL`.  
2. **Document Package BAT** — Upload Files regression + Folder Upload durability + Preview.  
3. **Approve & implement CO-WP-006 UX fix** — never dead-end on duplicate convert.  
4. **CO-PROG-004 BAT** — Seed Default Programs; wizard products; idempotent re-seed.  
5. **Kanban BAT** — CO-INC-001A stage chain.  
6. **FS-01 Product Owner certification** — then open FS-02 only after freeze.  
7. **WP Onboarding** — restore/certify CO-WP-005 when DOC cutover stable.

---

## 6. Related documents

| Topic | Path |
|-------|------|
| Migration consolidation | `docs/co-mig-001/CO-MIG-001-ENTERPRISE-MIGRATION-CONSOLIDATION-REPORT.md` |
| Document Package Registry | `docs/co-doc-005/CO-DOC-005-DOCUMENT-PACKAGE-REGISTRY-READINESS-REPORT.md` |
| Document Package RCA | `docs/co-doc-004/CO-DOC-004-DOCUMENT-ENGINE-STABILIZATION-RCA.md` |
| Program seeding | `docs/co-prog-004/CO-PROG-004-DEFAULT-LENDER-PROGRAM-SEEDING-READINESS-REPORT.md` |
| Kanban vocabulary | `docs/co-inc-001/CO-INC-001A-STAGE-VOCABULARY-UNIFICATION.md` |
| WP consistency RCA | `docs/co-wp-006/CO-WP-006-WEALTH-PARTNER-REGISTRY-CONSISTENCY-RCA.md` |
| Program backlog (PMO) | `docs/pmo/registers/program-backlog-register.md` |
| Latest deployment status (ops) | `docs/ops/CO-OPS-002-LATEST-DEPLOYMENT-STATUS.md` |

---

## 7. Change-control attestation (this document update)

| Action | Performed? |
|--------|------------|
| Application code modified | **No** |
| Migrations executed | **No** |
| Deploy | **No** |
| Live data modified | **No** |
| Production configuration altered | **No** |
| Documentation updated | **Yes** — this Enterprise Project Status created as CO-DOCS-001 SSOT |

---

*End of Enterprise Project Status · CO-DOCS-001 · 2026-07-29*

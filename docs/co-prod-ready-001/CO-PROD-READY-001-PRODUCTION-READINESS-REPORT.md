# Catalyst One — Production Readiness Report

**Code:** CO-PROD-READY-001  
**Nature:** DIAGNOSIS ONLY — no code changes · no fixes · no deploy  
**Date:** 2026-08-07  
**Scope:** Remaining stubs, placeholders, mocks, hardcoded invent values, demo surfaces, unfinished integrations, and technical debt across Catalyst One  

---

## Executive summary

Catalyst One is **not production-ready** as a full Enterprise Operating System without closing Critical and High items below. Many engines and desks still run on **in-memory ports**, **placeholder providers**, or **mock books**. Several certification gates (CO-QA-*) remain **OPEN**.

| Priority | Count (approx.) | Meaning |
|----------|----------------:|---------|
| **Critical** | 10 | Blocks honest go-live / invents or loses business truth |
| **High** | 28 | Major desks unfinished, dual-path risk, or CAD invent |
| **Medium** | 24 | Gated demos, incomplete modules, ops tooling |
| **Low** | 14 | Prototype/docs/UI chrome debt |

**Do not treat `npm run verify:*` Pass as Business Certification** (CO-QA-001).

---

## Critical

| # | Item | Type | Paths / evidence |
|---|------|------|------------------|
| C1 | **Platform engines default to in-memory ports** (ETE, EDL, EDC, EWE, EAI, LIFE, EEI, ENCE, EDIE, ECG, EDE, EME metadata, etc.) | Unfinished integration / debt | `src/lib/*/composition.ts` → `createInMemory*Ports()`; Prisma adapters optional via `configure*Ports` |
| C2 | **Partner Gateway opportunity store = in-memory `Map`** (not Opportunity Registry SSOT) | Stub / unfinished | `server/services/partner-gateway/partner-business.service.ts`; partner API routes tagged placeholder |
| C3 | **Accounting Workspace is a static mock ledger** (fake ₹ revenue / invoices; no GST/payment backend) | Mock | `src/lib/accounting-workspace/mock-data.ts`; accounting UI “mock only” |
| C4 | **Soft-delete Recovery Center stubs** for Opportunities, Loan Files, Documents, Tasks, Notes, Workflow | Stub | `server/services/soft-delete/adapters/stub.adapters.ts` — throws / empty lists |
| C5 | **CO-QA modules remain OPEN** (Kanban delete, Lender search, schema drift, Move-to-Deal timeouts) | Certification debt | `docs/co-qa-002` … `co-qa-005`; `.cursor/rules/co-qa-*.mdc` |
| C6 | **Document Registry demo-purge data-loss class** (browser registry wiped under prisma/Vercel) | Soft Go-Live / SSOT risk | `docs/co-doc-002/*`; `docs/co-qa-001` |
| C7 | **No universal Enterprise Activity SSOT** — ECIE conversation Map ≠ Deal Timeline ≠ EDC in-memory ≠ Radar projection | Fragmented SSOT | `docs/co-investigation-001/`; `activity-registry.ts`; EDC `repositories/in-memory.ts` |
| C8 | **Prisma Deal `healthScore` reserved but unused** — Radar computes separately; columns stay null | Schema / incomplete cutover | `prisma/schema.prisma` ARB A3 comment; Radar derive engines |
| C9 | **Opportunity Workspace / LIFE / Tasks wired to in-memory placeholder provider** | Placeholder | `workspace-placeholder-provider.ts` + OW panels |
| C10 | **Customer 360 operational sections invent figures** (`Math.random` income, placeholder PDFs) | Placeholder / mock | `customer-360-placeholder-provider.ts` |

---

## High

| # | Item | Type | Paths / evidence |
|---|------|------|------------------|
| H1 | Analyze Deal = mock recommendations with fake confidence | Mock | `analyze-deal/mock-recommendations.ts`; analyze-deal workspace |
| H2 | FS-01 LoanFile-shaped Opportunity/Deal projections still core; PO “FS-01 Approved” not granted | Debt | `opportunity-runtime-adapter.ts`; `map-deal-to-loan-file.ts`; FS-01 rules |
| H3 | LoanFile ↔ Deal dual-write / Soft Go-Live rollback / `local_fallback` still in tree; Phase C incomplete | Dual-path debt | `dual-write.ts`; `deal-data-access.ts`; `loan-files-storage.ts`; CO-ARCH-006 Category B |
| H4 | ADR-019 Deal Workspace identity frozen; live still `/loan-files` dual language; `/deals/:dealId` programme unfinished | Unfinished programme | ADR-019; architecture baseline TD-01 |
| H5 | Document Packages — local cache / reconstruct until migrate (API soft-fail 503) | Unfinished | `document-package/store.ts`; `docs/co-doc-005` |
| H6 | CAD invent defaults — Loan Create / ensure-loan-workspace invent secured·fresh·medium·city·email·RM | Hardcoded | `loan-create-form-dialog.tsx`; `ensure-loan-workspace.ts` |
| H7 | EAI Context Intelligence stubs (empty facts, `implemented: false`) | Stub | `enterprise-ai-platform/context-intelligence/providers.ts` |
| H8 | Voice STT/TTS/VAD stub providers | Stub | `enterprise-ai-platform/voice/stub-providers.ts` |
| H9 | EAO Shadow Mode default OFF + stub provider; Hybrid Cutover **not authorised** | Unfinished AI | `shadow-mode.ts`; `shadow/stub-provider.ts`; ADR-022; G2 docs |
| H10 | Relationship Heat Map — algorithm not implemented; demo tiles | Placeholder / demo | `relationship-heat-map/score-framework.ts` |
| H11 | Mission Control Alert Center — mock alerts; delivery channels “not implemented” | Placeholder / mock | `mission-control/alert-center/`; alert-framework `channels.ts` |
| H12 | Mission Control MFA / audit / telemetry / emergency TODOs (SPR-007.2) | Unfinished | `mission-control/security/gateway.ts`; telemetry; emergency |
| H13 | Legal Terms page is explicit placeholder (must replace before public launch) | Placeholder | `src/routes/terms.tsx` |
| H14 | ECW document preview uses Mozilla sample PDF | Demo / placeholder | `enterprise-credit-workspace/map-documents.ts` |
| H15 | Partner seed reconstruction across serverless isolates | Debt / demo | `partner-business.service.ts`; `docs/co-wp-bat/*` |
| H16 | Wealth Partner EEE / Tier / Entitlements — DO NOT IMPLEMENT / BAT freeze | Programme blocked | `.cursor/rules/co-wp-*`; WP architecture docs |
| H17 | Lender Hierarchy Soft Go-Live localStorage vs ECM Employees disconnect | Dual SSOT | `docs/co-lender-hierarchy-ssot/*` |
| H18 | EME vs My Deals local healthScore formula dual implementation residual | Metric debt | `docs/co-perf-001/`; metric single-implementation rule |
| H19 | Dashboard Activity Timeline / executive KPI catalog = demo-gated static data | Demo | `src/data/catalyst-one/dashboard.ts` |
| H20 | CO-RADAR-003 timeline fix implemented but **deploy gated** / live BAT not certified | Debt (remediated pending cert) | `docs/co-radar-003/`; `enterprise-deal-activity-timeline.ts` |
| H21 | Parallel Loan create / Start path vs ADR-018 Lead Information | Dual journey | Architecture baseline TD-10; Loan Information / CreateLoanModal |
| H22 | Chanakya intelligence mock service when demo seeds on | Mock | `modules/intelligence/services/{chanakya.service,mock-data}.ts` |
| H23 | Alert / Search / Security / Observability Mission Control placeholder registries | Placeholder | `mission-control/shared/enterprise-*-framework/` |
| H24 | Document Registry / Requests client local-first stores + random IDs | Debt | `document-registry/store.ts`; `document-requests/store.ts` |
| H25 | ENCE external delivery flag hard `false` | Unfinished | `ENCE_EXTERNAL_DELIVERY_ENABLED = false` |
| H26 | Action Center non-email channels “Coming soon” | Unfinished | `enterprise-action-center/actions.ts` |
| H27 | Deal Health API placeholder / write not implemented | Stub | `api/enterprise-deals/[dealId]/health/route.ts` |
| H28 | Widespread silent `priority: "medium"` create defaults | Hardcoded | Multiple create/seed paths |

---

## Medium

| # | Item | Type | Paths / evidence |
|---|------|------|------------------|
| M1 | Central demo-seed system retained (footgun if baked true on pilot) | Demo | `src/lib/demo-seed/*`; many consumers |
| M2 | Soft Go-Live lender local store / baseline seeds retained | Debt | `enterprise-lender-registry/local-store.ts` |
| M3 | Production Reset wizard (DEMO-/TEST- heuristics) — powerful, flag default OFF | Ops debt | `production-reset/*`; `PRODUCTION_RESET_ENABLED` |
| M4 | Credit Risk Engine admin pages = section placeholders | Placeholder | `admin/credit-risk-engine/*/page.tsx`; `credit-risk-section-placeholder.tsx` |
| M5 | Policy simulator / rule graph visualization placeholders | Placeholder | `policy-simulator-placeholder.tsx`; `rule-composition-panel.tsx` |
| M6 | Investments nav page “Coming soon” | Unfinished | `app/(dashboard)/investments/page.tsx` |
| M7 | Task detail attachments “demo — no upload” | Stub | `tasks/task-detail-drawer.tsx` |
| M8 | Notifications panel hard-coded mock when seeds on | Mock | `layout/notifications-panel.tsx` |
| M9 | Organization company profile “saved locally (demo mode)” | Demo | `organization/company-profile-form.tsx` |
| M10 | Horizon strategic planning mock providers | Mock | `horizon/providers.ts`; `PlaceholderActionDialog.tsx` |
| M11 | Operational movement demo panel on Radar | Demo | `operational-movement-demo-panel.tsx` |
| M12 | Dialogue Center defaults `opp-demo-001` | Demo / hardcoded | `dialogue-center-workspace.tsx` |
| M13 | Enterprise Lender Workspace hierarchy copy placeholders | Placeholder | `constants/enterprise-lender-workspace/hierarchy.ts` |
| M14 | Radar Opportunity Health Score “coming soon” | Unfinished | `chanakya-radar-kanban.tsx` |
| M15 | Tier-2 / Reference Master port runtime default OFF | Flag debt | `.env.example`; `docs/co-lr-011` |
| M16 | ECG config registry `placeholder: true` payloads | Unfinished | `enterprise-interface-configuration-grants/` |
| M17 | EIAE MFA placeholders | Placeholder | `enterprise-identity-access-engine/defaults.ts` |
| M18 | Conversation intelligence channels Wave 1 partial (Coming soon) | Unfinished | `constants/enterprise-conversation-intelligence/` |
| M19 | Credit Bench vs Credit Workbench naming / journey vocabulary drift | Dual naming | Architecture baseline TD-04/05 |
| M20 | MFA / Break Glass not production-grade (documented) | Security debt | Architecture baseline TD-11 |
| M21 | Soft-deleted contact mobile uniqueness blocks reuse | Debt | CO-STAB-002 TD-3 |
| M22 | Deal document links lack FK to Document Registry definitions | Debt | CO-STAB-002 TD-4 |
| M23 | Large `verify:*` matrix = unfinished engineering-gate inventory | Gates | `package.json` |
| M24 | AI sprints CO-AI-101…117 awaiting PO Freeze / certification | Certification | `docs/co-ai-*` |

---

## Low

| # | Item | Type | Paths / evidence |
|---|------|------|------------------|
| L1 | `ModulePlaceholder` component retained | Placeholder | `module-placeholder.tsx` |
| L2 | Enterprise 360 Framework Demo surface | Demo | `enterprise-360-framework-demo.tsx` |
| L3 | Atlas / Architecture / Product Library / Workflow “not implemented” cards | Placeholder | Atlas & architecture dashboards |
| L4 | Decision Engine foundation placeholder result shapes | Placeholder | `decision-engine-foundation.ts` |
| L5 | RIC contact strategy mock dataset (DEV historical) | Mock | `contact-strategy/ric-mock-data.ts` |
| L6 | EAO G2 fixtures / Shadow Mode Dashboard fixtures (PO-only) | BAT tooling | `enterprise-ai-orchestrator/**/fixtures.ts` |
| L7 | Nested `compass/` prototype demos & placeholder pages | Demo | `compass/src/components/prototype/*` |
| L8 | COMPASS conversation ₹XX,XXX marketing placeholders | Placeholder | `compass/src/config/*-conversation.ts` |
| L9 | Chanakya performance badge / origination placeholders | Placeholder | `constants/chanakya-insights.ts` |
| L10 | Mobile / context nav “Modules coming soon” chrome | Unfinished | `mobile-nav.tsx`; `context-navigation-panel.tsx` |
| L11 | My Deals empty stage = “future placeholder” comment | Placeholder | `constants/my-deals.ts` |
| L12 | Registry seed catalogs / `.demo` websites in masters | Demo | `registry-seed.ts`; ECM masters |
| L13 | CO-ARCH-004 programme ID collision (doc ambiguity) | Doc debt | Architecture baseline TD-13 |
| L14 | Residual CAD Priority-2 fabricated Deal seeds (documented) | Provenance | Architecture baseline TD-14 |

---

## Explicitly improved but not yet certified

| Item | Status |
|------|--------|
| **CO-RADAR-003** Enterprise Deal Timeline → Radar projection | Implemented locally; validation PASS (avg health 88; empty timeline 0); **deploy only after Business Certification + PO approval** |
| Demo seeds environment gating | Policy exists; footgun if `CATALYST_DEMO_SEEDS_ENABLED` baked true |
| Deal dual-write retired when Registry operational | Rollback Soft Go-Live path still present |
| EAO Shadow default OFF | Correct for customer isolation; Hybrid Cutover still unfinished |

---

## Recommended go-live sequencing (diagnosis only — not a fix plan)

1. **Close Critical:** durable ports for ETE/EDC/EDL (or hard-scope which engines must be Prisma before go-live); retire Accounting mock from production nav; soft-delete adapters for core entities; Partner Gateway → Opportunity Registry; close OPEN CO-QA E2E.  
2. **Close High invent / dual-path:** CAD defaults; OW placeholder provider replacement; Document Package migration; FS-01/ADR-019 certification path; Radar BAT after CO-RADAR-003 deploy approval.  
3. **Gate or hide Medium demos** on production builds (Accounting, Analyze Deal, Heat Map, Alert mocks, Investments Coming soon).  
4. **Defer Low** prototype/`compass/` surfaces from production packaging.

---

## Method

- Repo-wide scans for stub/mock/placeholder/demo/TODO/hardcode/in-memory/dual-write/localStorage SSOT signals  
- Cross-check against architecture baseline, CO-QA, CO-DOC, CO-RADAR, CO-INVESTIGATION, ADR-022, Soft Go-Live / Phase A–C rules  
- UI input `placeholder=` attributes and unit-test-only fixtures **excluded** unless they invent business facts  

**No fixes were made under this report.**

---

## Artefacts

| Artefact | Path |
|----------|------|
| This report | `docs/co-prod-ready-001/CO-PROD-READY-001-PRODUCTION-READINESS-REPORT.md` |
| Interactive canvas | `co-prod-ready-001-readiness.canvas.tsx` (Cursor canvas) |

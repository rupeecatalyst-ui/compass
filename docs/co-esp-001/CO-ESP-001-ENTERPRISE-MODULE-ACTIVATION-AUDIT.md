# CO-ESP-001 — Enterprise Module Activation Audit

**Code:** CO-ESP-001  
**Nature:** DIAGNOSIS ONLY — no fixes · no deploy · no redesign  
**Date:** 2026-08-07  
**Authority:** Product Owner instruction — gate before Business Certification / E2E Journey Testing  
**Related:** `docs/co-prod-ready-001/CO-PROD-READY-001-PRODUCTION-READINESS-REPORT.md`

---

## Executive verdict

**Business Certification and End-to-End Journey Testing must not begin until this audit is accepted and activation gaps are addressed in Product Owner order.**

Of **25** mandated enterprise modules:

| Classification | Count |
|----------------|------:|
| **ACTIVE** | 6 |
| **PARTIALLY ACTIVE** | 17 |
| **INACTIVE** | 1 |
| **BLOCKED** | 1 |

The platform has a **strong registry spine** (Product · Lender · Matrix · Opportunity under prisma) and an **operational CHANAKYA derive layer**, but core execution engines (Tasks, Dialogue, Documents durability, Policy/Workflow runtime, Accounting truth, AI production brain) are **not production-activated**.

---

## Audit baseline (mandatory reading)

Status is assessed against the **intended Soft Go-Live / pilot cutover configuration**:

| Gate | Expected for operational registries |
|------|-------------------------------------|
| `ENTERPRISE_PERSISTENCE_MODE` | `prisma` |
| `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE` | `prisma` |
| `DATABASE_URL` / `DIRECT_URL` | set |
| JWT secrets | set (fail-closed) |

**If mode ≠ prisma (code default = `memory`):** Opportunity Registry, Product Registry APIs, Lender Registry APIs, Product–Lender Matrix, and ECM durable APIs **fail closed or empty**. Those modules then classify as **BLOCKED** for business use until prisma is enabled.

Classifications below assume **prisma cutover is intended and available**. Residual in-memory engines, mocks, and stubs still downgrade modules even under prisma.

### Classification rules used

| Class | Meaning |
|-------|---------|
| **ACTIVE** | Built, navigable, wired to durable SSOT (or certified derive), usable for real business work with known residual debt only |
| **PARTIALLY ACTIVE** | Built and reachable, but incomplete SSOT, in-memory ports, stubs, mock slices, or dual-path debt prevent production truth |
| **INACTIVE** | Built at framework/route level but not operationally connected as enterprise SSOT for journey work |
| **BLOCKED** | Present in nav / UX but **cannot** be trusted as enterprise truth (mock book, fail-closed without path, or programme-forbidden) |

### Column definitions

| Column | Meaning |
|--------|---------|
| Built | Implementation exists (UI +/or engine) |
| Active | Users can open and attempt work in-app |
| Connected | Wired to durable SSOT / real APIs under prisma |
| Production Ready | Honest go-live for that capability |
| Dependency Status | Upstream/downstream health |
| Placeholder/Stub | Explicit stub/placeholder code |
| Mock Data | Fake business numbers presented as UI truth |
| In-Memory Adapter | Default `createInMemory*Ports` or Map/localStorage SSOT |
| Feature Flag | Env/flag gating |
| Blocking Dependencies | What must change before ACTIVE + Production Ready |

---

## Enterprise Activation Matrix

### 1. Authentication & Identity

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes |
| Connected | Partial (Prisma User when `DATABASE_URL`; else demo auth) |
| Production Ready | Partial |
| Dependency Status | JWT fail-closed; DB required for production |
| Placeholder/Stub | Yes — demo user resolve path in `server/services/auth.service.ts` |
| Mock Data | No |
| In-Memory Adapter | No |
| Feature Flag | `DEMO_AUTH_ENABLED` (default OFF); `DATABASE_URL` gates durable path |
| Blocking Dependencies | Production secrets + DB users; MFA / EIAE not production-grade |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **2 days** |

Evidence: `src/app/api/auth/login/route.ts` · `server/services/auth.service.ts` · `prisma` `User`

---

### 2. User Registry

| Field | Status |
|-------|--------|
| Built | Partial |
| Active | Yes |
| Connected | Partial (admin list Prisma; detail/IAM still EUM localStorage) |
| Production Ready | Partial |
| Dependency Status | Dual book: Prisma User ↔ EUM store |
| Placeholder/Stub | Yes — `src/lib/enterprise-user-management/store.ts` |
| Mock Data | Yes — EUM seed (demo-gated) |
| In-Memory Adapter | No (localStorage) |
| Feature Flag | None dedicated; demo seeds gated |
| Blocking Dependencies | Unify EUM lifecycle onto Prisma User |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **5 days** |

Evidence: `admin/users` · `/api/admin/users` · EUM store

---

### 3. Customer Registry (ECM Contact / Company)

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes |
| Connected | Yes under prisma (REST → Prisma); memory ports default otherwise |
| Production Ready | No (mode gate + in-memory default + demo seed paths) |
| Dependency Status | Requires prisma + org seed |
| Placeholder/Stub | No |
| Mock Data | Yes — `src/lib/demo-seed/ecm-demo-seed.ts` (gated) |
| In-Memory Adapter | Yes — `enterprise-contact-master/repositories/in-memory.ts` |
| Feature Flag | `ENTERPRISE_PERSISTENCE_MODE` (default memory) |
| Blocking Dependencies | Prisma mode + migrations; retire memory as operational book |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **2 days** |

Evidence: `/api/ecm/*` · `ecm-persist.ts` · Contacts directory workspace

---

### 4. Opportunity Registry

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes (under prisma + registry flag auto-on) |
| Connected | Yes under prisma |
| Production Ready | Partial (flag/env gate; lifecycle/FS-01 residual) |
| Dependency Status | Auto-on when prisma + Deal primary write; else fail-closed |
| Placeholder/Stub | No |
| Mock Data | No (fail-closed empty) |
| In-Memory Adapter | No on API path |
| Feature Flag | `OPPORTUNITY_REGISTRY_API_ENABLED` / `NEXT_PUBLIC_*` (+ prisma) |
| Blocking Dependencies | Prisma cutover certified; integrity verify scripts |
| **Classification** | **ACTIVE** *(BLOCKED if mode ≠ prisma)* |
| Effort to activate | **1 day** (env/cutover verification) |

Evidence: `enterprise-opportunity-registry/flags.ts` · `/api/enterprise-opportunities` · My Opportunities workspace

---

### 5. Opportunity Workspace

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes |
| Connected | Partial (Registry context; LIFE/tasks/dialogue via placeholder provider) |
| Production Ready | No |
| Dependency Status | Depends on Opportunity Registry + ECM + Document Center |
| Placeholder/Stub | Yes — `workspace-placeholder-provider.ts` |
| Mock Data | Partial (placeholder panel state) |
| In-Memory Adapter | Partial — FS-01 LoanFile-shaped runtime projection |
| Feature Flag | Deal/Opportunity consumer flags under prisma |
| Blocking Dependencies | Retire placeholder provider; FS-01 PO approval; Registry operational |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **8 days** |

Evidence: Opportunity Workspace · `opportunity-runtime-adapter.ts` · Credit Bench entry

---

### 6. Document capability (Document Center / Registry / Packages)

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes |
| Connected | Partial (localStorage/IndexedDB + best-effort prisma sync) |
| Production Ready | No |
| Dependency Status | Authoring SSOT still browser-local; type masters may be Prisma |
| Placeholder/Stub | No |
| Mock Data | No |
| In-Memory Adapter | Yes — `document-registry/store.ts`, `document-package/store.ts` |
| Feature Flag | prisma for durable sync/packages |
| Blocking Dependencies | Durable blob + metadata SSOT; package migration; purge-risk closure |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **8 days** |

Evidence: Document Center page · document registry/package stores · package API

---

### 7. Dialogue (EDC)

| Field | Status |
|-------|--------|
| Built | Partial |
| Active | Partial (route exists; not primary nav) |
| Connected | No |
| Production Ready | No |
| Dependency Status | In-memory EDC only; portal-specific dialogue models separate |
| Placeholder/Stub | Yes — default in-memory composition |
| Mock Data | Yes — `opp-demo-001` seed path in Dialogue workspace |
| In-Memory Adapter | Yes — `enterprise-dialogue-center/repositories/in-memory.ts` |
| Feature Flag | None; demo seed gated |
| Blocking Dependencies | Prisma EDC ports + API; journey wiring |
| **Classification** | **INACTIVE** |
| Effort to activate | **8 days** |

Evidence: `/dialogue` · EDC composition · dialogue-center-workspace

---

### 8. Tasks (ETE)

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes |
| Connected | No (ETE always in-memory; Deal tasks are separate projection) |
| Production Ready | No |
| Dependency Status | Constitutional SSOT exists; durable ports **not** wired |
| Placeholder/Stub | No |
| Mock Data | Yes — ETE demo-seed |
| In-Memory Adapter | Yes — `enterprise-task-engine` composition → in-memory |
| Feature Flag | `DEAL_REGISTRY_CONSUMER_TASKS` (Deal only); ETE has no Prisma flag |
| Blocking Dependencies | Prisma ETE repository + `configureEtePorts`; retire dual Deal-task authoring |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **8 days** |

Evidence: `/tasks` · `enterprise-task-engine/composition.ts` · TaskEngineWorkspace

---

### 9. Activity Timeline (ECIE + Deal Timeline + dashboard)

| Field | Status |
|-------|--------|
| Built | Partial |
| Active | Partial |
| Connected | Partial (Deal Timeline durable under prisma; ECIE session Map; dashboard demo) |
| Production Ready | No |
| Dependency Status | No universal Activity SSOT (CO-PROD-READY C7) |
| Placeholder/Stub | Yes — ECIE activity-registry Map |
| Mock Data | Yes — dashboard activity demo book |
| In-Memory Adapter | Yes |
| Feature Flag | prisma + `DEAL_REGISTRY_CONSUMER_ACTIVITIES` |
| Blocking Dependencies | Compose single Activity projection; hydrate ECIE; retire dashboard mock |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **5 days** |

Evidence: ECIE activity-registry · Deal timeline API · dashboard activity panel · CO-RADAR-003 timeline projection (implemented, cert-gated)

---

### 10. Credit & Risk

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Partial |
| Connected | Partial (desks navigable; CRE admin largely seed/placeholder) |
| Production Ready | No |
| Dependency Status | Recommendations often via Lender Registry ranker — not CRE SSOT |
| Placeholder/Stub | Yes — `credit-risk-section-placeholder.tsx` + many admin pages |
| Mock Data | Yes — credit-risk-engine data seeds |
| In-Memory Adapter | Yes — policy/rule/audit stores |
| Feature Flag | None dedicated |
| Blocking Dependencies | Durable CRE; wire CRE outputs into Workbench as SSOT |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **8 days** |

Evidence: Credit Bench / Workbench · CRE admin · policy-store

---

### 11. Financial Analysis (Analyze Deal)

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Partial |
| Connected | Partial |
| Production Ready | No |
| Dependency Status | Explicit Phase-1 mock recommendations |
| Placeholder/Stub | Yes — financial-metrics admin placeholder |
| Mock Data | Yes — `analyze-deal/mock-recommendations.ts` |
| In-Memory Adapter | No |
| Feature Flag | None |
| Blocking Dependencies | Replace mocks with CRE / program / eligibility SSOTs |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **5 days** |

Evidence: Analyze Deal workspace · mock-recommendations

---

### 12. Product Registry / Product Master

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes |
| Connected | Yes under prisma |
| Production Ready | Yes *(under prisma + seed)* |
| Dependency Status | Fail-closed without prisma |
| Placeholder/Stub | No |
| Mock Data | Partial — canonical catalog bootstrap seed |
| In-Memory Adapter | Partial — Tier-2 constants port fallback |
| Feature Flag | prisma + `ENTERPRISE_MASTERS_DUAL_READ` for client ports |
| Blocking Dependencies | Prisma mode + catalog seed on target env |
| **Classification** | **ACTIVE** |
| Effort to activate | **1 day** |

Evidence: `/api/product-registry/*` · product-registry service · Product Master admin

---

### 13. Product Programs

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes |
| Connected | Yes under prisma |
| Production Ready | Partial (data quality / completeness) |
| Dependency Status | Lender Registry programs + Product Master |
| Placeholder/Stub | No |
| Mock Data | No |
| In-Memory Adapter | No |
| Feature Flag | prisma |
| Blocking Dependencies | Program population completeness for Deal recommendations |
| **Classification** | **ACTIVE** |
| Effort to activate | **2 days** |

Evidence: admin Product Programs · Lender Program Portal · lender-registry repository

---

### 14. Lender Registry

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes |
| Connected | Yes under prisma |
| Production Ready | Yes *(under prisma + operational activation)* |
| Dependency Status | Soft Go-Live local residual exists but API is Prisma SSOT |
| Placeholder/Stub | No |
| Mock Data | Partial — master seed catalog |
| In-Memory Adapter | Partial — Tier-2 constants fallback |
| Feature Flag | prisma API guard |
| Blocking Dependencies | Prisma mode + activate-operational scripts |
| **Classification** | **ACTIVE** |
| Effort to activate | **1 day** |

Evidence: `/api/lender-registry/*` · lender-registry repository · recommend-from-registry

---

### 15. Product–Lender Mapping / Matrix

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes |
| Connected | Yes under prisma |
| Production Ready | Yes *(under prisma)* |
| Dependency Status | Product + Lender registries populated |
| Placeholder/Stub | No |
| Mock Data | No |
| In-Memory Adapter | No |
| Feature Flag | prisma (503 otherwise) |
| Blocking Dependencies | Prisma + parent registries |
| **Classification** | **ACTIVE** |
| Effort to activate | **1 day** |

Evidence: admin product-lender-matrix · `/api/admin/product-lender-matrix`

---

### 16. Policy Engine (EPDE / Policy Library)

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Partial |
| Connected | Partial (framework + AI read-connectors; not journey hard-gate SSOT) |
| Production Ready | No |
| Dependency Status | In-memory EPDE; CRE Policy Library separate seed store |
| Placeholder/Stub | Partial — policy simulator placeholder |
| Mock Data | Yes (CRE seeds; EPDE empty memory) |
| In-Memory Adapter | Yes — EPDE in-memory ports |
| Feature Flag | None; not primary-nav Policy Engine |
| Blocking Dependencies | Durable EPDE; admin console; wire as Enterprise Policy Engine |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **8 days** |

Evidence: `enterprise-policy-decision-engine/*` · CRE policy-library-view

---

### 17. Workflow Engine

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Partial (admin UI) |
| Connected | No (does not drive Lender Pipeline / Deal stages) |
| Production Ready | No |
| Dependency Status | Dual: admin workflow-store + EWE in-memory vs Deal lifecycle masters |
| Placeholder/Stub | Partial — foundation overview |
| Mock Data | Yes — workflow-engine seed data |
| In-Memory Adapter | Yes — workflow-store + EWE in-memory |
| Feature Flag | None |
| Blocking Dependencies | Persist + cutover pipeline transitions **or** formally retire EWE as non-runtime |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **13 days** |

Evidence: admin workflow-engine · `enterprise-workflow-engine` · Deal stage masters

---

### 18. Accounting

| Field | Status |
|-------|--------|
| Built | Partial |
| Active | Partial (nav + UI) |
| Connected | Partial (Invoice Party Master Prisma subset only) |
| Production Ready | **No** |
| Dependency Status | Workspace ledger is **static mock** — not Deal-keyed accounting SSOT |
| Placeholder/Stub | No (explicit mock model) |
| Mock Data | **Yes** — `accounting-workspace/mock-data.ts` |
| In-Memory Adapter | No (mock dataset function) |
| Feature Flag | None for mock workspace |
| Blocking Dependencies | Real invoice/payout/GST SSOT keyed by Deal; remove mock from production nav |
| **Classification** | **BLOCKED** |
| Effort to activate | **13 days** |

Evidence: `getAccountingWorkspaceModel` → mock-data · Accounting workspace · Invoice Party (real subset)

---

### 19. Partner Registry / Wealth Partner / Partner Gateway

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes |
| Connected | Partial — **Wealth Partner Registry = Prisma**; **Partner Business opportunities = in-memory Map placeholder** (not Opportunity Registry) |
| Production Ready | No |
| Dependency Status | Companion EEE / BAT freeze residual; serverless Map durability patched via profileJson only |
| Placeholder/Stub | **Yes** — `partner-business.service.ts` PLACEHOLDER DTOs |
| Mock Data | Partial |
| In-Memory Adapter | **Yes** — `stores = new Map` for partner opportunities |
| Feature Flag | `PARTNER_APP_ORIGINS` · prisma for registry |
| Blocking Dependencies | Partner Gateway → Opportunity Registry SSOT; EEE; BAT close |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **5 days** (gateway SSOT cutover) + companion programme |

Evidence: wealth-partner-registry · `partner-business.service.ts` · `/api/partner/**`

---

### 20. CHANAKYA (Radar · Guide · Live Intelligence · services)

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes |
| Connected | Yes (derive engines over Deal / ETE / EBI inputs) |
| Production Ready | Partial (demo inject paths; ETE durability; Radar cert after CO-RADAR-003) |
| Dependency Status | Live trust requires Deal Registry hydration |
| Placeholder/Stub | Partial — operational-movement demo panel |
| Mock Data | Partial — demo-gated movement inject |
| In-Memory Adapter | Partial (demo queues); core formulas are shared SSOTs |
| Feature Flag | demo-seed gating |
| Blocking Dependencies | Certify Radar after timeline projection deploy approval; durable ETE for task intel |
| **Classification** | **ACTIVE** |
| Effort to activate | **2 days** (certification / quarantine demos) |

Evidence: `chanakya-radar` · Live Intelligence bar · Guide repository · briefing derive

---

### 21. SARATHI

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Partial |
| Connected | Partial (UI → EAI turn orchestrator; stub LLM) |
| Production Ready | No |
| Dependency Status | ADR-022 Hybrid Cutover **not authorised** |
| Placeholder/Stub | Yes — stub LLM / voice stubs |
| Mock Data | No |
| In-Memory Adapter | Yes — EAI in-memory ports |
| Feature Flag | `EAO_SHADOW_MODE_ENABLED` default **false** |
| Blocking Dependencies | Production LLM; Hybrid Cutover PO auth; voice providers |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **5 days** (provider) + programme gates |

Evidence: SARATHI workspace · EAI turn-orchestrator · ADR-022

---

### 22. Enterprise AI Platform

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Partial |
| Connected | Partial (read-connectors; stub tool-bus / LLM) |
| Production Ready | No |
| Dependency Status | Framework certified with known limitations (CO-AI-117) |
| Placeholder/Stub | Yes — stub LLM, voice, CIE, tool handlers |
| Mock Data | Partial — fixtures |
| In-Memory Adapter | Yes — EAI composition |
| Feature Flag | Stub provider default |
| Blocking Dependencies | External LLM; durable memory; non-stub tools |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **5 days** (provider wiring) + follow-on tool cutover |

Evidence: `enterprise-ai-platform/*` · CO-AI-117 known limitations

---

### 23. Enterprise AI Orchestrator (EAO G1/G2)

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Partial (PO shadow dashboard; not customer brain) |
| Connected | Partial |
| Production Ready | No |
| Dependency Status | Shadow default OFF; stub provider; fixtures dashboard; Hybrid Cutover blocked |
| Placeholder/Stub | Yes — `shadow/stub-provider.ts` |
| Mock Data | Yes — G2 dashboard/benchmark fixtures |
| In-Memory Adapter | Yes — shadow capture-store |
| Feature Flag | `EAO_SHADOW_MODE_ENABLED=false` default |
| Blocking Dependencies | PO auth for shadow/Hybrid; real reasoning model; durable capture |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **8 days** (post-authorisation) |

Evidence: EAO shadow pipeline · Shadow Mode Dashboard · ADR-022 · `.env.example`

---

### 24. Mission Control

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Partial |
| Connected | Partial (EME snapshot APIs exist; many surfaces mock) |
| Production Ready | No |
| Dependency Status | Alert Center / executive providers mock; approvals inert |
| Placeholder/Stub | Yes — approval / alert / situation placeholders |
| Mock Data | Yes — alert & executive-intelligence providers |
| In-Memory Adapter | Yes — in-process MC registries |
| Feature Flag | demo-seed in some providers |
| Blocking Dependencies | Replace mocks with EBI/EME/ETE; wire approvals |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **8 days** |

Evidence: `src/mission-control/*` · alert-center providers · EME mission-control snapshot

---

### 25. Executive Dashboards (EBI / EI / User Home)

| Field | Status |
|-------|--------|
| Built | Yes |
| Active | Yes |
| Connected | Partial (User Home / EBI / RM Workspace live-compose; MC executive path still mock) |
| Production Ready | Partial |
| Dependency Status | Split brain: dashboard path vs Mission Control mock EI |
| Placeholder/Stub | Yes — MC executive-intelligence providers |
| Mock Data | Partial — MC path |
| In-Memory Adapter | Partial — ETE feeds still memory |
| Feature Flag | None dedicated |
| Blocking Dependencies | Unify MC onto EBI; Deal live hydration; ETE durability |
| **Classification** | **PARTIALLY ACTIVE** |
| Effort to activate | **3 days** (unify) + ETE dependency |

Evidence: EBI compose · User Home / RM Workspace · `/api/admin/business-intelligence` · MC EI providers

---

## Platform dependency note (not in mandated list)

**Enterprise Deal Registry** is the operational spine for My Deals, Radar, Loan Workspace pipeline, and many consumers. Under prisma it is the Phase B SSOT (`DEAL_REGISTRY_*` flags default ON). Residual Soft Go-Live / LoanFile dual-path and ADR-019 `/deals/:dealId` programme remain technical debt (see CO-PROD-READY-001). Treat Deal Registry as a **blocking dependency** for journey certification even though it was outside the PO minimum module list.

---

## Totals

| # | Metric | Count |
|---|--------|------:|
| 1 | **Total Modules** | **25** |
| 2 | **Active Modules** | **6** |
| 3 | **Partially Active Modules** | **17** |
| 4 | **Inactive Modules** | **1** |
| 5 | **Blocked Modules** | **1** |

### By classification

**ACTIVE (6)**  
Opportunity Registry · Product Registry · Product Programs · Lender Registry · Product–Lender Mapping · CHANAKYA  

**PARTIALLY ACTIVE (17)**  
Authentication & Identity · User Registry · Customer Registry · Opportunity Workspace · Document capability · Tasks · Activity Timeline · Credit & Risk · Financial Analysis · Policy Engine · Workflow Engine · Partner Registry/Gateway · SARATHI · Enterprise AI Platform · Enterprise AI Orchestrator · Mission Control · Executive Dashboards  

**INACTIVE (1)**  
Dialogue (EDC)  

**BLOCKED (1)**  
Accounting  

---

## Recommended activation order

Order optimises for **honest E2E journey testing** (Contact → Opportunity → Documents → Credit → Deal/Pipeline → Tasks/Timeline), then intelligence, then deferred programmes.

| Step | Module(s) | Why first | Est. effort |
|------|-----------|-----------|-------------|
| **0** | Persistence cutover verify (`prisma` + JWT + Deal/Opportunity flags) | Unlocks all ACTIVE registries; without this OR/ECM/Product/Lender are BLOCKED | **1 day** |
| **1** | Authentication & Identity hardening | No demo auth in cert env; secrets verified | **2 days** |
| **2** | Customer Registry (ECM) production book | Journey starts at Contact | **2 days** |
| **3** | Opportunity Registry integrity verify | Requirement SSOT | **1 day** |
| **4** | Document capability durable SSOT | Constitutional document authoring | **8 days** |
| **5** | Opportunity Workspace (retire placeholder provider) | Execution desk truth | **8 days** |
| **6** | Tasks (ETE Prisma ports) | Work orchestration SSOT | **8 days** |
| **7** | Activity Timeline unify | Radar + desk integrity | **5 days** |
| **8** | User Registry unify onto Prisma | Admin identity book | **5 days** |
| **9** | Credit & Risk + Financial Analysis | Decision support without mocks | **8 + 5 days** |
| **10** | Partner Gateway → Opportunity Registry | Stop parallel opportunity Map | **5 days** |
| **11** | Executive Dashboards unify (EBI ↔ MC) | One executive truth | **3 days** |
| **12** | Mission Control live providers | Supervision desk | **8 days** |
| **13** | Dialogue (EDC) durable | Communication SSOT | **8 days** |
| **14** | Policy Engine (EPDE) runtime | Hard-gate authority | **8 days** |
| **15** | SARATHI + Enterprise AI Platform providers | Conversational ops (still advisory) | **5 + 5 days** |
| **16** | EAO (only after PO Hybrid/Shadow auth) | Reasoning authority programme | **8 days** |
| **17** | Workflow Engine cutover **or** formal non-runtime retirement | Avoid dual stage ownership | **13 days** |
| **18** | Accounting real ledger **or** remove from production nav | Currently BLOCKED | **13 days** |

**Rough remaining activation sum (partial/inactive/blocked only, sequential upper bound):** ~**130 person-days**. Parallel tracks (Documents ‖ ETE ‖ CRE) can compress calendar time; Product Owner should not start Business Certification until Steps **0–7** are at least **ACTIVE / production-honest** for the journey path under test.

---

## Estimated effort — remaining activation (summary)

| Module | Classification | Effort (days) |
|--------|----------------|--------------:|
| Authentication & Identity | PARTIALLY ACTIVE | 2 |
| User Registry | PARTIALLY ACTIVE | 5 |
| Customer Registry | PARTIALLY ACTIVE | 2 |
| Opportunity Registry | ACTIVE | 1 |
| Opportunity Workspace | PARTIALLY ACTIVE | 8 |
| Document capability | PARTIALLY ACTIVE | 8 |
| Dialogue | INACTIVE | 8 |
| Tasks (ETE) | PARTIALLY ACTIVE | 8 |
| Activity Timeline | PARTIALLY ACTIVE | 5 |
| Credit & Risk | PARTIALLY ACTIVE | 8 |
| Financial Analysis | PARTIALLY ACTIVE | 5 |
| Product Registry | ACTIVE | 1 |
| Product Programs | ACTIVE | 2 |
| Lender Registry | ACTIVE | 1 |
| Product–Lender Mapping | ACTIVE | 1 |
| Policy Engine | PARTIALLY ACTIVE | 8 |
| Workflow Engine | PARTIALLY ACTIVE | 13 |
| Accounting | BLOCKED | 13 |
| Partner Registry/Gateway | PARTIALLY ACTIVE | 5 |
| CHANAKYA | ACTIVE | 2 |
| SARATHI | PARTIALLY ACTIVE | 5 |
| Enterprise AI Platform | PARTIALLY ACTIVE | 5 |
| Enterprise AI Orchestrator | PARTIALLY ACTIVE | 8 |
| Mission Control | PARTIALLY ACTIVE | 8 |
| Executive Dashboards | PARTIALLY ACTIVE | 3 |

---

## Certification gate statement

1. **Do not** start Business Certification until Product Owner accepts this audit.  
2. **Do not** treat `npm run verify:*` Pass as Business Certification (CO-QA-001).  
3. **Do not** certify journey paths that depend on Accounting mock, ETE memory-only, Document localStorage-only, or Partner Gateway placeholder opportunities as production-true.  
4. Minimum honest E2E path requires Steps **0–7** above before journey BAT.

---

## Method

- Code inspection of routes, services, Prisma models, composition ports, flags (`.env.example`), and navigation.  
- Cross-check with CO-PROD-READY-001 Critical/High inventory.  
- No code changes · no deploy · no redesign performed under CO-ESP-001.

---

## Canvas

Interactive matrix: workspace canvas `co-esp-001-activation-matrix.canvas.tsx`.

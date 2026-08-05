# CO-ARCH-REVIEW-001 — Wealth Partner & Catalyst One Architecture Review

**Status:** Architecture Review Only  
**Implementation:** STRICTLY PROHIBITED (this document analyses only)  
**Date:** 2026-08-02  
**Scope:** Catalyst One (`Compass by Rupee Catalyst`) + Wealth Partner App (`Wealth Partner App/web`)  
**Authority:** Product Owner request prior to any new Enterprise module design  

---

## Executive verdict

Catalyst One is the Enterprise Operating System: registries, engines, employee workflows, and Partner Gateway APIs. The Wealth Partner App is a Zero-Trust companion SPA that authenticates via Partner JWT and renders Partner Home DTOs — it does not own business content or calculations.

**Enterprise Experience Engine (EEE) as defined in CO-WP-ARCHITECTURE-UPDATE-001 does not yet exist** as a publishing / admin / durable orchestration platform. What exists today is a **partial Experience projection path**: seed experience packages → resolve helpers → Partner Home API → companion render.

Completion % figures below are **engineering estimates from code depth, APIs, Prisma durability, and readiness docs** — they are **not** Product Owner certifications.

---

## 1. Current Enterprise Architecture

### 1.1 Applications

| Application | Stack | Role |
|-------------|-------|------|
| **Catalyst One** | Next.js App Router · Prisma · custom JWT | Enterprise OS — employee ERP, admin, Mission Control, Partner Gateway host |
| **Wealth Partner App** | Vite · React 19 · React Router 7 SPA (v0.4.15) | Enterprise companion — presentation only over Partner APIs |
| **COMPASS** | Referenced in identity / platform-access rules | Customer / journey surface (platform access flag); not the WP companion |
| **Customer Engagement** | Public token routes in Catalyst One | Customer self-service projection (ECE) — not a separate mobile app yet |
| **Future Customer App / Employee App** | Roadmap | Not implemented as standalone products in this review |

### 1.2 High-level relationship

```text
┌─────────────────────────────────────────────────────────────────┐
│                     CATALYST ONE (Enterprise OS)                 │
│  Registries · Engines · Admin · Mission Control · Chanakya      │
│                                                                  │
│  Employee JWT (cookie) ──► /api/ecm|deals|opportunities|…        │
│  Partner JWT (Bearer)  ──► /api/partner/*  (gateway only)        │
│  Opaque tokens         ──► ECE / Doc upload / Lender portal      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Partner Home DTO + Auth
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              WEALTH PARTNER APP (Companion SPA)                  │
│  Splash → Health → Login → Session (sessionStorage) → Home      │
│  Renders DTOs · Never calls employee registry APIs               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Authentication

| Boundary | Mechanism | Notes |
|----------|-----------|-------|
| **Employee** | Custom JWT · `compass-access-token` cookie · middleware gate | `server/services/auth.service.ts` · Not NextAuth |
| **Partner** | Separate Partner JWT · Bearer on `/api/partner/**` | Binding: User → Contact → `EnterpriseWealthPartner` |
| **Lender portal** | Opaque invite token + dual OTP | Outside employee chrome |
| **Customer engagement / doc upload** | Opaque engagement tokens | Outside `(dashboard)` |
| **Demo auth** | `DEMO_AUTH_ENABLED` when DB unset | Blocked for production without `DATABASE_URL` |

### 1.4 Security boundaries (constitutional)

1. Wealth Partner App **must only** call `/api/partner/**`.  
2. Wealth Partner App **must never** call `/api/wealth-partner-registry/**` (employee ERP).  
3. Partner Home fails closed when enterprise persistence / binding unavailable (`503` / Enterprise Unavailable UX).  
4. Partner tokens / session live in **sessionStorage** on the companion (not localStorage as SSOT for long-lived secrets).  
5. CORS allowlist via `PARTNER_APP_ORIGINS` / `NEXT_PUBLIC_WEALTH_PARTNER_APP_URL`.

### 1.5 Data flow (Partner Home)

```text
Seed Experience packages
  (src/constants/enterprise-partner-home.ts)
        │
        ▼
experience-resolve (audience · schedule · priority · sort)
        │
        ▼
partner-home.service  →  GET /api/partner/home
        │
        ▼
WP enterprise-api + use-partner-home-dashboard
        │
        ▼
Home Experience components (presentation-only)
```

### 1.6 Persistence dual reality

| Layer | Durability today |
|-------|------------------|
| ECM, Product, Lender, Document types, Opportunity, Deal, Wealth Partner Registry, Invitations, ECC configs, Metrics snapshots, Doc packages | **Prisma** (when `ENTERPRISE_PERSISTENCE_MODE=prisma`) |
| Many platform engines (ETE, EDL, EWE, EPDE, EEI, etc.) | **In-memory ports** / Soft Go-Live foundation |
| Partner Home experience content | **Seed catalogues** (not admin-published DB packages) |

---

## 2. Catalyst One — Enterprise modules

Status legend: **Operational** (Prisma + API + UI in active journeys) · **Foundation** (lib/ports, often in-memory) · **Compose** (read-only projection over other SSOTs) · **Policy** (constitution / UX only).

| Module | Purpose | Status | Est. % | Dependencies | Future consumers |
|--------|---------|--------|--------|--------------|------------------|
| **ECM Contact / Company** | Party identity SSOT | Operational | ~85 | Prisma, soft-delete | All journeys, WP binding, ECE |
| **Opportunity Registry** | Opportunity lifecycle SSOT | Operational (FS-01 awaiting PO “Approved”) | ~80 | ECM, Product | OW, Docs, Credit, LIFE, WP Business (future) |
| **Deal Registry** | One lender = one Deal | Operational / FROZEN model | ~85 | Opportunity, Lender | Deal Workspace, Radar, Accounting, EBI |
| **Product Registry** | Tier-2 product master | Operational | ~75 | Reference masters | Lead info, OW, entitlements (future), Product Workspace (future) |
| **Lender Registry** | Lenders + programs | Operational | ~75 | Product eligibility | Pipeline, LIFE, matrix admin |
| **Document Registry (types/defs)** | Document taxonomy | Operational | ~70 | — | Document Center, packages |
| **Document Center / Packages** | Document authoring & packages | Operational / partial | ~65 | Opportunity, Doc Registry | Deal projection (read-only), ECE |
| **Wealth Partner Registry (employee)** | Partner master for ERP | Operational | ~70 | ECM Contact | Admin, commissions UI, Partner Gateway binding |
| **Reference Masters** | Tier-1 lookups | Operational | ~80 | — | Forms, registries |
| **Invitation Engine** | Enterprise invitations | Operational / readiness | ~60 | Auth, ECC | Org/user/partner onboarding |
| **Communication Center (ECC)** | Profiles / sender config | Operational / readiness | ~55 | — | Outbound comms, ENCE |
| **Metrics Engine (EME)** | Metric snapshots | Operational / readiness | ~60 | Deal/Opp/Radar inputs | Mission Control, Radar, cron |
| **Enterprise Task Engine (ETE)** | Sole task SSOT | Foundation (constitution FROZEN; ports often in-memory) | ~55 | Entity refs | Tasks desk, RM, ECE, Chanakya |
| **Decision Ledger (EDL)** | Immutable config memory | Foundation | ~50 | Admin emitters | Chanakya explain, governance |
| **Business Intelligence (EBI)** | Read-only analytics compose | Compose / readiness | ~55 | Radar, ETE, EI | Mission Control, manager desks |
| **RM Workspace** | RM morning desk on User Home | Compose / readiness | ~60 | ETE, EBI, Deals | `/dashboard` |
| **Customer Engagement (ECE)** | Customer portal projection | Compose / readiness | ~55 | Deal, ETE, Docs, EDC | Token routes; future Customer App |
| **Policy / Rules / Decision engines (EPDE, ERDE, EDE)** | Policy & rules | Foundation | ~40–50 | ECG, EDL | Hard blocks only via Policy |
| **Workflow Engine / Orchestration (EWE, EWOE)** | Workflow definition | Foundation | ~40 | — | Stage automation future |
| **Opportunity Lifecycle Engine (EOLE)** | Lifecycle automation | Foundation | ~35 | Opportunity | Stage transitions |
| **Document Intelligence (EDIE)** | Doc AI / intelligence | Foundation | ~30 | Doc Registry | Document Center future |
| **Dialogue Center (EDC)** | Dialogue threads | Foundation + some APIs | ~45 | — | Action Center, ECE |
| **Notification / Comm Engine (ENCE)** | Notifications | Foundation | ~40 | ECC | Home notifications, ECE |
| **LIFE Engine** | Strategy stage | Foundation + workspace UI | ~50 | Opportunity | OW Strategy |
| **Credit Knowledge / Credit Risk** | Credit knowledge & risk | Partial admin + lib | ~45 | — | Credit Workbench |
| **Partner Network Engine (EPNE)** | Partner network graph | Foundation | ~35 | WP Registry | Network intelligence |
| **Experience Intelligence (EEI)** | Advisory experience registry (ports) | Foundation **in-memory** | ~25 | Advisory, Dialogue | **Not** WP Home publisher |
| **Partner Home / Gateway** | Companion auth + Home DTO | Operational API + **seed content** | ~70 API / ~35 content ownership | WP Registry binding, seed EE | Wealth Partner App |
| **Chanakya cluster** | Guide, Radar, Live Intelligence, coaching | Mixed operational UI + derive engines | ~60–75 by surface | Metric SSOTs | All workspaces, header |
| **Executive Intelligence / Mission Control** | Executive & ops desks | Partial | ~50 | EBI, Metrics, Radar | Management |
| **MDM / 360 / Asset / Metadata / Foundation libs** | Cross-cutting platforms | Foundation | ~30–45 | — | Admin / future engines |
| **Production Reset** | Cert environment reset | Operational tooling | ~70 | Prisma | Admin only |
| **Soft Delete / Recovery** | Cross-module recovery | Operational | ~65 | Prisma adapters (stubs for some) | Admin Recovery Center |

---

## 3. Wealth Partner App — Current architecture

### 3.1 Stack & location

- Root: `C:\Wealth Partner App\web`  
- **Not Next.js** — Vite + React Router SPA  
- Version stamp: `0.4.15` · Sprint stamp `CO-WP-103.21`  
- Catalyst One API base: `VITE_CATALYST_ONE_API_URL`

### 3.2 Navigation (bottom nav)

| Module | Route | Implementation |
|--------|-------|----------------|
| Home | `/app/home` | **Complete** Experience pack |
| Business | `/app/business` | Empty-state shell · **ON HOLD** |
| Saarthi | `/app/saarthi` | Foundation placeholder |
| Private | `/app/private` | Foundation placeholder |
| More | `/app/more` | Foundation placeholder |

Additional reserved routes (feed, notifications, campaigns, customers, opportunities, etc.) are empty-state or placeholder shells.

### 3.3 Session & Zero Trust

1. `GET /api/partner/health` — require enterprise `ok` + `persistence=prisma`.  
2. Login → Partner tokens + `PartnerSession` (includes `partnerId`, `contactId`, org).  
3. Session in **sessionStorage** only.  
4. Restore via `/me` or `/refresh`.  
5. AppShell re-validates health + session; else Enterprise Unavailable or login.  
6. API client refuses non-Partner endpoints by design (only `/api/partner/*` helpers).

### 3.4 Partner APIs used today

| Client | Endpoint |
|--------|----------|
| Health | `GET /api/partner/health` |
| Login / Logout / Me / Refresh | `/api/partner/auth/*` |
| Home dashboard | `GET /api/partner/home` |

No Business / Product Workspace / Entitlements / Tier Partner APIs exist yet.

### 3.5 DTO & rendering architecture

- Types mirrored under `web/src/types/*` (`PartnerHomeDashboard` aggregate).  
- `lib/enterprise-experience` — presentation helpers only (sort, schedule filter, deep-link resolve); **does not invent content or audience rules**.  
- Home order (certified layout): Greeting → Personalisation → Search → Hero → Actions → Highlights → My Business → Visiting Card → Saarthi → **Business Feed last**.  
- Components are prop-driven; navigation via Enterprise deep links only when provided by DTO.

### 3.6 Module governance status

| Item | Status |
|------|--------|
| Home | Implementation complete · **Awaiting PO Module Certification** (CO-WP-103.21) |
| Business | **ON HOLD** (CO-WP-ARCHITECTURE-UPDATE-001) |
| EEE | Architecture design pending · **DO NOT IMPLEMENT** |
| Deploy | Only after PO approval of a certified module |

---

## 4. Enterprise APIs

Grouped by domain. **I** = Implemented route(s) with service. **P** = Placeholder / seed / partial / gated.

### Identity & Auth

| API family | Status |
|------------|--------|
| `/api/auth/*` (employee login, refresh, me, password, org register, accept invitation) | **I** |
| `/api/users/*` (assignable, hierarchy) | **I** |
| `/api/activate/[token]` | **I** |
| `/api/partner/auth/*` | **I** |
| `/api/partner/health` | **I** |
| Partner Entitlements API | **Missing** |
| Partner Tier progress API | **Missing** |

### Partner (companion)

| API family | Status |
|------------|--------|
| `/api/partner/home` | **I** (seed-backed content) |
| Partner Business / Product Workspace APIs | **Missing** |
| Partner notifications feed API (dedicated) | **P** (fields on Home DTO; no full module API) |

### Partner (employee ERP — not for companion)

| API family | Status |
|------------|--------|
| `/api/wealth-partner-registry/**` | **I** (employee only) |

### Opportunity

| API family | Status |
|------------|--------|
| `/api/enterprise-opportunities/**` | **I** |

### Deal

| API family | Status |
|------------|--------|
| `/api/enterprise-deals/**` | **I** |

### Documents

| API family | Status |
|------------|--------|
| `/api/document-registry/**` | **I** |
| `/api/enterprise-document-packages/**` | **I** |
| `/api/enterprise-transaction-documents/**` | **I** |

### Communication / Conversation / Invitation

| API family | Status |
|------------|--------|
| `/api/admin/enterprise-communication/**` | **I** |
| `/api/enterprise-conversation-activities/**` | **I** |
| `/api/enterprise-invitations/**` | **I** |
| Full ENCE / EDC public APIs | **P** (lib-heavy; limited HTTP surface) |

### Commercial / Accounting

| API family | Status |
|------------|--------|
| `/api/invoice-parties`, `/api/accounting-payees` | **I** |
| Full Commercial Registry / commission versioning public API | **P** (Deal commercial links + WP commissions under employee registry) |

### Product / Lender / Masters

| API family | Status |
|------------|--------|
| `/api/product-registry/**` | **I** |
| `/api/lender-registry/**` | **I** |
| `/api/reference-masters/**` | **I** |
| `/api/admin/product-lender-matrix` | **I** |
| `/api/lender-program-portal/**` (+ admin) | **I** |

### ECM

| API family | Status |
|------------|--------|
| `/api/ecm/contacts/**`, `/api/ecm/companies/**` | **I** |

### Experience

| API family | Status |
|------------|--------|
| Experience packages CRUD / publish admin API | **Missing** (EEE) |
| Experience resolve (lib, used by Home service) | **I** (library, not public CRUD) |
| EEI ports API surface | **P** (in-memory foundation) |

### Metrics / BI / Admin ops

| API family | Status |
|------------|--------|
| `/api/enterprise-metrics/**`, `/api/cron/enterprise-metrics`, `/api/admin/enterprise-metrics` | **I** |
| `/api/admin/business-intelligence` | **I** |
| `/api/admin/production-reset`, `/api/admin/recovery`, governance, ops-health, build-information | **I** |

### Customer engagement

| API family | Status |
|------------|--------|
| Public ECE / document-upload token pages | **I** (app routes; compose layer) |
| Dedicated ECE REST catalogue | **P** |

---

## 5. Enterprise Registries

| Registry | Implemented? | Durability | Notes |
|----------|--------------|------------|-------|
| Contact Registry (ECM) | Yes | Prisma | Party SSOT |
| Company Registry (ECM) | Yes | Prisma | Linked to contacts |
| Customer Registry (distinct) | Partial | Overlaps Contact/Company + 360 engine | No separate “Customer Registry” SSOT named independently of ECM |
| Opportunity Registry | Yes | Prisma | Lifecycle SSOT |
| Deal Registry | Yes | Prisma | One lender one deal |
| Product Registry | Yes | Prisma | Tier 2 |
| Lender Registry | Yes | Prisma | Tier 2 + programs |
| Document Registry (types/definitions) | Yes | Prisma | Taxonomy |
| Document Package / Transaction Document stores | Yes | Prisma | Runtime docs |
| Wealth Partner Registry | Yes | Prisma | Employee ERP |
| Reference Masters | Yes | Prisma | Tier 1 |
| Invoice Party / Accounting Payee | Yes | Prisma | Commercial payees |
| Commercial Registry (full) | Partial | Deal + WP commission tables | Not a single named Commercial Registry module |
| Communication Registry / ECC profiles | Partial | Prisma configs | Profiles/sender; not full message registry |
| Invitation Registry | Yes | Prisma | Enterprise invitations |
| Experience Package Registry | **No** | Seed constants only | Gap vs EEE |
| Partner Entitlement Registry | **No** | — | Gap |
| Partner Tier / Target Registry | **No** | — | Gap |
| Decision Ledger (as registry of decisions) | Foundation | In-memory ports | Constitutional; not Postgres SSOT yet |
| Task Registry (ETE) | Foundation | In-memory (+ legacy Deal tasks) | Constitutional SSOT; durability incomplete |

---

## 6. Enterprise Engines

| Engine | Exists in codebase? | Persistence | Role vs EEE |
|--------|---------------------|-------------|-------------|
| Workflow Engine (EWE) | Yes | In-memory | Workflow definitions |
| Workflow Orchestration (EWOE) | Yes | In-memory | Orchestration |
| Rules Decision (ERDE) | Yes | In-memory | Rules |
| Policy Decision (EPDE) | Yes | In-memory | Only hard-block authority |
| Decision Engine (EDE) | Yes | In-memory | Decisions |
| Decision Ledger (EDL) | Yes | In-memory | Immutable history |
| Credit Risk / Credit Knowledge | Partial | Mixed | Credit desk support |
| Document Intelligence (EDIE) | Yes | In-memory | Doc intelligence |
| Communication / Notification (ENCE) | Yes | In-memory | Notifications |
| Invitation Engine | Yes | Prisma-backed service | Invitations |
| Identity Access (EIAE) | Yes | In-memory | Access model |
| Identity Model (constitutional) | Yes | Lib + Contact flags | Platform access incl. COMPASS |
| Task Engine (ETE) | Yes | In-memory (+ projections) | Tasks |
| LIFE Engine | Yes | In-memory + UI | Strategy |
| Metrics Engine | Yes | Prisma snapshots | KPIs |
| Business Intelligence (EBI) | Yes | Compose | Analytics |
| Opportunity Lifecycle (EOLE) | Yes | In-memory | Lifecycle |
| Partner Network (EPNE) | Yes | In-memory | Network |
| Experience Intelligence (EEI) | Yes | In-memory | Advisory experiences — **not** partner publishing EEE |
| Partner Home experience-resolve | Yes | Lib + seed | **Partial** Experience pipeline |
| **Enterprise Experience Engine (EEE)** | **No** | — | Named in roadmap; design pending |
| Partner Tier Engine | **No** | — | Roadmap (UPDATE-001) |
| Partner Entitlement Engine | **No** | — | Roadmap (UPDATE-001) |

---

## 7. User applications — landscape

```text
                    ┌──────────────────────┐
                    │   Catalyst One OS    │
                    │  (employee + admin)  │
                    └──────────┬───────────┘
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
 ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
 │ Wealth Partner  │  │ Customer Engage │  │ Lender Program  │
 │ App (companion) │  │ (token portal)  │  │ Portal (token)  │
 │ Home ready      │  │ ECE projection  │  │ Staging submits │
 └─────────────────┘  └─────────────────┘  └─────────────────┘
           │
           │  (future)
           ▼
 ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
 │ COMPASS         │  │ Customer App    │  │ Employee App    │
 │ (platform flag  │  │ (not built as   │  │ (mobile; not    │
 │  / journey ref) │  │  standalone)    │  │  separate repo) │
 └─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Relationship today:** Catalyst One owns identity, registries, calculations, and Partner Gateway. Wealth Partner App is the only dedicated companion application with Zero-Trust Partner APIs. COMPASS appears as platform-access / journey reference, not as the Wealth Partner shell. Future Customer / Employee apps are not present as independent deployables in this review.

---

## 8. Gaps (identify only — no designs)

### Missing Enterprise modules (vs stated roadmap / constitutional intent)

- Enterprise Experience Engine (publishing & orchestration)  
- Enterprise Product Workspace (authoring + companion render contract)  
- Partner Entitlements management  
- Partner Tier Engine (auto tier from product targets)  
- Full Commercial Registry as a first-class SSOT  
- Durable ETE / EDL / workflow engines on Prisma (many still Soft Go-Live)  

### Missing APIs

- Experience package CRUD / publish / schedule admin APIs  
- Partner Product Workspace DTO APIs  
- Partner Entitlements resolution API  
- Partner Tier / achievement API  
- Broader Partner domain beyond Home (Business, campaigns, training, etc.)  

### Missing Registries

- Experience Package Registry (durable)  
- Entitlement Registry  
- Partner Target / Tier Registry  
- Unified Commercial Registry (if required as named SSOT)  

### Missing Engines

- EEE (as defined in UPDATE-001)  
- Partner Tier Engine  
- Entitlement evaluation engine  

### Missing Admin Consoles

- Experience publishing console (campaigns, hero, feed, festival/CEO messages, training, creatives)  
- Product Workspace content admin (banner, benefits, FAQs, CTAs, marketing)  
- Partner Entitlements / Tier targets admin (beyond basic WP Registry fields)  

### Missing Publishing capabilities

- Durable content packages with versioning / schedule / audience beyond seed constants  
- Multi-surface publish (WP Home, Product Workspace, campaigns) from one publisher  

### Missing Security components (relative to companion expansion)

- Partner API surface expansion with least-privilege scopes beyond current Home  
- Entitlement-aware authorization on Partner Product visibility  
- Formal Experience content audit / approval workflow (beyond EDL foundation)  

---

## 9. Duplication review (SSOT risks)

| Finding | Risk |
|---------|------|
| **Employee WP Registry API vs Partner Gateway** | Intentionally separate — correct. Risk only if companion ever calls employee APIs. |
| **Experience Intelligence (EEI) vs Partner Home seed vs future EEE** | Three conceptual “experience” layers. EEI ≠ Partner Home publisher ≠ planned EEE. Naming collision risk for design. |
| **ETE vs EnterpriseDealTask / LoanFile tasks** | Constitutional: ETE is SSOT; Deal tasks are legacy projections. Dual-write risk if new UI bypasses ETE. |
| **Opportunity vs LoanFile-shaped projections** | FS-01 / CAD-2026-001: Opportunity is SSOT; projections must not invent business values. Residual compatibility paths must stay non-authoritative. |
| **Metric formulas** | Strong constitutional rule (single implementation). Residual risk wherever UI recalculates locally. |
| **My Business Today counts often zero / local greeting salutation** | Companion may diverge from API greeting fields (noted in Home certification) — presentation drift, not a second engine, but weakens “Enterprise owns experience”. |
| **Product visibility** | Product Registry exists in C1; WP must not hardcode catalogs — currently Business not built, so duplication not yet introduced; risk at Business start if EEE/entitlements absent. |
| **In-memory engines vs Prisma registries** | Dual runtime: operators may believe engines are durable when they are not. |

**No evidence** that Wealth Partner App currently owns a parallel Opportunity/Deal/Task calculation SSOT. Home remains presentation-only by constitution.

---

## 10. Enterprise Experience — what exists today

### Verdict: **PARTIAL — not a full Enterprise Experience Center / EEE**

| Capability (UPDATE-001 target) | Today |
|---------------------------------------|-------|
| Hero / Actions / Highlights / Feed / Visiting / Saarthi on Partner Home | **Yes** — projected via Partner Home API |
| Governance fields (audience, schedule, priority, deepLink, etc.) | **Yes** — on packages + resolve lib |
| Durable package store + admin publisher | **No** — seed catalogue SSOT |
| Campaigns / Training / Marketing creatives / Recognition / CEO / Festival | **No** dedicated publisher |
| Product Workspaces | **No** |
| Personalised greetings | **Partial** — DTO + local salutation behaviour |
| Notifications module | **Partial** — Home DTO fields; no full WP module |
| Experience Intelligence (EEI) | **Separate foundation** — in-memory advisory experiences; **not** the partner publishing layer |

**Explicit statement:**  
**No Enterprise Experience Engine architecture (EEE) as defined in CO-WP-ARCHITECTURE-UPDATE-001 currently exists.**  
What exists is a **Partner Home Experience projection pipeline** (seed → resolve → gateway → companion render), plus an unrelated **Experience Intelligence (EEI)** foundation module.

---

## 11. Recommendation (next architecture review only)

**Do not implement anything from this review.**

**Recommended next Product Owner architecture activity:**

### CO-EEE-ARCH-001 — Enterprise Experience Engine Design Review (Catalyst One)

Scope the design review to answer **ownership and boundaries only**:

1. Map every UPDATE-001 Experience responsibility to **existing** artefacts (Partner Home seed, `experience-resolve`, Partner Gateway Home DTO, EEI).  
2. Decide the **canonical name and SSOT** so EEI, Partner Home seed, and future EEE are not confused.  
3. Define how **Product Workspace**, **Entitlements**, and **Partner Tier** attach to EEE vs remain peer engines — still design-only.  
4. Produce an Architecture Decision / design pack **without** implementation authorisation.

**Do not** start Business module implementation, EEE coding, or Product Workspace pages until that design review is accepted and an implementation sprint is explicitly authorised.

---

## Sources (read-only)

- Catalyst One: `src/app/api/**`, `server/services/**`, `src/lib/enterprise-*`, `prisma/schema.prisma`, `.cursor/rules/enterprise-*.mdc`, `docs/co-wp-*`, `docs/co-biz-*`, `docs/co-arch-*`  
- Wealth Partner App: `C:\Wealth Partner App\web\src/**`, `C:\Wealth Partner App\docs/**`  
- Roadmap gate: `docs/co-wp-architecture/CO-WP-ARCHITECTURE-UPDATE-001.md`

---

## Document control

| Field | Value |
|-------|--------|
| ID | CO-ARCH-REVIEW-001 |
| Type | Architecture Review |
| Code changes | None |
| Migrations | None |
| Deployment | None |
| Next | Await PO for CO-EEE-ARCH-001 design review |

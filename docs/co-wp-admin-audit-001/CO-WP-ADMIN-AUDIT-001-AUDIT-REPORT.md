# CO-WP-ADMIN-AUDIT-001 — Wealth Partner Control Centre Audit

**Mode:** Architecture / navigation audit only  
**Date:** 2026-08-10  
**Code changes:** NONE · **Deploy:** NONE  

SSOT for Administration Console categories: `src/constants/administration-console.ts`

---

## Architectural principle (confirmed)

| Layer | Role |
|-------|------|
| **Catalyst One** | Control / configuration / SSOT |
| **Partner Gateway** | Authentication / authorization / enforcement |
| **Wealth Partner App** | Partner-facing presentation + permitted actions |

Do **not** create a second Partner administration system — extend the existing C1 Admin + WPR + Entitlements surfaces.

---

## A. All 7 Partners & Lenders modules

Category id: `lenders-partners` · title: **Partners & Lenders**

| # | Module name | Route | Purpose | Backend / API | DB entities | Operational? |
|---|-------------|-------|---------|---------------|-------------|--------------|
| 1 | **Enterprise Lender Directory** | `/lenders` | Operational lender search / compare / workspace | Lender directory compose + lender registry APIs | `EnterpriseLender`, programs, contacts | **Operational** (desk, not admin maintenance) |
| 2 | **Lender Registry** | `/admin/lender-registry` | Create/maintain lenders (admin master) | `/api/...` lender-registry services | `EnterpriseLender`, programs, docs | **Operational** admin |
| 3 | **Wealth Partner Registry** | `/wealth-partners` | Operational WPR desk (CO-WP-001) | `/api/wealth-partner-registry/partners*` | `EnterpriseWealthPartner` + network/commission/bank/activity | **Operational** |
| 4 | **Wealth Partner Registry (Admin)** | `/admin/wealth-partner-registry` | Same WPR UI via Administration Masters shell | Same WPR APIs | Same | **Operational** (same desk, admin chrome) |
| 5 | **Lender Program Portal** | `/admin/lender-program-portal` | Secure lender program links / OTP approvals (CO-LEND-001) | Lender program portal services | Lender program portal tables | **Operational** |
| 6 | **Credit Risk Lenders** | `/admin/credit-risk-engine/lenders` | Lender profiles for credit policy / eligibility | Credit risk engine admin | Credit-risk lender config (engine-scoped) | **Operational** (credit engine, not WPR) |
| 7 | **Partner Product Mapping** | `/admin/credit-risk-engine/products` *(ROUTES.ADMIN_CREDIT_RISK_PRODUCTS)* | Map products↔lenders inside **Credit & Risk Engine** | Credit risk product mapping | Credit-risk product config | **Operational** for credit engine — **not** Wealth Partner product entitlements |

**Note:** Modules 3 and 4 are the **same** `WealthPartnerRegistryView` at two entry points. “Partner” in module 7 means credit-engine partner/lender mapping language — not Wealth Partner Access.

---

## B. Exact routes (Partners & Lenders + related)

| Surface | Route constant | Path |
|---------|----------------|------|
| Lender Directory | `ROUTES.LENDERS` | `/lenders` |
| Lender Registry admin | `ROUTES.ADMIN_LENDER_REGISTRY` | `/admin/lender-registry` |
| WPR ops | `ROUTES.WEALTH_PARTNERS` | `/wealth-partners` |
| WPR workspace | — | `/wealth-partners/[partnerId]/workspace` |
| WPR admin | `ROUTES.ADMIN_WEALTH_PARTNER_REGISTRY` | `/admin/wealth-partner-registry` |
| Lender Program Portal | `ROUTES.ADMIN_LENDER_PROGRAM_PORTAL` | `/admin/lender-program-portal` |
| Credit Risk Lenders | `ROUTES.ADMIN_CREDIT_RISK_LENDERS` | `/admin/credit-risk-engine/lenders` |
| Partner Product Mapping | `ROUTES.ADMIN_CREDIT_RISK_PRODUCTS` | credit-risk products admin path |
| **Partner Access & Entitlements** | `ROUTES.ADMIN_PARTNER_ENTITLEMENTS` | **`/admin/partner-entitlements`** |

Also in primary nav (outside Admin category): **Wealth Partners** → `/wealth-partners`.

---

## C. Existing Wealth Partner functionality (codebase)

| Capability | Built? | Where |
|------------|--------|-------|
| Partner Registry | Yes | WPR UI + `/api/wealth-partner-registry/partners` |
| Partner Profile / workspace | Yes | `wealth-partner-workspace.tsx` tabs (overview, network, commissions, banking, legal, activation, …) |
| Partner Onboarding / lifecycle | Partial | `lifecycleStatus` / `operationalStatus` on `EnterpriseWealthPartner` |
| Partner KYC / legal docket | Partial | Legal/compliance panel + `/legal-docket` API |
| Partner activation | Yes | `WealthPartnerActivationPanel` (invitation engine) |
| Partner suspension | Yes (data model + Gateway gate) | `lifecycleStatus=suspended` / binding `PARTNER_SUSPENDED`; CLEANUP-003 used this |
| Partner hierarchy / network | Yes | Network members + network-intelligence API |
| Partner territory | Partial / light | `cityLabel` / `stateLabel` on partner — no dedicated territory engine UI in Admin |
| Partner products | Via Gateway masters | Partner Gateway product projection — not a WPR “allowed products” admin desk |
| Partner targets | Partial | Partner performance Gateway reads WPR `profileJson` targets when authored |
| Partner tiers | Limited | Template codes / partner types — no separate tier admin module |
| Partner performance | Gateway projection | `GET /api/partner/performance` (COM-001) — admin authoring of targets is profile-side |
| Partner commission | Yes | WPR commissions API + commercial % columns on partner |
| Partner payout | Partial | Commission structures / bank accounts — no full payout engine admin in Partners & Lenders |
| Partner links | Activation / invitation | Invitation / activation panel |
| Partner access / entitlements | Yes | ACCESS-001/002 — see §D |
| Referral / Joint / Solo | Yes | Entitlement templates + `defaultExecutionMode` |
| Transaction overrides | Yes | `PartnerTransactionEntitlement` + admin panel |
| Partner audit | Yes | `PartnerEntitlementAudit` + WPR activities |

---

## D. Exact location of CO-WP-ACCESS-001 / 001A / 002 controls

### Admin UI
| Item | Path |
|------|------|
| Page | `src/app/(dashboard)/admin/partner-entitlements/page.tsx` |
| Panel | `src/components/catalyst-one/admin/partner-entitlements/partner-entitlements-admin-panel.tsx` |
| **Route** | **`/admin/partner-entitlements`** |
| Console registry entry | **System Administration** category · id `partner-entitlements` · title **Partner Access & Entitlements** — **not** under Partners & Lenders |

### Admin API
| Item | Path |
|------|------|
| Route handler | `src/app/api/admin/partner-entitlements/route.ts` |
| Service | `server/services/partner-entitlements/` |
| Resolve (pure) | `src/lib/enterprise-partner-entitlements/resolve.ts` (`resolveEffectiveEntitlements`) |
| Constants | `src/constants/enterprise-partner-entitlements/` |
| Types | `src/types/enterprise-partner-entitlements.ts` |

### Partner Gateway enforcement
| Item | Path |
|------|------|
| Entitlement gate | `server/services/partner-gateway/partner-entitlement-gate.ts` |
| Ownership | `server/services/partner-gateway/partner-ownership.service.ts` |
| Binding / suspend | `server/services/partner-gateway/partner-binding.service.ts` |
| Business / Deal surfaces | `partner-business.service.ts`, `partner-deal.service.ts` |
| Docs | `docs/co-wp-access-001/`, `docs/co-wp-access-002/` |

### DB (ACCESS)
- `PartnerEntitlementTemplate`
- `PartnerEntitlementProfile`
- `PartnerTransactionEntitlement`
- `PartnerEntitlementAudit`  
(Migration programme: `prisma/migrations/20260809120000_co_wp_access_001_partner_entitlements/`)

---

## E. Existing database entities (Wealth Partner–related)

| Entity | Role |
|--------|------|
| `EnterpriseWealthPartner` | Partner master (identity, lifecycle, commercial %, profileJson) |
| `EnterpriseWealthPartnerNetworkMember` | Hierarchy / network |
| `EnterpriseWealthPartnerCommission` | Commission structures |
| `EnterpriseWealthPartnerBankAccount` | Banking |
| `EnterpriseWealthPartnerActivity` | Partner activity log |
| `PartnerEntitlementTemplate` | REFERRAL / JOINT / SOLO templates |
| `PartnerEntitlementProfile` | Per-partner defaults + module map |
| `PartnerTransactionEntitlement` | Per-Opportunity/Deal overrides |
| `PartnerEntitlementAudit` | Append-only entitlement change history |
| `EnterpriseOpportunity.sourceWealthPartnerId` | Ownership stamp |
| ECM Contact / Company | Identity for partners and customers |

---

## F. Existing APIs (summary)

**WPR (Catalyst One employee):**  
`/api/wealth-partner-registry/partners` · `[partnerId]` · `workspace` · `network` · `network-intelligence` · `commissions` · `banking` · `legal-docket`

**ACCESS admin:**  
`/api/admin/partner-entitlements` (views: partners, effective, audits; save profile / overrides)

**Partner Gateway (Wealth Partner App):**  
`/api/partner/auth/*` · opportunities · deals · customers · documents · activities · commercials · performance · saarthi · marketing · notifications · home · identity · masters · …

---

## G. Existing admin UI

| UI | Route | Notes |
|----|-------|-------|
| Administration Console hub | `/admin` (or admin console route) | Categories from `ADMINISTRATION_CATEGORIES` |
| WPR ops / admin shells | `/wealth-partners`, `/admin/wealth-partner-registry` | Same registry view |
| Partner workspace | `/wealth-partners/[id]/workspace` | Activation, network, commercials, legal |
| **Partner Access & Entitlements** | `/admin/partner-entitlements` | Templates, profile, txn overrides, audit |
| Command palette | lists “Partner Access & Entitlements” via `administrationChildren` | |

---

## H. Missing / weak Wealth Partner control capabilities

Relative to a full “Wealth Partner Control Centre” (not claiming these must all be built now):

- Dedicated **territory / region assignment** admin for partners  
- Dedicated **tier / SLA / ranking** admin beyond template codes  
- First-class **targets authoring** UI (today largely `profileJson` / commercial fields)  
- Unified **payout / settlement** control desk  
- **Partner product allow-list** admin (distinct from credit Product–Lender Matrix)  
- **Entitlements not linked** from Partners & Lenders or from WPR workspace (discoverability gap)  
- Single **Control Centre hub** page composing Registry + Access + Commercials + Activation  
- Partner App module catalog management beyond entitlement module flags  

---

## I. Recommended final Catalyst One Wealth Partner control-centre structure

Keep one system; improve navigation cohesion:

```
Administration Console
└── Partners & Lenders  (or rename: Partners, Lenders & Access)
    ├── Wealth Partner Registry (ops)          /wealth-partners
    ├── Wealth Partner Registry (Admin)      /admin/wealth-partner-registry
    ├── Partner Access & Entitlements        /admin/partner-entitlements   ← MOVE/LINK HERE
    ├── Enterprise Lender Directory          /lenders
    ├── Lender Registry                      /admin/lender-registry
    ├── Lender Program Portal                /admin/lender-program-portal
    └── (keep Credit Risk Lenders / Product Mapping under Credit/Products OR clearly label as Credit Engine)
```

**Also recommend:** deep-link from Wealth Partner workspace → “Manage Access & Entitlements” for the open partner (same `/admin/partner-entitlements?wealthPartnerId=`).

**Do not:** build a second Partner Admin in the Wealth Partner App or a parallel entitlement store.

---

## Navigation question — answered

**Is Partner Entitlements already accessible from Administration → Partners & Lenders?**

**NO.**

It **exists and is operational** at `/admin/partner-entitlements`, registered under **System Administration** (`id: "system"`), and also listed in the Administration command-palette flat list (`administrationChildren`).

It is **not** one of the 7 modules in the **Partners & Lenders** category. That is a **navigation placement / discoverability** gap, not a missing implementation.

---

## Capability matrix (condensed)

| Capability | Already built | Route/module | Operational | Missing |
|------------|---------------|--------------|-------------|---------|
| Partner Registry | Yes | `/wealth-partners`, `/admin/wealth-partner-registry` | Yes | — |
| Partner Profile / workspace | Yes | `/wealth-partners/[id]/workspace` | Yes | — |
| Onboarding / lifecycle statuses | Yes | WPR model + UI | Yes | Richer onboarding wizard |
| KYC / legal | Partial | Legal docket panel | Partial | Full KYC workflow desk |
| Activation | Yes | Activation panel | Yes | — |
| Suspension | Yes | Status + Gateway | Yes | One-click Admin control in Entitlements/WPR |
| Hierarchy / network | Yes | Network APIs/UI | Yes | — |
| Territory | Light | city/state fields | Weak | Territory master assignment |
| Products (partner) | Gateway only | Partner masters | Partial | Partner product allow-list admin |
| Targets | profileJson / performance API | COM-001 | Partial | Targets authoring UI |
| Tiers | Template/type | ACCESS templates | Partial | Tier admin |
| Performance | Gateway projection | `/api/partner/performance` | Yes (read) | Admin KPI config |
| Commission | Yes | WPR commissions + commercial % | Yes | — |
| Payout | Partial | Bank + commission | Partial | Payout control centre |
| Access / entitlements | Yes | `/admin/partner-entitlements` | Yes | Placement under Partners & Lenders |
| Referral / Joint / Solo | Yes | Templates + Gateway | Yes | — |
| Txn overrides | Yes | Same admin + DB | Yes | — |
| Entitlement audit | Yes | Admin audits + DB | Yes | — |
| Lender directory/registry | Yes | Partners & Lenders #1–2,5 | Yes | — |
| Credit product mapping | Yes | Module #7 (credit engine) | Yes | Clarify naming vs Wealth Partner |

---

## Final status

🟡 **Audit complete · No code modified · No deploy · STOP**

Await Product Owner decision on navigation relocation / Control Centre composition (recommended: surface **Partner Access & Entitlements** under **Partners & Lenders** without building a second system).

# CO-WP-BAT-002 — Integrated Business Acceptance Testing Build

**Status:** BAT Deployed · **DEVELOPMENT FROZEN**  
**Date:** 2026-08-02  
**Type:** Integrated Product Owner BAT (not production Go-Live certification)

---

## Live URLs

| Surface | URL |
|---------|-----|
| **Wealth Partner App (BAT)** | https://wealth-partner-app.vercel.app |
| Deployment alias | https://wealth-partner-gwgy29obo-rupee-catalyst.vercel.app |
| Inspect | https://vercel.com/rupee-catalyst/wealth-partner-app/ByekGvrZ2j9BnN6kV2AzuL72gxHw |
| Catalyst One API (Partner Gateway) | https://catalyst-one-two.vercel.app |
| C1 deployment alias | https://catalyst-qpqseu6wm-rupee-catalyst.vercel.app |
| C1 Inspect | https://vercel.com/rupee-catalyst/catalyst-one/7FRdeSkKq4ZmLzc3zZr4wQC4GiLg |

---

## Version & build

| Field | Value |
|-------|--------|
| **Version** | `0.8.0` |
| **Label** | Product Owner Integrated BAT |
| **Sprint stamp** | `CO-WP-BAT-002` |
| **WP Deployment ID** | `dpl_ByekGvrZ2j9BnN6kV2AzuL72gxHw` |
| **C1 Deployment ID** | `dpl_7FRdeSkKq4ZmLzc3zZr4wQC4GiLg` |

In-app build mark uses Vite-injected `__WP_BUILD_ID__` / `__WP_BUILD_TIME__` (Settings → About).

---

## Pre-deploy quality

| Check | Result |
|-------|--------|
| TypeScript (`tsc -b`) | ✅ Passed |
| Production build (Vite) | ✅ Passed |
| Lint (`oxlint`) | ✅ Passed |
| Journey verify 001C / 001D / 002 / 003 | ✅ Passed |
| C1 Vercel production build | ✅ Passed |
| WP Vercel production deploy | ✅ Passed |

---

## Implemented modules in this BAT

| Module | Status |
|--------|--------|
| **Home** | Companion Experience Home |
| **Business Home** | Quick / Detailed entry · opportunity list · resume draft · Customers entry |
| **Opportunity Creation Journey** | Customer → Borrower Type → Product → Enterprise sections → Documents → Activities → Submit (001–001D **FROZEN**) |
| **Opportunity Workspace** | Header + Overview / Timeline / Documents / Participants / Activities / Lenders / Communication / Notes / History (002 **FROZEN**) |
| **Customer Workspace** | Directory + Workspace header + Overview / Opportunities / Participants / Documents / Activities / Communication / Notes / History (003) |
| **Navigation** | Bottom nav: Home · Business · Saarthi · Private · More |
| **Saarthi / Private / More** | Functional shells (presentation) |

---

## Known limitations

- Partner Business / Opportunity / Customer DTOs are **`placeholder_partner_business`** — not live Opportunity Registry / Customer Registry SSOT writes.
- Document upload is a **placeholder receipt**, not Document Center authoring.
- Customer / Opportunity workspace projections are **enriched placeholders** until Registry cutover.
- Communication tabs are **reserved** (no messaging logic).
- Lenders tab is **presentation only** (no offer / sanction logic).
- Saarthi / Private / More remain **shells**, not full module journeys.
- Home Experience content remains seed/resolve-based — **EEE not implemented**.

---

## Placeholder APIs (Partner Gateway)

| API | Role |
|-----|------|
| `/api/partner/business` | Business hub |
| `/api/partner/opportunities*` | Opportunity CRUD / submit / docs / activities / timeline |
| `/api/partner/opportunity-journey/config` | Enterprise journey config (sections / masters) |
| `/api/partner/customers` | Customer directory |
| `/api/partner/customers/:id` | Customer Workspace aggregate |
| `/api/partner/customers/search` | Customer search (create journey) |
| `/api/partner/home` | Home experience DTOs |
| `/api/partner/auth/*` | Partner session |

---

## Intentionally deferred (STOP — do not implement until PO completes BAT)

- Enterprise Experience Center / EEE  
- Product Workspace  
- Partner Tier Engine  
- Partner Entitlements  
- Communication Hub (logic)  
- Lender Workspace  
- Document Workspace / Activity Workspace programmes  
- Opportunity Registry / Customer Registry operational cutover  

---

## Agent freeze

After this deployment: **STOP DEVELOPMENT**.  
Await complete Product Owner Business Acceptance Testing before any further implementation.

Rule: `.cursor/rules/co-wp-bat-002.mdc`

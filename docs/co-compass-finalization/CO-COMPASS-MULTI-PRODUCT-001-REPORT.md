# CO-COMPASS-MULTI-PRODUCT-001 — Multi-Product Digital Lending Journeys

**Status:** Implementation complete (isolated/local) · Vercel Preview not claimed  
**Date:** 30 Aug 2026  
**Scope:** COMPASS customer journeys for all currently surfaced Catalyst One lending products  
**Hostinger / Production:** **NOT TOUCHED**

---

## A. Executive summary

COMPASS is no longer a Home Loan-only Catalyst One journey. A **canonical product registry** on Catalyst One maps COMPASS slugs to Enterprise Product Master codes. The existing Customer Gateway (`config` / `start` / `answers` / `analyze` / `lod` / `documents` / `submit`) is product-aware. COMPASS reuses the Home Loan discovery overlay for every active product, with product-specific steps (no duplicated journey engines).

Pre-existing marketing shells for Personal Loan, Business Loan, LAP, Working Capital, and Construction Finance were **not** counted as new work. The new work is gateway integration, product mapping, Contact/Opportunity persistence, documents, and submit/handoff.

---

## B. Product matrix

| Product | Secured | COMPASS Journey | C1 Contact | C1 Opportunity | Documents | Submit | Isolated E2E | Vercel Preview |
|---|---|---|---|---|---|---|---|---|
| New Home Loan | Secured | `/home-loan` | Mobile reuse | `HOME_LOAN` | LOD + upload | Handoff | Yes (regression) | Not claimed |
| Home Loan BT | Secured | `/home-loan?product=home-loan-balance-transfer` | Mobile reuse | `HOME_LOAN_BT` | LOD + upload | Handoff | Yes (regression) | Not claimed |
| Personal Loan | Unsecured | `/personal-loan` | Mobile reuse | `PERSONAL_LOAN` | LOD + upload | Handoff | Isolated script | Not claimed |
| Business Loan | Unsecured | `/business-loan` | Contact + Company | `BUSINESS_LOAN_UNSECURED` | LOD + upload | Handoff | Isolated script | Not claimed |
| LAP | Secured | `/loan-against-property` | Mobile reuse | `LAP` | LOD + upload | Handoff | Isolated script | Not claimed |
| Working Capital | Secured (facility CC/OD/WCTL) | `/working-capital` | Contact + Company | `WORKING_CAPITAL_SECURED` | LOD + upload | Handoff | Isolated script | Not claimed |
| Construction Finance | Secured | `/construction-finance` | Contact + Company | `CONSTRUCTION_FINANCE` | LOD + upload | Handoff | Isolated script | Not claimed |
| Project Finance | Secured | `/construction-finance?product=project-finance` | Contact + Company | `PROJECT_FINANCE` | LOD + upload | Handoff | Isolated script | Not claimed |

**Intentionally not activated (future / no COMPASS surface):** Vehicle Loan, Commercial Vehicle, LRD, Equipment/Machinery, LAS, Gold, Education, Doctor, Professional, MSME, Trade/Export/Invoice/Bill Discounting, Commercial Purchase/Mortgage.

Working Capital facilities exposed: **Cash Credit, Overdraft, Working Capital Term Loan** (catalog products). Bank Guarantee / LC remain Trade Finance catalog entries without a COMPASS journey.

---

## C. Architecture

```
Product Registry (C1 SSOT)
  → IDC projection (borrower-kind + product family)
  → Shared journey engine (gateway)
  → COMPASS discovery overlay (presentation)
  → Contact (mobile) / Company (name reuse)
  → Opportunity (product code, source website_compass)
  → Answers / Documents / Submit / Operational handoff
```

- **Secured/unsecured** comes from Enterprise Product Master (`isSecured`), stamped onto snapshot `compassLendingType` and product fields `lendingType`.
- **Individual vs business:** COMPASS identity remains the mobile Contact so session isolation stays valid. Business products also create/reuse an ECM Company and set `opportunity.companyId`.
- COMPASS owns routes, copy, and step order. Catalyst One owns product codes, IDC, LOD, recommendations, and handoff.

---

## D. Files changed (by subsystem)

- **Registry:** `src/constants/compass-customer-gateway/product-registry.ts`
- **Gateway:** journey service, config projection, session errors, start/config routes
- **IDC:** WC facility + project information sections; product-family resolver
- **COMPASS UI:** shared `ProductJourneyShell`, product-aware discovery steps, borrow nav
- **Tests:** routing verifier, extended isolated E2E matrix, updated engineering gates

---

## H. Preview status

**Not deployed in this sprint.** Prior unique Vercel previews remain SSO-gated and C1 Preview still lacks `DATABASE_URL`. Isolated Postgres is the verification environment.

Required Preview env **names** (values not printed): `DATABASE_URL`, `DIRECT_URL`, `ENTERPRISE_PERSISTENCE_MODE`, `COMPASS_GATEWAY_API_KEY`, `COMPASS_JOURNEY_SESSION_SECRET`, `CATALYST_ONE_API_URL`, `COMPASS_OTP_ENABLED`.

---

## J. Production safety

| Question | Answer |
|---|---|
| Production deployed? | **NO** |
| Hostinger changed? | **NO** |
| Production DB accessed/mutated? | **NO** |
| Production env vars changed? | **NO** |

# CO-PRODUCT-REVIEW-001 — Product Management Architectural Review

**Code:** CO-PRODUCT-REVIEW-001  
**Nature:** Architectural findings only — no implementation · no fixes  
**Date:** 2026-08-06  

Governing references:  
`.cursor/rules/enterprise-product-lender-master.mdc` ·  
`docs/co-admin-005/CO-ADMIN-005-PRODUCT-LENDER-MASTER-READINESS-REPORT.md` ·  
CO-ADMIN-006 Product Master · CO-LM-004 Lender Product Catalogue  

---

## Executive summary

Catalyst One **does** have an administrator Product–Lender mapping surface (the **Product–Lender Matrix**).  
Lender-specific **commercial** configuration (ROI, fees, LTV, tenure, partial eligibility) lives primarily on **Lender Product Programs**, not on the matrix checkboxes.  
**Documents required per lender–product** are **not** configured in that matrix/program wizard as a first-class pack.  
A separate Administration entry labelled **Partner Product Mapping** (Credit Risk) is a **placeholder**, not the enterprise matrix.

---

## 1. Where can an administrator assign products to a lender?

**Primary (approved / operational):**

| Surface | Path | What it does |
|---|---|---|
| **Product–Lender Matrix** | `/admin/product-lender-matrix` | Checkbox matrix: which lenders offer which Enterprise Products |
| Admin Console entry | Administration → Masters → **Product–Lender Matrix** | Same href (`ROUTES.ADMIN_PRODUCT_LENDER_MATRIX`) |

**Persistence:** updates Lender Registry field `productsSupported` (product codes) via `PUT /api/admin/product-lender-matrix`.  
Evidence: `product-lender-matrix-workspace.tsx` · `src/app/api/admin/product-lender-matrix/route.ts` · CO-ADMIN-005 readiness report.

**Related (not the matrix):**

- **Lender Registry** admin maintains lender masters; may show supported-product counts / related fields.  
- Matrix may auto-create a **program stub** when a product is newly linked (per CO-ADMIN-005 readiness notes).

---

## 2. Where can lender-specific product configuration be performed?

**Primary commercial configuration surface:**

| Surface | Path / entry | Role |
|---|---|---|
| **New Product Program Wizard** | Lender Registry admin → create program | Lender + Product + commercial fields |
| **Product Programs** desk | `/admin/product-programs` | Lists programs; directs create/edit to Lender Registry |
| **Lender Program Portal** | `/admin/lender-program-portal` | Lender self-service submit / approve programs (CO-LEND-001) |

Evidence: `new-product-program-wizard.tsx` (ROI %, Processing Fee %, Max LTV %, Max Tenure, borrower/employment, states, TAT, notes) · Prisma `EnterpriseLenderProgram` · `product-programs-workspace.tsx`.

**Not the place for deep commercial config:** Product–Lender Matrix — it only toggles **offer capability** (`productsSupported`), not ROI/LTV/docs.

**Parallel / legacy commercial catalogue (read-oriented):**

- `enterprise-lender-product-catalogue` (`LENDERS_BY_PRODUCT`) — static master-data offers (rate, max amount, tenure, processing fee strings) for directory / marketing / insights (CO-LM-004). Not the admin matrix UI.

---

## 3. Where are ROI · Processing Fee · LTV · Tenure · Eligibility · Documents configured?

| Parameter | Current configuration home | Evidence | Completeness |
|---|---|---|---|
| **ROI** | `EnterpriseLenderProgram.roiPercent` (+ min/max columns) via Product Program wizard; also static catalogue `rate`/`rateNum`; Deal-level ROI edit on deals | Prisma `enterprise_lender_programs` · wizard · `edit-deal-dialog.tsx` · catalogue types | **Program-level: yes** · Deal override: yes · Unified admin deep-edit beyond wizard: partial |
| **Processing Fee** | Program `processingFeePct` / `processingFeeLabel`; catalogue `processingFee` string | Prisma · wizard · catalogue | **Program-level: yes** · Not a full fee-schedule engine |
| **LTV** | Program `maxLtvPercent`; separate Credit Risk rule seed e.g. `PROP_LTV_MAX` | Prisma · wizard · `rules-seed.ts` | **Program max LTV: yes** · Policy LTV: Credit Risk (separate) |
| **Tenure** | Program `maxTenureMonths`; catalogue `tenure` string; Deal `tenure` | Prisma · wizard · deal edit | **Program max tenure: yes** |
| **Eligibility** | **Partial** on program: `borrowerType`, `employmentType`, `eligibleStates` / `eligibleCities`, `minCibil`, `minIncomeAmount`; Product Master segments; Credit Risk eligibility models / Partner Product Mapping **placeholder** | Prisma program fields · Credit Risk admin routes | **Not a single lender–product eligibility studio** |
| **Documents** | **Not** on Product–Lender Matrix or Program Wizard. Lender-level `EnterpriseLenderDocument`; org Document Type Master; Opportunity Document Center checklists | Prisma `enterprise_lender_documents` · Document Types admin · Document Center | **Lender–product document pack mapping: missing / unfinished** |

---

## 4. Does a Lender Product Mapping module exist?

**Yes — under the enterprise name Product–Lender Matrix** (CO-ADMIN-005).

It is the approved Product × Lender **capability mapping** module (which products a lender supports).

**Also named similarly but different:**

| Name in Admin Console | Reality |
|---|---|
| Product–Lender Matrix | **Real** matrix UI + API |
| Partner Product Mapping (Credit Risk) | **Placeholder** page (`CreditRiskSectionPlaceholder`) at `/admin/credit-risk-engine/products` |

---

## 5. If it exists — where is it accessible?

| Access | Status |
|---|---|
| Route | `/admin/product-lender-matrix` |
| Administration Console → Masters | **Product–Lender Matrix** module card |
| Primary left nav (Column 1) | **No** dedicated item (admin via Administration) |
| Product Library / Product Master | Separate: `/admin/product-library` · `/admin/product-library/master` (products themselves, not lender mapping) |
| Product Programs | `/admin/product-programs` (commercial programs list) |

Requires `ENTERPRISE_PERSISTENCE_MODE=prisma` for the matrix API (route guard).

---

## 6. Intentional gap vs unfinished implementation?

| Capability | Verdict |
|---|---|
| Assign products to lenders (capability) | **Completed** (intentional architecture — Matrix) |
| Separate commercial programs per lender–product | **Completed / intentional** (Programs ≠ Matrix) |
| Configure ROI / fee / LTV / tenure on programs | **Implemented** in schema + creation wizard; deeper ongoing maintenance UX may be unfinished beyond create/list |
| Full eligibility studio per lender–product | **Partially implemented** (program fields + Credit Risk elsewhere) — **unfinished** as a unified Product Management desk |
| Lender–product required **Documents** packs | **Missing / unfinished** relative to a full Product Management vision — not an intentional “documents live only on Opportunity” substitute for lender program packs |
| Credit Risk “Partner Product Mapping” | **Unfinished placeholder** (not the enterprise matrix) |
| Static Lender Product Catalogue | **Intentional** parallel SSOT for directory/marketing/insights (CO-LM-004), pending fuller convergence with durable programs |

**Bottom line:**  
A **Lender Product Mapping** module **exists** and is **intentional** for offer capability.  
A **complete Product Management suite** that configures commercial terms + eligibility + documents in one place is **only partially finished**: commercials sit on Programs; documents/eligibility are fragmented or placeholder.

---

## Architecture map (current)

```text
Product Master (/admin/product-library/master)
        │
        ▼
Product–Lender Matrix  ──►  lender.productsSupported  (capability only)
        │
        ▼
Lender Product Programs (EnterpriseLenderProgram)
        ├── ROI / Fee / LTV / Tenure / partial eligibility
        └── (documents packs NOT here)

Parallel: enterprise-lender-product-catalogue (static offers)
Parallel: Credit Risk products page (placeholder)
Parallel: Document Types / Document Center (transaction docs, not matrix)
```

---

## Status

Architectural review complete. **No code changes. No implementation.**

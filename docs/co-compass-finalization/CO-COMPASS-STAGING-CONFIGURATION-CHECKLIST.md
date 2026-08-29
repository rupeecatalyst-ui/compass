# COMPASS Staging Configuration Checklist

**Purpose:** Representative staging-data requirements for HL and HLBT journeys.  
**Scope:** Configuration/master-data availability only — no customer data, no remote writes.  
**Environment inspected:** Codebase SSOT + isolated E2E bootstrap (`compass-e2e-test` org only).

---

## Home Loan (`HOME_LOAN` / `home-loan`)

| Requirement | Codebase SSOT | Isolated E2E bootstrap | Staging / production expectation |
|-------------|---------------|------------------------|----------------------------------|
| Product master | `src/constants/enterprise-product-master/canonical-catalog.ts` (`HOME_LOAN`) | Not seeded | **Must exist** in Enterprise Product Registry (Prisma) for full LOD/recommendation readiness |
| IDC / journey configuration | `buildPartnerOpportunityJourneyConfig()` → `src/lib/enterprise-initial-data-collection/` | **Present** via enterprise IDC catalog | **Configured** — COMPASS gateway projects IDC fields at runtime |
| Required readiness answers | Chanakya `deriveChanakyaOpportunityRecommendationsFromOptions` | Partial capture in E2E | **Lending type**, income, property, loan amount must be captured for `ready` recommendations |
| Lender registry | `EnterpriseLender` + published programs | **Not seeded** in E2E | **Published lenders** required for recommendation cards (`status: ready`) |
| Chanakya recommendation inputs | `compass-recommendations.service.ts` | Returns `pending` when lenders/readiness incomplete | Configure lender directory + readiness fields |
| Product LOD template | EDIE / `generate-lod` / `projectCompassLod` | **0 items** in minimal E2E | **Product document definitions** + EDIE checklist required for non-empty LOD |
| Advantage commercial configuration | `computeCompassAdvantage()` | Returns `not_available` (correct) | **Commercial engine configuration** required for indicative Advantage amounts |

---

## Home Loan Balance Transfer (`HOME_LOAN_BT` / `home-loan-balance-transfer`)

| Requirement | Codebase SSOT | Isolated E2E bootstrap | Staging / production expectation |
|-------------|---------------|------------------------|----------------------------------|
| Separate product master | `canonical-catalog.ts` (`HOME_LOAN_BT`) | Not seeded | **Distinct `HOME_LOAN_BT` product** in registry |
| Balance-transfer IDC | IDC catalog BT fields (`visibleWhenProductFamilies`, transaction type) | **Present** via gateway mapping | **BT-specific fields** (current lender, outstanding amount) in IDC |
| Existing-loan / bank fields | COMPASS answers → `answersToSnapshotFields` | Captured in E2E | **Mandatory for BT readiness** |
| Required readiness answers | Same Chanakya engine, BT product code | `pending` in E2E | Lending type + BT fields + income |
| Lender registry | Org-scoped published lenders | Not seeded | Published HLBT-eligible lenders |
| HLBT LOD template | EDIE projection per product | **0 items** in E2E | HLBT-specific document checklist in EDIE |
| Advantage commercial configuration | `computeCompassAdvantage()` with BT product code | `not_available` | Commercial engine BT rules |

---

## Gateway environment (staging deploy — not configured in this sprint)

| Variable | Required for |
|----------|----------------|
| `COMPASS_GATEWAY_API_KEY` | C1 ↔ COMPASS BFF authentication |
| `COMPASS_JOURNEY_SESSION_SECRET` | Journey session token signing |
| `CATALYST_ONE_API_URL` | COMPASS BFF upstream |
| `ENTERPRISE_PERSISTENCE_MODE=prisma` | Durable documents, EAR, notifications |
| Org resolution | Production: pilot org (`rupee-catalyst`); staging may use dedicated org slug |

---

## What isolated E2E proves without staging seed

- IDC authority, journey lifecycle, document upload (PDF/PNG), submit handoff, security boundaries
- Truthful `pending` recommendations, `not_available` Advantage, empty LOD when templates/lenders absent

## What staging must configure before business-facing HL/HLBT launch

1. Enterprise Product Registry entries for `HOME_LOAN` and `HOME_LOAN_BT`
2. Published lender programs / lender directory for the gateway org
3. EDIE / document checklist templates per product
4. Advantage commercial rules (when Product Owner authorises indicative amounts)
5. COMPASS + Catalyst One gateway secrets on Vercel (separate from this local E2E)

**No remote configuration was read or altered during this checklist.**

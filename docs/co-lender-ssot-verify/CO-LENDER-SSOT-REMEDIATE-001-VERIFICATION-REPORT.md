# CO-LENDER-SSOT-REMEDIATE-001 — Verification Report

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Date:** 2026-08-05  
**Scope:** Remediation of CO-LENDER-SSOT-VERIFY-001 findings  
**Canonical SSOT:** Enterprise Lender Registry (ELR) — Prisma `enterprise_lenders` only for every lender selector.

---

## Clarification — Business Completion BT → Company Registry

**Observation (pre-fix):** Balance Transfer “Current Lending Institution” in Business Completion used `OrganizationRegistrySelect`, which searches the **Enterprise Company Registry** (ECM companies), not lenders.

**Architectural meaning:** That was a **wrong registry**, not an intentional dual SSOT. BT current lending institution is a **lender**, so it must use ELR.

**Action taken:** Replaced with `EnterpriseLenderRegistrySelect` (ELR only). Company Registry remains correct for true company/organization fields elsewhere.

---

## What changed

| Area | Change |
|------|--------|
| Server query | `queryLenders` pageSize ceiling raised **200 → 5000** |
| Selection client | New `searchEnterpriseLendersForSelection` — API only, throws + no Soft Go-Live |
| Institution / BT select | Server-side search; scrollable full match list; Retry on error |
| Deal `EnterpriseLenderSearch` | pageSize 5000; removed 40-row display slice |
| Published directory | Soft Go-Live merge **removed**; API-only async list |
| Partner Gateway | Search returns all matches (limit 5000); empty `q` returns full active set |
| Wealth Partner `PartnerLenderSelect` | Loads full/search set from Partner API; error state |
| Business Completion BT | Switched Company → **ELR** |
| Legacy ECM `masters.lender` | Emptied (`[]`) — no hardcoded bank list |
| Loan create default | Removed invented `"State Bank of India"` |
| Lenders workspace add | ELR select by Registry `id` (not display-name Select) |
| ELW select-lender | No Soft Go-Live local lookup |
| Prisma mode client | `queryLenders` / `getLender` refuse Soft Go-Live fallback |

---

## Every lender selector — SSOT confirmation

| Surface | Component / API | SSOT |
|---------|-----------------|------|
| Lender Employee Institution | `BankerInstitutionSelect` → `EnterpriseLenderRegistrySelect` | **ELR API only** |
| Existing Loan / BT (Lead, Loan, Credit) | `ExistingLoanInformationSection` → ELR select | **ELR API only** |
| Business Completion BT | `EnterpriseLenderRegistrySelect` | **ELR API only** |
| Deal Identify / Edit Deal | `EnterpriseLenderSearch` → `searchActiveLenders` | **ELR API only** |
| LIFE / Competition / Move to Deal | `listCanonicalEnterpriseLenderOptionsAsync` | **ELR API only** |
| Policy builder / Program portal | `searchActiveLenders` | **ELR API only** |
| Lending Programs / Matrix / Admin | `lenderRegistryClient` / server service | **ELR Prisma** |
| Wealth Partner App | `PartnerLenderSelect` → `/api/partner/masters/lenders` | **ELR Prisma** |
| Legacy execution Lenders tab | `EnterpriseLenderRegistrySelect` | **ELR API only** |

### Intentionally not lender selectors

| Control | Registry |
|---------|----------|
| Organization / Company pickers | Enterprise Company Registry |
| Product Master | Product Registry |
| Marketing / branding seed catalogs | Non-selector seed/brand assets (not used as Institution dropdown) |

---

## Caps removed

| Old cap | New behaviour |
|---------|----------------|
| Client `pageSize: 200` | Selection uses **5000** (full current registry) |
| Empty list `8 × 3 = 24` | All loaded matches shown; list scrolls (`max-h-72`) |
| Search max **8** | Not applied to lender selection |
| Partner search max **12** | All matches (≤5000) |
| Soft Go-Live silent fallback | Error + Retry |

---

## Data protection confirmation

- No Prisma `delete` / truncate / reseed of `enterprise_lenders`
- No ID rewrites or mapping corruption
- Additive code + query limit changes only

---

## Verify

```bash
npm run verify:co-lender-ssot-remediate-001
```

TypeScript: frontend `tsc --noEmit` and Wealth Partner `tsc -b` expected green after this change set.

---

## Remaining notes for BAT

1. Open Institution (Lender) on a banker → focus dropdown → confirm **full active set** (~278) is scrollable / searchable.  
2. Force API failure (offline) → confirm **error + Retry**, not a short Soft Go-Live list.  
3. Wealth Partner BT / lender fields → type and confirm matches beyond 12.  
4. Soft Go-Live localStorage bag may still exist for seed tooling but must not populate selection UIs in prisma mode.

**STOP for Product Owner BAT.** Deploy only when instructed.

# CO-LENDER-SSOT-VERIFY-001 — Enterprise Lender Lookup Architecture Verification

**Status:** Investigation Complete · Awaiting Product Owner Review  
**Priority:** P0  
**Date:** 2026-08-05  
**Scope:** Architecture verification only — **no code changes · no data migration · no deploy**

---

## Executive verdict

| Question | Answer |
|----------|--------|
| **Canonical SSOT** | **Enterprise Lender Registry (ELR)** — Prisma `enterprise_lenders` |
| **Institution (Lender) dropdown** | **YES — reads ELR** via `BankerInstitutionSelect` → `EnterpriseLenderRegistrySelect` → `lenderRegistryClient.queryLenders` → `GET /api/lender-registry/lenders` |
| **Why list may look incomplete** | **Not wrong SSOT.** ELR has **278** dropdown-eligible lenders, but the control loads only **pageSize 200**, shows **24** on focus and **8** on search — so the list cannot appear complete. |
| **Hardcoded ECM lender catalog** | Still exists (`hdfc`/`sbi`/…) but **Institution field bypasses it** (CO-BUG-005) |
| **Platform consistency** | **Mostly ELR**, with known non-SSOT / dual-path exceptions (below) |

---

## 1. Single Source of Truth (SSOT)

**Enterprise Lender Registry (ELR)** is the constitutional SSOT for lending institutions in Catalyst One.

| Layer | Path |
|-------|------|
| Types | `src/types/enterprise-lender-registry.ts` |
| Client facade | `src/lib/enterprise-lender-registry/index.ts` (`lenderRegistryClient`) |
| Published helpers | `src/lib/enterprise-lender-registry/published-directory.ts` |
| Soft Go-Live fallback store | `src/lib/enterprise-lender-registry/local-store.ts` (`compass:enterprise-lender-registry-v1`) |
| Server service | `server/services/lender-registry/lender-registry.service.ts` |
| Server repository | `server/repositories/lender-registry/lender-registry.repository.ts` |
| Prisma model / table | `EnterpriseLender` → **`enterprise_lenders`** |

### Published / active definition (canonical helpers)

From `published-directory.ts`:

```
!isDeleted
AND status === "active"
AND enabled === true
AND lifecycleStatus === "active"
AND (operationalStatus absent OR === "active")
```

**Institution dropdown** applies `status` + `enabled` + `lifecycleStatus` but **does not** filter `operationalStatus`.

---

## 2. Registry owner

| Concern | Owner |
|---------|--------|
| **Business capability** | Enterprise Lender Registry |
| **Admin workspace** | Administration → Lender Registry (`/admin/lender-registry`) |
| **Ops directory** | Enterprise Lender Directory (`/lenders`) — projection of ELR |
| **API module** | `/api/lender-registry/**` |
| **Data owner** | Postgres `enterprise_lenders` when `ENTERPRISE_PERSISTENCE_MODE=prisma` |

---

## 3. Database entity / table

- **Model:** `EnterpriseLender`
- **Table:** `enterprise_lenders`
- **Primary key:** `id` (cuid)
- **Immutable business code:** `code` (`LND000001` format; unique per organization)
- Related: `EnterpriseLenderProgram`, `EnterpriseLenderContact`, `EnterpriseLenderDocument`, categories

---

## 4–7. Institution (Lender) dropdown — exact trace

### Call chain

```
role-templates.ts (lender_employee.institution, masterDomain:"lender")
  → contact-workspace-modal.tsx / eld-employee-slide-over.tsx
    → BankerInstitutionSelect (banker-lender-registry-fields.tsx)
      → EnterpriseLenderRegistrySelect (enterprise-lender-registry-select.tsx)
        → lenderRegistryClient.queryLenders({
             page: 1, pageSize: 200,
             status: "active", enabled: true, lifecycleStatus: "active"
           })
          → GET /api/lender-registry/lenders?...
            → lenderRegistryService.queryLenders (Prisma)
          OR (if API null) Soft Go-Live localStorage store
```

| Check | Result |
|-------|--------|
| Reading Enterprise Lender Registry? | **YES** (primary) |
| Placeholder data? | **NO** for options source |
| Local state as SSOT? | **NO** — local state only caches API result |
| Seed / ECM catalog (`hdfc`/`sbi`)? | **NO** for this control |
| Soft Go-Live localStorage? | **YES as silent fallback** if API fails |
| Cached Tier-0? | Not on this path |

### Filters preventing lenders from appearing

| Filter | Applied on Institution dropdown? |
|--------|----------------------------------|
| `isDeleted = false` | Yes (API / client) |
| `status = active` | **Yes** |
| `enabled = true` | **Yes** |
| `lifecycleStatus = active` | **Yes** |
| `operationalStatus = active` | **No** (Partner / published helpers are stricter) |
| Soft Go-Live / BF_* exclusion | **No** (Deal canonical path excludes these) |
| **UI empty-list cap** | **Yes — max 24 without typing** |
| **UI search result cap** | **Yes — max 8 matches** |
| **API pageSize** | **200** (lenders beyond page 1 not loaded) |

### Search behaviour

- Client-side filter on loaded page (label, displayName, legalName, shortName, code, aliases).
- Works for lenders **already loaded** into the 200-item page.
- Enterprise Search Autocomplete UX: results only while open; max **8** when typing.
- **Risk:** If registry has >200 active lenders, later pages never load → search cannot find them.
- **UX risk:** Opening the field without typing shows only first **24** of the loaded set → appears “incomplete” even when more exist in memory.

---

## 8–9. Live registry counts (read-only Prisma query)

Queried 2026-08-05 against connected Postgres (`enterprise_lenders`). **No writes.**

| Metric | Count |
|--------|------:|
| **Total rows** | **282** |
| Not deleted | 282 |
| Soft-deleted | 0 |
| **status = active** | **278** |
| status = inactive | 4 |
| **enabled = true** | **278** |
| enabled = false | 4 |
| **lifecycleStatus = active** | **280** |
| lifecycleStatus = draft | 2 |
| **operationalStatus = active** | **278** |
| operationalStatus = inactive | 4 |
| **Eligible for Institution dropdown** (`active` + `enabled` + `lifecycle active`) | **278** |
| Strict published (also `operationalStatus=active`) | 278 |
| Unique `id`s / unique `code`s | 282 / 282 |
| Duplicate codes | **0** |

### Excluded from Institution dropdown (4)

| Code | Name | Why excluded |
|------|------|----------------|
| `BF_ABHYUDAYA_COOPERATIVE` | Abhyudaya Cooperative Bank | inactive / disabled |
| `LND-P2A-HDFC` | HDFC | inactive / draft |
| `LND-P2A-ICICI` | ICICI | inactive / disabled |
| `LND-P2A-SBI` | SBI | inactive / draft |

### Primary incompleteness root cause (architecture)

| Layer | Cap | Effect vs 278 eligible |
|-------|-----|-------------------------|
| API / client `pageSize: 200` | **200** | **~78 active lenders never loaded** into the control |
| Empty focus list | **24** (`8 × 3`) | Only first 24 of loaded set shown until user types |
| Typed search results | **8** | Max 8 matches displayed (enterprise autocomplete standard) |

So the dropdown **is** wired to ELR, but **cannot present the complete registry** under current pagination + autocomplete caps.

---

## 10–12. Filters / search / unique IDs

| # | Finding |
|---|---------|
| **10** | Status / enabled / lifecycle filters exclude 4 inactive rows (correct). **Pagination (200) + UI caps (24/8) hide most of the 278 eligible set.** |
| **11** | Client-side search only over the **loaded ≤200** rows; max **8** results shown. Lenders on page 2+ are unsearchable in this control. |
| **12** | **Yes** — every non-deleted lender has unique `id` (cuid) and unique `code`. No duplicate codes. Soft Go-Live `elend-*` IDs are separate and must not be Deal FKs. |

---

## Enterprise consistency matrix

| Surface | Uses ELR Prisma SSOT? | Notes |
|---------|----------------------|-------|
| Lender Employee Institution | **YES*** | API + Soft Go-Live fallback |
| Opportunity LIFE / Competition | **YES** | `listCanonicalEnterpriseLenderOptionsAsync` (API only) |
| Deal Identify / Edit Deal | **YES** | `EnterpriseLenderSearch` → `searchActiveLenders` (strict API) |
| Lending Programs | **YES*** | `lenderRegistryClient` |
| Product–Lender Matrix | **YES** | Server `lenderRegistryService` |
| Policy builder | **YES** | `searchActiveLenders` |
| Lender Program Portal | **YES** | Partner + admin APIs |
| Wealth Partner App | **YES** | `GET /api/partner/masters/lenders` → Prisma |
| BT Existing Lender (Lead/Loan) | **YES*** | Same `EnterpriseLenderRegistrySelect` |
| Legacy lenders workspace | **Partial** | Display **names**, not always IDs |
| Business completion BT | **NO** | `OrganizationRegistrySelect` (Company Registry) |
| ECM Tier-2 lender catalog | **NO** | Hardcoded `hdfc`/`sbi`/… — legacy |
| Organization registry seed | **NO** | Demo BT institutions |
| Product catalogue / marketing | **NO** | Hardcoded commercial / site lists |
| ELD demo programs | **NO** | Hardcoded demo offers |

\*YES\* = intended Prisma via API; Soft Go-Live if API unavailable.

---

## Duplicate / placeholder / hardcoded masters found

| Item | Path | Risk |
|------|------|------|
| Soft Go-Live localStorage | `local-store.ts` | Parallel IDs if API down |
| ECM lender seed | `masters.ts` `lender: [hdfc,sbi,…]` | Legacy; Institution UI bypassed |
| Org registry seed | `organization-registry-seed.ts` | Wrong registry for BT in one path |
| Product catalogue | `enterprise-lender-product-catalogue/catalogue.ts` | Name-keyed, not ELR FK |
| Marketing `LENDER_PARTNERS` | site constants | Public marketing only |
| Loan create default name | `loan-create-form-dialog.tsx` may default first published **name** / `"State Bank of India"` | Display invent risk (CAD-2026-001) |

---

## Recommended remediation plan (for PO approval — **do not implement yet**)

1. **Treat incompleteness as pagination/UX, not wrong master:** Replace client pageSize-200 + empty-list slice with **server-side search** against full ELR (type-ahead over all 278+).  
2. **Keep autocomplete density policy** (max visible rows) but ensure **every lender is findable by search**, not only the first 200.  
3. **Unify published filter:** Align Institution dropdown with `isLenderPublishedAndActive` (include `operationalStatus`) **or** document intentional difference.  
4. **Remove Soft Go-Live silent fallback** for banker Institution when `ENTERPRISE_PERSISTENCE_MODE=prisma` (fail closed with error, never alternate IDs).  
5. **Retire dual masters:** ECM `masters.ts` lender domain, org-seed BT institutions, catalogue name keys → resolve only via ELR `id`.  
6. **Fix non-SSOT screens:** Business completion BT; legacy lenders-workspace name identity; loan-create hardcoded default name.  
7. **Do not bulk-activate** the 4 inactive provisional rows unless PO directs — they are correctly excluded.

---

## Stop

Investigation only. **No code modified. No data migrated. No deploy.**  
Await Product Owner review before any remediation sprint.

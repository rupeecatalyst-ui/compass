# CO-QA-002 Round 2 — Production Failure Evidence Report

**Status:** OPEN — not certified  
**Customer:** Mehernosh Dastoor (BAT label: “Mehrrosh Dastoor”)  
**Opportunity:** `OPP-2026-000041` / `cms1q4k3h0003l3047et4d0qt`  
**Evidence captured:** 2026-07-27 (production Postgres + repository code)

---

## Phase 1 — Database Proof

### Question

Did the BAT DELETE operation actually persist in the database?

### Answer for the production BAT path

**NO.**

### Evidence A — State of the three production Deals (readonly, after BAT / before lasting soft-delete)

Script: `scripts/co-qa-002-round2-readonly-state.mjs`

| Deal ID | Deal # | Lender | Opportunity ID | `is_deleted` | `deleted_at` | `updated_at` |
|---------|--------|--------|----------------|--------------|--------------|--------------|
| `cms1qhjsy0005l304sxcmqo0g` | DEAL-2026-000063 | Axis Bank | `cms1q4k3h0003l3047et4d0qt` | **false** | **null** | 2026-07-27T16:55:33.721Z* |
| `cms1qhpel000bl304kiosj4cw` | DEAL-2026-000064 | HDFC Bank | `cms1q4k3h0003l3047et4d0qt` | **false** | **null** | 2026-07-27T16:24:00.646Z |
| `cms1qhwhd000hl304u2vbh6ga` | DEAL-2026-000065 | ICICI Bank | `cms1q4k3h0003l3047et4d0qt` | **false** | **null** | 2026-07-26T11:53:00.022Z |

\*Axis `updated_at` / `row_version` reflect a Round-2 probe soft-delete + restore (see Evidence C). BAT-era proof is Evidence B.

### Evidence B — Soft-delete ledger for these Deal IDs

```json
softDeleteRecords: []
softDeleteAudits: []
```

`enterpriseDealRepository.softDeleteDeal` **always** writes:

- `enterprise_soft_delete_records`
- `enterprise_soft_delete_audits`
- `enterprise_deals.is_deleted = true` + `deleted_at`

File: `server/repositories/enterprise-deal/enterprise-deal.repository.ts` (`softDeleteDeal`)

Empty ledger + `is_deleted = false` ⇒ **application soft-delete never committed for these Deal IDs.**

### Evidence C — When UPDATE runs, persistence works (control)

Script: `scripts/co-qa-002-round2-phase1-db-proof.mjs`  
Target: Axis `cms1qhjsy0005l304sxcmqo0g`

Immediately after soft-delete UPDATE:

| Field | Value |
|-------|--------|
| Deal ID | `cms1qhjsy0005l304sxcmqo0g` |
| Opportunity ID | `cms1q4k3h0003l3047et4d0qt` |
| `is_deleted` | **true** |
| `deleted_at` | `2026-07-27T16:55:32.380Z` |
| `updated_at` | `2026-07-27T16:55:32.380Z` |

Active list query (`is_deleted = false` ∧ `lender_id IS NOT NULL`) ⇒ Axis **absent**.  
Probe then restored Axis so BAT inventory remains intact.

**Control answer:** Did soft-delete persist when UPDATE runs? **YES.**

**BAT answer:** Did Mehrrosh’s Delete persist? **NO** — because that UPDATE / repository soft-delete never ran.

### Why BAT Delete did not persist (evidence, not assumption)

1. Postgres still shows `is_deleted = false` for all three Deals after reported successful Delete + refresh failure.  
2. Soft-delete registry tables for these entity IDs are empty.  
3. UI code still contains a Remove path that filters React state **without** requiring `DELETE` success first (see Phase 6).

---

## Phase 2 — Registry Trace (every service that returns Enterprise Deals)

| # | File | Function | Query / filter | Filters `isDeleted`? | Can return deleted Deals? |
|---|------|----------|----------------|----------------------|---------------------------|
| 1 | `server/repositories/enterprise-deal/enterprise-deal.repository.ts` | `listByOpportunity` | `findMany` where `opportunityId`, `lenderId not null`, **`isDeleted: false`** | YES | NO |
| 2 | same | `findById` | `findFirst` by id; default **`isDeleted: false`** unless `includeDeleted` | YES (default) | Only if `includeDeleted: true` |
| 3 | same | `searchDeals` | `findMany` + filters; **`isDeleted: false`** unless `includeDeleted` | YES (default) | Only if `includeDeleted: true` |
| 4 | same | `findByLegacyLoanFileId` / `findManyByLegacyLoanFileId` | `isDeleted: false` | YES | NO |
| 5 | same | `findByDealNumber` | `isDeleted: false` | YES | NO |
| 6 | `server/services/enterprise-opportunity/index.ts` | `listDealsForOpportunity` | calls `listByOpportunity` | YES | NO |
| 7 | `server/services/enterprise-deal/enterprise-deal.service.ts` | `searchDeals` | repository `searchDeals` | YES (default) | Only if request sets includeDeleted |
| 8 | `server/services/enterprise-opportunity/index.ts` | `resolveFreshLoginOpportunityIds` | `enterpriseDeal.findMany` **`isDeleted: false`** | YES | NO |
| 9 | `server/services/enterprise-metrics-engine/index.ts` | live KPI deal queries | `findMany` **`isDeleted: false`** | YES | NO |

**Pipeline card load (canonical):**

`GET /api/enterprise-opportunities/:opportunityId/deals`  
→ `enterpriseOpportunityService.listDealsForOpportunity`  
→ `enterpriseDealRepository.listByOpportunity` (`isDeleted: false`)

**Conclusion:** Active list APIs do **not** resurrect soft-deleted rows. Resurrection after Mehrrosh BAT requires the Deal to still be **active** in Postgres — which Evidence A/B prove.

---

## Phase 3 — API Trace

### Limitation (stated as fact)

No browser Network HAR was captured from Mehrrosh’s BAT session. Therefore an exact per-click request list cannot be invented.

### Evidence that replaces a HAR for the resurrection question

1. Soft-delete ledger empty ⇒ successful `DELETE /api/enterprise-deals/:id` (repository path) did **not** complete.  
2. After refresh, cards return ⇒ a list/hydrate call returned the same Deal IDs.  
3. Pipeline hydrate code path (Phase 4) always loads siblings via:

```text
GET /api/enterprise-opportunities/{opportunityId}/deals
```

### Resurrection point (first response that must contain the deleted Deal)

**`GET /api/enterprise-opportunities/cms1q4k3h0003l3047et4d0qt/deals`**

Because `is_deleted` remained `false`, that response includes the Deal the UI had visually removed.

### Required BAT Network capture (still mandatory for certification)

On next Delete attempt, capture:

```text
[?] DELETE /api/enterprise-deals/{dealId}
    → status + body.isDeleted
↓
GET /api/enterprise-opportunities/{oppId}/deals
    → whether dealId present
↓
any further GET /api/enterprise-deals/{id}
```

If DELETE is missing or `isDeleted !== true`, that is the failure.  
If DELETE succeeds and list still returns the id, that would contradict Phase 1 control (not observed).

### HTTP login probe note

`scripts/co-qa-002-round2-http-delete-proof.mjs` against `https://catalyst-one-two.vercel.app` returned `LOGIN 401 INVALID_CREDENTIALS` for frozen cert credentials — API-level DELETE could not be exercised from this script in Round 2. DB control (Evidence C) still proves persistence when UPDATE runs.

---

## Phase 4 — Hydration Trace

| Location | What it loads | Source | Can deleted Deal reappear? |
|----------|---------------|--------|----------------------------|
| `loadDealPipelineRuntime` (`deal-pipeline-runtime.ts`) | Anchor Deal + all Opportunity sibling Deals | `getDeal` + `listDealsByOpportunity` | Only if `is_deleted=false` in DB (or session warm fallback for anchor GET miss) |
| `enterpriseDealApiClient.listDealsByOpportunity` | Sibling Deals | `GET .../opportunities/:id/deals` | Only active rows |
| `putSessionDeal` / `peekSessionDeal` (`deal-runtime-cache.ts`) | In-memory session cache | Prior API responses | Can show a Deal briefly if GET fails and warm cache exists; **full page refresh clears memory** — cannot explain logout/login return |
| `loadDeals` / `loadDealsSync` (`deal-data-access.ts`) | Deal Registry projected as LoanFile[] | Enterprise Deal search/list APIs (when Registry operational) | Same `isDeleted` filters as search |
| Opportunity workspace hydrate (`opportunity-workspace-context.tsx`) | Calls `loadDeals("opportunity_workspace")` | same DAL | Does not invent Pipeline cards from Opportunity alone |
| Strategy shortlist (`catalyst.strategic-lender-shortlist` in `strategic-lender-pipeline/sync.ts`) | Lender shortlist in localStorage | Browser | Can drive **new** Deal create after a *successful* soft-delete (partial unique index). **Not** Mehrrosh BAT: same Deal IDs, never soft-deleted |
| `loan-workspace-modal` Lender Pipeline | `draft.lenders` React state | Local draft + `updateDealAsync` | UI can hide a card without DB delete; reload rehydrates from Registry |

**Mehrrosh refresh return:** explained by hydrate from Registry of still-active Deals — not by list endpoints ignoring `isDeleted`.

---

## Phase 5 — Duplicate Persistence Audit

| Store | Role | Owner? |
|-------|------|--------|
| **`enterprise_deals` (Postgres)** | Canonical Deal SSOT | **YES — owner** |
| Opportunity Registry | Parent Opportunity; not lender Deal inventory | No |
| LoanFile / Soft Go-Live local | Legacy projection; retired when Registry operational | No (compat) |
| `snapshot.lenders` on a Deal | Derived single-lender projection only (CO-ARCH-007) | No — not multi-lender inventory |
| Session `putSessionDeal` | Ephemeral cache | No |
| React Kanban `cases` / `draft.lenders` | UI state | No |
| `localStorage` Strategy shortlist | Shortlist for Identify / Move to Deal | No — can create **new** Deal later |
| Soft-delete records / audits | Ledger of deletes | Companion to SSOT |

**One canonical source:** Enterprise Deal Registry (`enterprise_deals`).  
Mehrrosh cards returned because the **canonical row stayed active**, not because a second store recreated them.

---

## Phase 6 — Event Flow (evidence-backed)

```text
Delete click (Kanban Remove)
    ↓
LenderPipelineBoard.removeCase
    ↓
┌─────────────────────────────────────────────────────────────┐
│ PATH A — onRemoveDeal provided (Deal Workspace host)        │
│   → removeLenderPipelineDeal → DELETE API → verify isDeleted│
│   → reload listDealsByOpportunity                           │
│   (soft_delete_records would be non-empty on success)       │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ PATH B — onRemoveDeal ABSENT (Loan Workspace modal)         │
│   Evidence: loan-workspace-modal.tsx wires LenderPipelineBoard│
│   WITHOUT onRemoveDeal                                      │
│   → onChange(filter card out of React state)  ← looks gone  │
│   → updateDealAsync({ lenders }) may attempt soft-delete    │
│     diff AFTER UI already updated                           │
│   → if soft-delete never reaches repository:                │
│        soft_delete_records stay []  ← MATCHES production DB │
└─────────────────────────────────────────────────────────────┘
    ↓
Refresh / logout / login / return to Pipeline
    ↓
loadDealPipelineRuntime
    ↓
GET .../opportunities/{opp}/deals  (isDeleted: false)
    ↓
Same Deal IDs returned  ← RESURRECTION (active rows, not undelete)
    ↓
Kanban renders cards again
```

**Where the Deal is “recreated”:** it is **not** recreated. It was **never deleted** in Postgres. UI hid it; Registry still owned the active row.

**Code evidence for PATH B (UI-only filter):**

```437:438:src/components/catalyst-one/execution/lender-pipeline-board.tsx
    onChange(cases.filter((c) => c.id !== id));
    onTimeline(`Lender deal delete requested (local only): ${lender.lender ?? id}`);
```

**Code evidence Deal Workspace has PATH A:**

```415:421:src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx
            onRemoveDeal={async (dealId) => {
              if (!runtime) return;
              setSaving(true);
              try {
                const updated = await removeLenderPipelineDeal(runtime, dealId, {
```

**Code evidence Loan Workspace modal lacks PATH A:**

`src/components/catalyst-one/shared/loan-workspace-modal.tsx` — `LenderPipelineBoard` has `onChange` / `updateDealAsync` only; **no `onRemoveDeal` prop**.

---

## Phase 7 — Existing Production Record (Mehernosh)

Do not invent a new test Deal. Production record:

| Field | Value |
|-------|--------|
| Contact | Mehernosh Dastoor |
| Opportunity | OPP-2026-000041 / `cms1q4k3h0003l3047et4d0qt` |
| Deals | Axis 063, HDFC 064, ICICI 065 (ids above) |
| After BAT Delete | All three still `is_deleted=false` |
| Soft-delete ledger | Empty for all three IDs |

**Failure explanation (evidence only):**

1. Delete appeared successful because Kanban removed the card from React state.  
2. Soft-delete did not persist (`is_deleted` false; soft-delete tables empty).  
3. Refresh reloaded Opportunity Deals from Registry → same cards returned.

---

## Deliverables Checklist

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Database evidence | ✅ Phase 1 |
| 2 | API evidence | ✅ Phase 2–3 (list filters + resurrection endpoint; HAR gap noted) |
| 3 | Registry evidence | ✅ Phase 2 |
| 4 | Hydration evidence | ✅ Phase 4 |
| 5 | Cache evidence | ✅ Phase 5 (session/localStorage secondary; not BAT cause) |
| 6 | Event timeline | ✅ Phase 6 |
| 7 | Actual root cause | ✅ below |

---

## Actual Root Cause

**Production BAT Delete did not soft-delete the Enterprise Deal row.**

Supporting facts:

1. `is_deleted = false` and `deleted_at = null` on the production Deal(s) after Delete + refresh failure.  
2. `enterprise_soft_delete_records` / `enterprise_soft_delete_audits` empty for those Deal IDs (repository soft-delete never committed).  
3. Active list query correctly excludes only `is_deleted=true` rows — so refresh correctly returned still-active Deals.  
4. UI contains a Remove path that filters local Kanban state without a confirmed Registry soft-delete (`onRemoveDeal` optional; Loan Workspace modal does not pass it).

Control: when soft-delete UPDATE **does** run, Postgres persists `is_deleted=true` and the Deal disappears from the active list query.

This is **not** “listByOpportunity returns deleted Deals.”  
This is **not** “a second registry resurrected a soft-deleted row” for this BAT.

---

## Certification Rule

**CO-QA-002 remains OPEN.**

### Engineering follow-up from Round 2 evidence (not certification)

1. `loan-workspace-modal.tsx` — wired `onRemoveDeal` → explicit `DELETE` + `isDeleted` check before UI update.  
2. `lender-pipeline-board.tsx` — removed local-only UI filter fallback; Remove without `onRemoveDeal` now errors instead of hiding the card.

Cannot certify until production scenario Pass:

```text
Delete → Refresh → Logout → Login → Navigate away → Return to Pipeline
→ Deal never reappears
```

and Network shows `DELETE` with `isDeleted: true`, and Postgres shows `is_deleted = true` for that Deal ID.

Engineering scripts / builds / lint / unit tests are **not** Business Certification.

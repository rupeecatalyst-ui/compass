# CO-P0-005 — Deal Creation Root Cause Analysis

**Status:** RCA complete — no fix proposed  
**Evidence basis:** Source code paths + CO-P0-004 Pilot DB verification (`enterprise_deals` = 0; Contact Priyesh Jain present)  
**Date:** 2026-07-23

---

## Executive root cause (verified)

Deal creation is **intentionally implemented as a browser `localStorage` primary write**.

UI “success” completes when `LoanFile` is written to `localStorage` key `compass:loan-files-data`.

PostgreSQL `enterprise_deals` insert is **not** on the required success path. It is an optional, asynchronous **dual-write** (`POST /api/enterprise-deals`) that:

1. Runs only if `isDealRegistryDualWriteEnabled()` is true in the **browser** bundle  
2. Never blocks the UI save  
3. On failure / early exit returns `{ ok: false }` or logs to a client reconcile log — **no user-facing error**  
4. Is **not invoked at all** by several create handlers except via `saveLoanFiles` → `queueDealDualWriteAfterLocalSave`

**Where execution stops relative to Enterprise Deal Registry:**  
After step **localStorage persist succeeds**, before any guaranteed `enterprise_deals` INSERT. For Priyesh Jain, CO-P0-004 proves no INSERT reached Pilot `enterprise_deals`.

---

## Canonical create paths (UI → persistence)

Three primary UI entry points create a “Deal” / Loan File. None of them call `POST /api/enterprise-deals` directly.

### Path A — Loan Workspace / Loan Information (“New Loan File”)

| # | Step | Verified behaviour |
|---|------|--------------------|
| 1 | **UI action** | `LoanCreateFormDialog` submit → `CreateLoanModal.onSubmit` or `LoanInformationWorkspace.handleSubmit` → `addFile(input)` |
| 2 | **API endpoint** | **Not called** for Deal create |
| 3 | **Server action** | **Not invoked** |
| 4 | **Validation** | Form-level validation in `loan-create-form-dialog.tsx` only (client) |
| 5 | **Persistence method selected** | `createLoanFileFromInput` → in-memory `LoanFile` → `persistFiles` / `addFile` → `useEffect` → `saveDeals` → **`saveLoanFiles` → `localStorage`** |
| 6 | **DB insert attempted?** | Only if dual-write queue later runs and flag is ON |
| 7 | **Insert success/failure** | Pilot: **no** `enterprise_deals` row (CO-P0-004) |
| 8 | **Error handling** | Toast: “Loan file created…” on local success; dual-write failures swallowed |
| 9 | **Files** | `create-loan-modal.tsx`, `loan-information-workspace.tsx`, `use-loan-files-workspace.ts` (`addFile`), `deal-data-access.ts` (`saveDeals`), `loan-files-storage.ts` |

### Path B — Contact Workspace (“Create Loan” from Contact)

| # | Step | Verified behaviour |
|---|------|--------------------|
| 1 | **UI action** | `contact-workspace-modal.tsx` → `handleLoanCreated` |
| 2 | **API endpoint** | **Not called** for Deal (Contact itself uses ECM API — separate, verified working) |
| 3 | **Server action** | **Not invoked** for Deal |
| 4 | **Validation** | Client form validation only |
| 5 | **Persistence method** | `createLoanFileFromInput` + **`saveLoanFiles([...])` → localStorage** |
| 6 | **DB insert attempted?** | Only via optional dual-write after `saveLoanFiles` |
| 7 | **Insert result** | No Deal for Priyesh in Pilot |
| 8 | **Error handling** | Navigates to Loan Files; dual-write silent |
| 9 | **Files** | `contact-workspace-modal.tsx` L745–752, `loan-files-utils.ts`, `loan-files-storage.ts` |

### Path C — Customer 360

| # | Step | Verified behaviour |
|---|------|--------------------|
| 1 | **UI action** | `customer-360-modal.tsx` → `handleLoanCreated` |
| 2 | **API** | **Not called** for Deal |
| 3 | **Server** | **Not invoked** |
| 4 | **Validation** | Client form |
| 5 | **Persistence** | `createLoanFileFromInput` + **`saveDeals` → `saveLoanFiles` → localStorage** |
| 6–8 | Same dual-write optional pattern | |
| 9 | **Files** | `customer-360-modal.tsx` L330–341, `deal-data-access.ts` `saveDeals`, `loan-files-storage.ts` |

### Path D — DAL `createDeal()` (secondary / pipeline helpers)

| # | Step | Verified behaviour |
|---|------|--------------------|
| 1 | Used by e.g. `ensure-loan-workspace.ts`, not by primary Contact/Loan create dialogs | |
| 5 | Still: `createLoanFileFromInput` + **`saveLoanFiles` (localStorage)** then optional `dualWriteLoanFileToDeal` | |
| 9 | `deal-data-access.ts` L178–200 | |

**My Deals** has **no** create handler — it only reads via `loadMyDealsDealRegistryRows()`.

---

## Dual-write branch (only path that can INSERT into `enterprise_deals`)

Triggered from `saveLoanFiles` after localStorage write:

```
saveLoanFiles
  → localStorage.setItem("compass:loan-files-data", …)   // ALWAYS
  → queueDealDualWriteAfterLocalSave(files)             // OPTIONAL
       → if !isDealRegistryDualWriteEnabled() → return  // STOP — no API
       → dualWriteLoanFileToDeal(file)
            → if !flag → { ok: false }                  // STOP
            → validateLoanFileForDealImport (errors → reconcile log, { ok: false })
            → enterpriseDealApiClient.createDeal / update
                 → POST/PATCH /api/enterprise-deals…
                      → enterpriseDealApiGuard (prisma + API flag)
                      → enterpriseDealService.createDeal
                      → Prisma INSERT enterprise_deals
```

| # | Step | Verified behaviour |
|---|------|--------------------|
| 1 | UI already completed successfully | Dual-write is post-success |
| 2 | **API** | `POST /api/enterprise-deals` **only if** dual-write enabled and validation passes |
| 3 | **Server** | `enterpriseDealService.createDeal` **only if** API reached |
| 4 | **Validation** | Client: `validateLoanFileForDealImport`; Server: deal-validation + guard |
| 5 | **Persistence selected** | Secondary: Postgres via Prisma — **not** primary |
| 6 | **DB insert attempted?** | **Not for Priyesh** (zero rows in table; no linked deal) |
| 7 | **Success/failure** | Failure or never attempted — table empty |
| 8 | **Error handling** | `dualWriteLoanFileToDeal` catch → `appendReconcileLog`; comment in `loan-files-storage.ts`: *“never blocks Soft Go-Live”*; module load `.catch(() => {})` |
| 9 | **Files** | `loan-files-storage.ts` L41–57, `dual-write.ts` L106–224, `deal-api-client.ts`, `api/enterprise-deals/route.ts`, `enterprise-deal.service.ts` |

### Flag gate (client)

`isDealRegistryDualWriteEnabled()` → `readOperationalDealFlag` → defaults to `isEnterprisePersistencePrisma()`.

Client prisma detection uses:

`NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE ?? ENTERPRISE_PERSISTENCE_MODE`

If the **browser** resolves mode as `memory`, dual-write is **OFF** → **API never called** → **no INSERT**.

Verified Production env **names** (prior investigation): `ENTERPRISE_PERSISTENCE_MODE`, `DATABASE_URL`, `DIRECT_URL` present; **`NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE` absent**; **no `DEAL_REGISTRY_*` keys**.

---

## Step-by-step answer matrix (primary Contact → Deal journey)

Aligned to Priyesh Jain evidence (Contact in Postgres, Deal not):

| Step | Outcome |
|------|---------|
| 1. UI action invoked | Loan create from Contact / Loan Workspace / Loan Information / Customer 360 (form submit) |
| 2. API endpoint called (Deal) | **Not called** as required create; optional dual-write may call `POST /api/enterprise-deals` later |
| 3. Server action invoked (Deal) | **Not invoked** on primary path |
| 4. Validation outcome | Client form OK → UI proceeds; dual-write validation separate and silent on fail |
| 5. Persistence method selected | **`localStorage` (`compass:loan-files-data`)** via `saveLoanFiles` / `saveDeals` |
| 6. Database insert attempted? | **No successful insert** into `enterprise_deals` (Pilot count = 0) |
| 7. Insert success/failure | **No insert** (or never reached Prisma) |
| 8. Error handling | Local path treats create as success; dual-write failures do not fail the UI |
| 9. Final root cause | See below |

---

## Exact files responsible for localStorage / legacy Deal create

| File | Role |
|------|------|
| `src/lib/loan-files-storage.ts` | **Primary persistence** — `saveLoanFiles` / `loadLoanFiles` → `localStorage` key `compass:loan-files-data` (`STORAGE_KEYS.LOAN_FILES_DATA`) |
| `src/constants/animations.ts` | Defines `LOAN_FILES_DATA: "compass:loan-files-data"` |
| `src/lib/loan-files-utils.ts` | `createLoanFileFromInput` — builds legacy `LoanFile` object (no DB) |
| `src/lib/enterprise-deal/deal-data-access.ts` | `saveDeals` → `saveLoanFiles`; `createDeal` still local-first |
| `src/components/catalyst-one/contacts/contact-workspace-modal.tsx` | Create Loan → localStorage only |
| `src/components/catalyst-one/loan-files/create-loan-modal.tsx` | New Loan File → `addFile` → local |
| `src/hooks/use-loan-files-workspace.ts` | `addFile` / `saveDeals` effect |
| `src/components/catalyst-one/customers/customer-360-modal.tsx` | Create Loan → `saveDeals` → local |
| `src/lib/enterprise-deal/dual-write.ts` | Optional secondary Postgres path; silent early-exit / failure |
| `src/lib/enterprise-deal/deal-api-client.ts` | Browser client for `/api/enterprise-deals` (dual-write only) |

Contact persistence (contrast): ECM Contact create uses server API → `ecm_contacts` (verified working for Priyesh).

---

## Final root cause (no fix)

**Root cause:** The Deal creation workflow’s **definition of done** is a **legacy browser `LoanFile` write to `localStorage`**, not an Enterprise Deal Registry write.

Execution **stops** (relative to `enterprise_deals`) **after localStorage success**, because:

1. Primary UI handlers never require `POST /api/enterprise-deals` or Prisma `enterpriseDeal.create`.  
2. Postgres write is optional dual-write, gated, async, and non-blocking.  
3. Dual-write early-exit or failure does not reverse or fail the UI create.  
4. Pilot evidence: Contact row exists; `enterprise_deals` has **zero** rows — Deal never landed in the Enterprise Deal Registry.

This is an **intentional Soft Go-Live / local-first architecture** still active on the create path (`loan-files-storage.ts` comment: dual-write must not affect Soft Go-Live), not a silent crash inside Prisma after a required insert was attempted.

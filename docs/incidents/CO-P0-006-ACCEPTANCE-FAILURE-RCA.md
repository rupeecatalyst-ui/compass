# CO-P0-006 — Acceptance Failure RCA (Abhiraj Kapoor / OPP-2026-2004)

**Status:** RCA complete — **no code changes**  
**Date:** 2026-07-23  
**Facts:** Contact `cmrxqpxin0001jr041rajq1om` in Postgres; UI Deal `OPP-2026-2004`; `enterprise_deals` = 0  

---

## Executive root cause

The Deal the UI shows was persisted only as a browser **LoanFile** (`localStorage` key `compass:loan-files-data`) via `createLoanFileFromInput` → `saveLoanFiles`.

The **Enterprise Deal Registry primary-write path did not successfully run** as the create success path. Proof:

1. `enterprise_deals` count = **0** (including for Contact `cmrxqpxin0001jr041rajq1om`)
2. `enterprise_deal_number_sequences` = **[]** → `allocateDealNumber()` (called only inside successful `enterpriseDealService.createDeal`) **never committed** on this Pilot DB for a registry create
3. Display id `OPP-2026-2004` is the **client** label derived from `fileNumber` `RC-2026-2004` (`existingFiles.length === 4`), **not** a registry `dealNumber` (`DEAL-YYYY-######`)

**Exact stop point:** after local LoanFile create/cache write; **before** any successful `POST /api/enterprise-deals` → Prisma `enterprise_deals` INSERT.

---

## Evidence table (answers 1–10)

| # | Question | Finding | Evidence |
|---|----------|---------|----------|
| 1 | Was `createDealAsync()` invoked? | **Not proven from server logs.** Possible yes (legacy branch) or no (pre-Wave-1 / unwired bundle). Both paths call `createLoanFileFromInput`. | No server-side log for client DAL. `createLoanFileFromInput` **did** run (OPP formula). |
| 2 | `DEAL_REGISTRY_PRIMARY_WRITE` resolved value? | **Env:** both primary flags **unset**. **Resolved under Local `.env.local` node eval:** `true` (unset + prisma). **Runtime that served the UI almost certainly resolved client primary = false** (see below). | `scripts/co-p0-006-rca-flag-eval.cjs`; Vercel Production has **only** `ENTERPRISE_PERSISTENCE_MODE` — **no** `NEXT_PUBLIC_*` Deal/persistence mirrors. |
| 3 | Path taken | **Legacy localStorage (SoR)** — not Primary Enterprise Write success | Empty `enterprise_deals` + empty deal-number sequences + OPP client label |
| 4 | Was `POST /api/enterprise-deals` called? | **No successful create reached Prisma.** Call may never have been made; if made, it did not insert (dual-write failures are silent). | Sequences empty; deals count 0 |
| 5 | Request/status/body | **N/A — no successful API create evidence** | No row to reverse-engineer; no captured Network HAR in this RCA |
| 6 | Did API route execute? | **Not for a committed create** | Would call `allocateDealNumber` → sequence row |
| 7 | Did Prisma `create()` for `enterprise_deals` execute? | **No committed insert** | SQL/Prisma count = 0 |
| 8 | Why Prisma did not execute | Execution never entered the **required** primary-write await path as SoR, **or** dual-write never enabled / failed before insert | See failure-point analysis |
| 9 | Validation/exception if Prisma ran | **N/A** — no committed create | — |
| 10 | Why UI showed success | UI success is bound to **LoanFile local create** (or `createDealAsync` legacy branch returning `source: "legacy_loan_file"`), then navigate/toast. `OPP-2026-2004` = `opportunityNumberForFile(RC-2026-2004)`. | `loan-files-utils.ts` L178; `map-documents.ts` L97–100; `deal-data-access.ts` L230–251; `saveLoanFiles` |

---

## Failure-point analysis (code)

### A. What produces `OPP-2026-2004`

```178:178:src/lib/loan-files-utils.ts
    fileNumber: `RC-2026-${String(2000 + index)}`,
```

`index = existingFiles.length` → `RC-2026-2004` when length was 4.

```97:100:src/lib/enterprise-credit-workspace/map-documents.ts
export function opportunityNumberForFile(file: LoanFile): string {
  return file.fileNumber?.startsWith("OPP")
    ? file.fileNumber
    : `OPP-${file.fileNumber.replace(/^RC-/, "")}`;
}
```

Registry numbers are `DEAL-YYYY-######` (`deal-number.service.ts`) — **not** used for this UI label.

### B. Wave 1 primary path (would have inserted)

`createDealAsync` when primary ON:

1. `persistNewDealToEnterpriseRegistry` → `POST /api/enterprise-deals`
2. Route → `enterpriseDealService.createDeal` → `allocateDealNumber` + Prisma insert
3. Only then `cacheCreatedDeal` / UI success

**Counterfactual:** If this path succeeded, Pilot would have ≥1 `enterprise_deals` row and a `enterprise_deal_number_sequences` row. **Observed: both empty.**

### C. Legacy branch (matches observation)

```230:251:src/lib/enterprise-deal/deal-data-access.ts
  if (!isDealRegistryPrimaryWriteEnabled()) {
    saveLoanFiles([created, ...existing.filter((f) => f.id !== created.id)]);
    if (isDealRegistryDualWriteEnabled()) {
      void dualWriteLoanFileToDeal(created).then(...); // non-blocking
    }
    return { file: created, enterpriseDealId: "", dealNumber: "", source: "legacy_loan_file" };
  }
```

Plus `saveLoanFiles` always queues dual-write optionally — failures never block UI (`dual-write.ts` contract).

### D. Why client primary/dual-write can be OFF while Contact still hits Postgres

Contact create uses **server** APIs with `ENTERPRISE_PERSISTENCE_MODE=prisma`.

Deal primary/dual-write flags on the **browser** depend on `isEnterprisePersistencePrisma()` → prefers `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE`.

| Environment | Server prisma | Client NEXT_PUBLIC prisma | Wave 1 code | Expected Deal create |
|-------------|---------------|---------------------------|-------------|----------------------|
| Local `.env.local` (node) | yes | yes | present on disk | primary ON **if** Next process loaded public env |
| Vercel **Production** | yes (`ENTERPRISE_PERSISTENCE_MODE`) | **absent** | **not deployed** (CO-GOV-001) | localStorage only; dual-write OFF |
| Preview | no Deal env listed | absent | not deployed | localStorage only |

Verified Production env names: **only** `ENTERPRISE_PERSISTENCE_MODE` among Deal/persistence keys (no `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE`, no `DEAL_REGISTRY_*`).

---

## Prisma / SQL evidence (Pilot)

```json
{
  "contact": {
    "id": "cmrxqpxin0001jr041rajq1om",
    "name": "Abhiraj Kapoor",
    "createdAt": "2026-07-23T16:43:16.847Z",
    "createdBy": "cmrtliln30000weys6c2ljzy8"
  },
  "enterprise_deals_count": 0,
  "deals_for_abhiraj": [{ "c": 0 }],
  "deal_number_sequences": []
}
```

---

## A–D Summary

### A. Exact root cause

**Deal create success completed on the legacy browser LoanFile / localStorage path.** The Enterprise Deal Registry create (`POST /api/enterprise-deals` → `allocateDealNumber` → Prisma insert) **did not commit**. UI success does not require Postgres under that path (CO-P0-005 behaviour, still reachable when primary write is OFF or Wave 1 is not in the running app).

### B. Exact file(s) responsible

| Role | File |
|------|------|
| Client file number / OPP label | `src/lib/loan-files-utils.ts`, `src/lib/enterprise-credit-workspace/map-documents.ts` |
| Legacy vs primary branch | `src/lib/enterprise-deal/deal-data-access.ts` (`createDealAsync`) |
| localStorage SoR write + optional dual-write queue | `src/lib/loan-files-storage.ts` |
| Silent dual-write failures | `src/lib/enterprise-deal/dual-write.ts` |
| Flag resolution (client needs NEXT_PUBLIC) | `src/constants/enterprise-deal-registry/flags.ts`, `src/constants/enterprise-persistence/index.ts` |
| UI success after local create | Contact/Loan create handlers (Wave 1 wires `createDealAsync`, but legacy branch still succeeds without DB) |

### C. Recommended fix (do not implement in this RCA)

1. Confirm acceptance URL (localhost vs Production) and capture Network tab for `POST /api/enterprise-deals`.
2. For Local: restart Next after env load; verify client sees `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma`; set explicit `NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE=true` with **literal** `process.env.NEXT_PUBLIC_…` reads (avoid dynamic `process.env[name]` in client).
3. Harden Wave 1: when server intent is prisma, **forbid** legacy create success in browser (fail closed), not only when flag helper returns true.
4. Do not treat Production acceptance as Local Certification until Wave 1 is deployed + public env mirrors set (CO-GOV-001).

### D. Classification

**Primary: Feature flag / client configuration issue** (client persistence/primary-write resolved OFF, and/or Wave 1 not in the runtime under test)  
**Secondary: UI workflow issue** (success still granted on localStorage when primary path is not taken)  
**Not:** Prisma transaction rollback of a successful insert (no insert evidence)  
**Not:** API routing bug on a committed create (no sequence / no row)

---

## What this RCA does **not** claim

- Exact browser Network HAR for the Abhiraj session (not captured)
- That `createDealAsync` was definitely entered (vs older handler) — both can produce OPP-2026-2004
- That dual-write POST was attempted and failed with a specific HTTP status

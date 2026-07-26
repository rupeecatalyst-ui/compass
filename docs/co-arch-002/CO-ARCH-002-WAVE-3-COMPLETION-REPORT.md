# CO-ARCH-002 — Wave 3 Completion Report

**Program:** CO-ARCH-002  
**Wave:** 3 — Dual-Write (Enterprise Deal secondary persistence)  
**Status:** **Complete — paused for ARB review**  
**Date:** 2026-07-22  
**Baseline:** Wave 2 Approved · Wave 1 Approved · F0 · Execution Program v1.0  

---

## Scope adherence

| In scope | Done |
|----------|------|
| Dual-write orchestration | ✅ |
| Feature-flag controlled (`DEAL_REGISTRY_DUAL_WRITE` default OFF) | ✅ |
| Idempotent sync via `legacyLoanFileId` | ✅ |
| Error handling + retry (3× exponential backoff) | ✅ |
| Reconciliation logging | ✅ `compass:deal-dual-write-reconcile` |
| Import validation (pre-write) | ✅ `validateLoanFileForDealImport` |
| Consistency verification helper | ✅ `verifyLoanFileDealConsistency` |
| Writes via Enterprise Deal API | ✅ `enterpriseDealApiClient` |
| LocalStorage primary SSOT unchanged | ✅ |
| Dual-read / UI migration | ❌ **Forbidden — not done** |
| Activate Deal as primary SSOT | ❌ **Forbidden — not done** |

---

## 1. Dual-Write Architecture

```
[User action]
     │
     ▼
[Existing module creates/updates LoanFile]
     │
     ▼
[saveLoanFiles / updateLoanFileInStorage]  ← local SSOT (unchanged UX)
     │
     ├─ localStorage compass:loan-files-data   (PRIMARY — always)
     │
     └─ queueDealDualWriteAfterLocalSave()     (SECONDARY — flag gated)
              │
              ├─ if DEAL_REGISTRY_DUAL_WRITE OFF → no-op
              ├─ fingerprint diff → skip unchanged
              └─ dualWriteLoanFileToDeal(file)
                       │
                       ▼
              POST/PATCH/transitions/archive  /api/enterprise-deals/*
                       │
                       ├─ 2xx → cache dealId/rowVersion
                       └─ fail → retry → reconcile log (local save already succeeded)
```

**Principles preserved**

1. UX identical  
2. localStorage continues  
3. Successful creates also create Enterprise Deal (when flag ON)  
4. Successful updates also update Enterprise Deal (when flag ON)  
5. Modules still **read** local SSOT only  
6. No dual-read  
7. Server validates all Deal writes  
8. Flags default OFF  

---

## 2. Synchronization Matrix

| Local event | Dual-write action (flag ON) | Idempotency |
|-------------|----------------------------|-------------|
| New LoanFile in `saveLoanFiles` | `POST /api/enterprise-deals` (`legacyLoanFileId`) | Unique `(org, legacyLoanFileId)`; create returns existing |
| Updated LoanFile | Resolve deal → `PATCH` with `rowVersion` | 409 → re-fetch → retry PATCH |
| Stage change | `POST …/transitions` then PATCH | Stage + rowVersion |
| Archived | `POST …/archive` | Timeline + lifecycle |
| Un-archived | `POST …/restore` | ESD + timeline |
| Unchanged fingerprint | Skip | Fingerprint map |
| Flag OFF / API 404/401/503 | Skip + optional reconcile “skipped” | Local only |

**Wire point:** `src/lib/loan-files-storage.ts` → `saveLoanFiles` (covers Contacts, C360, Loan Workspace, board/workspace hooks, lender sync, documents).  

**OW Save:** touches linked `leadCaseFile` via `updateLoanFileInStorage` so dual-write can fire without changing planning UX.

---

## 3. Reconciliation Strategy

| Artifact | Key / API |
|----------|-----------|
| Deal id cache | `localStorage compass:deal-id-by-loan-file` |
| Fingerprints | `compass:deal-dual-write-fingerprints` |
| Failure log | `compass:deal-dual-write-reconcile` (last 200) |
| Helpers | `listReconcileLog()`, `clearReconcileLog()`, `getDealIdMap()` |

On exhausted retries, entry recorded with operation, attempts, message, code. Local SSOT remains authoritative until Wave 4+.

---

## 4. Failure Recovery Strategy

| Failure | Behavior |
|---------|----------|
| Dual-write flag OFF | No API calls |
| API disabled (404 `DEAL_API_DISABLED`) | Skip; log once per attempt path |
| Network / 5xx | Retry ×3 (400ms, 800ms, 1600ms) then reconcile |
| 409 version conflict | Re-resolve by `legacyLoanFileId`, PATCH again |
| Validation error | Reconcile `VALIDATION`; no throw into UI |
| Module load error | Caught at `saveLoanFiles`; Soft Go-Live unaffected |

**Rollback:** set `DEAL_REGISTRY_DUAL_WRITE` / `NEXT_PUBLIC_DEAL_REGISTRY_DUAL_WRITE` OFF. Existing Deal rows retained; local SSOT continues.

**Enablement (pilot only, after ARB):**  
`ENTERPRISE_PERSISTENCE_MODE=prisma` + `DEAL_REGISTRY_API_ENABLED=true` + `DEAL_REGISTRY_DUAL_WRITE=true` (+ public mirrors).

---

## 5. Consistency Verification Report

| Check | Implementation |
|-------|----------------|
| Import validation | `validateLoanFileForDealImport(file)` — errors block dual-write; warnings logged via validation path |
| Runtime consistency | `verifyLoanFileDealConsistency(file)` compares stage, contact name, product label |
| Search resolve | `GET /api/enterprise-deals?legacyLoanFileId=` |
| Automated gate | `node scripts/co-arch-002-w3-verify.mjs` → **PASSED** (flags OFF, hook present, no dual-read) |

Wave 3 does **not** force production consistency runs while flags are OFF (expected idle).

---

## Deliverables index

| # | Artifact |
|---|----------|
| 1 | This report |
| 2–5 | Architecture / Sync matrix / Reconciliation / Failure recovery (above) |
| 6 | Consistency section + verify script |
| Code | `src/lib/enterprise-deal/*`, `loan-files-storage.ts`, OW Save touch, search `legacyLoanFileId` |

---

## Certifications

### Engineering
- [x] Dual-write adapter behind flags default OFF  
- [x] TypeScript clean for dual-write modules  
- [x] No dual-read; no UI module migration beyond OW Save local touch  

### Data
- [x] Idempotent `legacyLoanFileId`  
- [x] Optimistic concurrency on update  
- [x] Local SSOT never blocked by Deal API failure  

### Business
- [x] Soft Go-Live UX unchanged while flags OFF  
- [x] When enabled (future), user flows unchanged; Deal is secondary  

### AI
- [x] No parallel AI identity; Deal Health not computed  
- [x] No CHANAKYA / Mission Control read swap  

### Production readiness
- [x] Default OFF — no production traffic to Deal writes  
- [x] Rollback = flags OFF  
- [x] **STOP** — do not start Wave 4 until ARB Approves Wave 3  

---

## ARB decision request

Please **Approve Wave 3** to authorize **Wave 4 (Dual-Read / port runtime)** only.

**STOP:** Do not begin Wave 4 until ARB Approves this Wave 3 package.

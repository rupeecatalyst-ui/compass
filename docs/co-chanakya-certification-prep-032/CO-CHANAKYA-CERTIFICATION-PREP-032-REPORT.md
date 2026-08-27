# CO-CHANAKYA-CERTIFICATION-PREP-032 — Certification Preparation Report

**Date:** 2026-08-26 / 2026-08-27 (session)  
**Mode:** Certification preparation only · **NO COMMIT · NO PUSH · NO DEPLOY · NO MIGRATIONS**  
**Hostinger:** FROZEN (CO-CHANAKYA-RELEASE-FREEZE-015) — Chanakya not authorized for `catalyst-one.rupeecatalyst.com` deploy in this task  
**Feature freeze:** No FOIR / DSCR / LTV · no new Chanakya features · no Accounting / Marketing / SMTP / dashboard redesign

---

## A. Certification baseline SHA

`b6292c5c535c53b135035a9d593675d288199b78`  
Short: **`b6292c5`**

Note: branch is **behind origin by 1** (not pulled). Dirty working tree sits on top of this HEAD.

## B. Current branch

`compass-hl03-conversation-first`

---

## 1. Working-tree scope map (dirty ≈ 177 paths)

Machine map: `docs/co-chanakya-certification-prep-032/_scope-buckets.json`

| Bucket | Approx count | Treatment for Chanakya Phase-1 cert |
|--------|--------------|-------------------------------------|
| **A. Chanakya Phase-1** | ~87 | **INCLUDE** |
| **B. Accounting** | ~25 | **EXCLUDE** |
| **C. Marketing** | ~6 | **EXCLUDE** |
| **D. SMTP / email** | ~6 | **EXCLUDE** |
| **E. Dashboard / lead-info / credit-bench UI** | ~6 | **EXCLUDE** (except Chanakya intelligence mode component listed under A) |
| **F. ChatGPT OAuth / enterprise-read** | ~19 | **INCLUDE** (Phase-1 integration surface) |
| **G. Regression-014 / temp probes** | ~15 | Support / generated — include only cert scripts if committing later; **tmp probes EXCLUDE** |
| **H. Prisma / accounting migration** | schema + migration | **EXCLUDE** from Chanakya cert commit |
| **I. Other** | package.json, ECW shells, document-registry sync, AI connectors, 014 docs | **Case-by-case** — ECW proposal/document views & connectors that Chanakya consumes belong with A; accounting-adjacent stay out |

### C. Chanakya files included (Phase-1 certification scope)

**Core (dirty / untracked belonging to completed Chanakya work):**

- `src/lib/chanakya-enterprise-read-context/**`
- `src/lib/chanakya-credit-intelligence/**`
- `src/lib/chanakya-document-intelligence/**` (OCR ports + honesty / OCR_REQUIRED)
- `src/lib/chanakya-credit-proposal/**` (through V3 / export / GST traceability)
- `src/lib/chanakya-dashboard-intelligence/**`
- `src/types/chanakya-*.ts`
- `src/constants/chanakya-*/**`
- `src/app/api/chanakya/enterprise-read-context/**`
- `src/components/catalyst-one/user-home-dashboard/chanakya-intelligence-mode.tsx`
- `src/components/catalyst-one/enterprise-credit-workspace/ecw-proposal-*.tsx` + `src/styles/ecw-proposal-workspace.css`
- `src/lib/enterprise-opportunity/resolve-loan-purpose.ts` (Chanakya consumer helper)
- Verify / E2E / cert scripts: `scripts/co-chanakya-*.mjs`, `scripts/co-chanakya-certification-018.mjs`, credit-intelligence / credit-certification / enterprise-read-context-002
- Docs: `docs/co-chanakya-*/**`, release-freeze-015 rule/docs
- **ChatGPT lane (Phase-1):** `server/services/chatgpt-integration/compose-enterprise-read.ts`, `src/app/api/integrations/chatgpt/v1/enterprise-read/`, OAuth/token/sanitize/scopes/OpenAPI/verifies

### D. Unrelated files excluded

- All **Accounting** invoice/case/payment/PDF/send/signature/regulatory-tax paths + accounting migration
- All **Marketing** campaign / MKT-04 / Hostinger marketing cutover-016
- All **SMTP** transport / probe / test-send / operational-email activation
- **Dashboard / Lead Information / Modify Loan Details** UI dirt (non-Chanakya)
- **Temp / generated:** `scripts/_tmp-*`, `docs/_tmp-regression-012/`, `_gates.log` / parse helpers (engineering artefacts)
- **Prisma schema + accounting migration** (not Chanakya Phase-1)

### Ancestry relevant to Chanakya (on branch)

```
b6292c5 chore(release): add production regression prevention framework (014)
538e733 fix(production): stabilize notification and Chanakya chrome
c6ebf15 feat(chanakya): add evidence-first credit workbench
f33ec0a feat(chanakya): add durable large transaction document storage
7627926 feat(chanakya): add streamed credit proposal foundation
… chatgpt OAuth / GPT Action commits …
```

### Diff / isolation boundary

- Chanakya Phase-1 **can be path-staged** from the dirty tree using bucket A + ChatGPT enterprise-read.
- The tree **cannot** be treated as “all dirty = Chanakya.”
- **No commit performed.** A future Chanakya-only commit requires explicit path add — never Keep All / Undo All.
- Incomplete worktree `C:\Compass-chanakya-final-034-cert` is **not** the cert baseline; primary dirty WT + HEAD `b6292c5` is.

**Isolation verdict:** Scope is **mapped and separable by path**. Commit is **blocked by discipline** (PO: do not commit yet), not by inability to list files. Mixed dirty Accounting/Marketing/SMTP is the reason a blind commit would be unsafe.

---

## Functional freeze (confirmed — no expansion this sprint)

Enterprise read context · Opportunity 360 · Deal 360 · Transaction Attention · Accounting & Commercial Read · Change Intelligence · Product & Lender Intelligence · Document Intelligence · Evidence-first Credit Intelligence · ChatGPT enterprise-read · OAuth refresh · PII protection · Provenance · NOT_AVAILABLE discipline · Real transaction E2E.

---

## K. FOIR / DSCR / LTV status

**DEFERRED — CHANAKYA PHASE 2**

Code confirms non-computation (e.g. `credit-intelligence-core.ts`, `credit-synthesis-core.ts`, banking core header). Avon fabrication tests: `ratiosNotAvailable: true`.  
**No code changes** introduced these metrics in this task.

## L. OCR status

- Implementation exists (ports / composite / quality / OCR_REQUIRED).
- Cert env: **`ocrProvider: PROVIDER_NOT_CONFIGURED`** → OCR **LIMITED** (expected).
- OCR-required docs remain honest (`ocrRequired: 4` on Avon run).
- No new OCR feature work; no fabricated OCR fills.

---

## Gate results (this prep run)

Results: `docs/co-chanakya-certification-prep-032/_gate-results.json`  
Log: `docs/co-chanakya-certification-prep-032/_gates.log`

| Gate | Result |
|------|--------|
| **E. TypeScript (full)** | **PASS** (`TSC: 0`) |
| **F. Production build** | **PASS** (`BUILD: 0`) |
| **G. Chanakya verifies** (002, 011, 015, 016, 021–029) | **PASS** |
| **H. Real transaction E2E (020 / certification-018)** | **PASS** · classification `READY_WITH_LIMITATIONS` |
| **I. ChatGPT** (OAuth + GPT Action verifies) | **PASS** |
| **014-STATIC** | **PASS** |
| **014-SMOKE** | **FAIL / BLOCKED** (see below) |

### 014-SMOKE classification (separate from Chanakya Phase-1 code)

- Target: Hostinger `https://catalyst-one.rupeecatalyst.com` (read-only BAT; **no deploy**)
- Login: PASS · direct critical routes: PASS · notification: PASS · Chanakya header: PASS
- Failure: **`nav_Credit Workbench`** only
- Observed runtime: `net::ERR_QUIC_PROTOCOL_ERROR.QUIC_TOO_MANY_RTOS` (transport / network)
- Prior CO-CHANAKYA-033 same Hostinger smoke: **READY FOR PRODUCTION**

**Classification:** Environment / network flake on frozen Hostinger shell navigation — **not** a Chanakya Phase-1 functional regression and **not** caused by Accounting/Marketing dirty files in the local build (smoke hits deployed Hostinger, not local WT).

---

## J. Security / PII result

| Check | Status |
|-------|--------|
| Mobile excluded from AI context | **PASS** (omit + redact; Avon `proposalNoMobile`) |
| Email excluded from AI context | **PASS** (Avon `proposalNoEmail`) |
| Document binaries not exposed to AI context | **PASS** (authorized retrieve + intelligence pack; no binary dump in enterprise-read) |
| Raw EDC payloads not exposed | **PASS** (evidence slices / redaction pattern) |
| Org + Opportunity/Deal scoping | **PASS** (enterprise-read compose path) |
| ChatGPT business mutations | **Unavailable** — READ / CHANAKYA scopes only |
| Enterprise-read read-only | **PASS** |
| Accounting mutation via Chanakya / ChatGPT | **Not exposed** |
| Production mutation in this task | **None** (no deploy / migrate / data change) |

## Data honesty

PRESENT ≠ READABLE · READABLE ≠ FINANCIALLY USEFUL · AVAILABLE ≠ VERIFIED · EVIDENCE ≠ UNDERWRITING DECISION — preserved.  
Avon fabrication suite: banking NOT_AVAILABLE honest · no approval language · ratios NOT_AVAILABLE · metadata-only banks visible · no eligible guaranteed.

---

## M. Avon limitations (OPP-2026-000060 / Avon Appliances Private Ltd)

Observed on **this** 020 Hostinger-backed run (do not manufacture missing evidence):

| Signal | Observed |
|--------|----------|
| Total documents | **67** |
| With binary | **55** |
| Content read | **34** |
| OCR required | **4** |
| Metadata-only bank statements (Axis-class) | **8** |
| Structured facts (engine count) | **189** |
| OCR provider | **PROVIDER_NOT_CONFIGURED** |
| Banking intelligence | **LIMITED (honest)** |
| Classification | **READY_WITH_LIMITATIONS** |
| GST / P&L / banking financial usefulness | Remain limited / unavailable where evidence insufficient |
| FOIR / DSCR / LTV | **NOT_AVAILABLE** (deferred) |

Note: Earlier narrative figures (e.g. “43 readable / 32 structured fact rows”) describe the same **limitation class**; this run’s instrumented counters are above. Certification uses **observed** counters, not aspirational ones.

---

## N. Production readiness assessment

| Dimension | Assessment |
|-----------|------------|
| Local engineering (tsc / build / Chanakya verifies / E2E / ChatGPT verifies) | **CODE READY** for certification packaging |
| Data honesty / Avon real transaction | **READY_WITH_LIMITATIONS** (expected) |
| Hostinger Chanakya deploy | **NOT AUTHORIZED** (freeze) |
| Hostinger shell smoke this run | **FLAKE / BLOCKED** on nav Credit Workbench (network) — prior 033 PASS |
| Clean Chanakya-only Git SHA | **NOT YET** (no commit; dirty mixed tree) |
| Overall production cutover | **NOT PRODUCTION READY** for Chanakya on Hostinger |

## O. Exact remaining blockers

1. **No Chanakya-only certified commit yet** (PO forbade commit in this task).
2. **Dirty tree mixing** Accounting / Marketing / SMTP / prisma — must path-stage carefully later.
3. **Hostinger Chanakya deploy freeze** — Phase-1 code not the live Hostinger Chanakya cutover SHA.
4. **OCR provider not configured** on cert env — expected LIMITED.
5. **014-SMOKE** this run BLOCKED on QUIC/nav flake — re-run before treating as shell regression; do not speculative-fix.
6. Branch **behind origin by 1** — resolve before final cutover commit packaging.
7. Incomplete isolation worktree (`co-chanakya-final-integration-034`) — do not use as cert source.

## P. Recommended next certification action

1. **PO-authorized Chanakya-only commit** from explicit INCLUDE paths (A + ChatGPT enterprise-read + required ECW/proposal surfaces) — exclude B/C/D/E/H and all `_tmp*`.
2. Re-run **014-SMOKE** once (Hostinger process-local BAT URL) to confirm flake vs persistent nav failure.
3. Produce **FINAL CUTOVER READINESS REPORT** only after clean SHA + gate green — still **STOP before Hostinger deploy** until explicit FINAL CUTOVER approval.
4. Keep FOIR / DSCR / LTV deferred; keep OCR as config/ops, not feature expansion.

---

## Constraints honored

- No new Chanakya features · no architecture change · no FOIR/DSCR/LTV · no Accounting/Marketing/SMTP/dashboard mutation for this sprint  
- No commit · no push · no Vercel deploy · no Hostinger deploy · no production migrations · no production env/data changes  

**STOP** — certification-preparation report complete.

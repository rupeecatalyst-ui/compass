# CO-CHANAKYA-033 — Hostinger BAT Certification Target Validation

**Date:** 2026-08-27  
**Mode:** Read-only certification · process-local `CATALYST_BAT_URL` override only  
**Target:** `https://catalyst-one.rupeecatalyst.com`  
**Constraints honored:** No `.env` permanent edits · no secrets in repo · no code changes · no deploy · no commit · no migrations · no production data/env mutation

## Method

```powershell
$env:CATALYST_BAT_URL = "https://catalyst-one.rupeecatalyst.com"
# Optional for Avon/read paths:
$env:CO_CHANAKYA_011_READ_BASE = "https://catalyst-one.rupeecatalyst.com"
node --env-file=.env.local --env-file=compass/.env.local …
```

Node prefers already-set process env over `--env-file`, so local `.env` Vercel URL was overridden only for this session.

## A. Hostinger BAT login

| Check | Result |
|-------|--------|
| Host | `catalyst-one.rupeecatalyst.com` |
| Credentials presence | SET (values not logged) |
| HTTP | **200** |
| `success` | **true** |
| Access token issued | **yes** (not logged) |

**PASS**

## B. Shell smoke (CO-PRODUCTION-REGRESSION-014)

| Check | Result |
|-------|--------|
| Command | `scripts/co-production-regression-014-shell-smoke.mjs` |
| Exit | **0** |
| `finalStatus` | **READY FOR PRODUCTION** |
| BAT login | PASS (prerequisite) |
| Critical routes / pageErrors | `pageErrors: []` across probes |
| Shell / notification / Chanakya header | `"pass": true` |

**PASS** — Dashboard, My Deals, Documents, Document Center, Credit Workbench, navigation geometry, ticker containment, notification presentation, no horizontal overflow / pageerrors asserted by existing smoke suite.

Log: `docs/co-chanakya-033/_shell-smoke.log`

## C. CO-CHANAKYA-020

| Check | Result |
|-------|--------|
| Script | `scripts/co-chanakya-certification-018.mjs` |
| Exit | **0** |
| BAT login | `PASS · against https://catalyst-one.rupeecatalyst.com` |
| Shell smoke nested | `PASS` |
| Classification | **READY_WITH_LIMITATIONS** |

**PASS** (engineering/cert gate). Classification remains `READY_WITH_LIMITATIONS` — expected Avon data/OCR/banking limitations, not auth failure.

Log: `docs/co-chanakya-033/_020.log`

## D. CO-CHANAKYA-029

| Check | Result |
|-------|--------|
| Script | `scripts/co-chanakya-029-final-safety-evidence-audit.mjs` |
| Exit | **0** |

**PASS** (nested 020 no longer blocked by Vercel DB).

Log: `docs/co-chanakya-033/_029.log`

## E. Newly exposed failures

**None** from auth/shell path after Hostinger retarget.

Known **expected limitations** (unchanged from prior Avon certification — not new auth regressions):

- OCR provider not configured
- Metadata-only bank statements / banking LIMITED
- Avon classification `READY_WITH_LIMITATIONS`
- Hostinger Chanakya deploy still FROZEN (CO-CHANAKYA-RELEASE-FREEZE-015)

## F. Code change required?

**No.**

## G. CO-CHANAKYA-031 remains clean?

**Yes** — TypeScript + production build posture unchanged; this sprint did not touch application code.

## H. Production build status

**PASS** (carried from CO-CHANAKYA-031; not re-run — out of scope for 033).

## I. Commit / push / deploy

**None.**

## Classification of prior 020/029 FAIL (032 + 033)

| Prior failure | Classification after 033 |
|---------------|--------------------------|
| Vercel BAT login 500 / DB unreachable | **environment issue** (confirmed) |
| Hostinger BAT + shell smoke | **PASS** |
| Avon `READY_WITH_LIMITATIONS` | **expected limitation** (data/OCR/banking), not auth |

**STOP.**

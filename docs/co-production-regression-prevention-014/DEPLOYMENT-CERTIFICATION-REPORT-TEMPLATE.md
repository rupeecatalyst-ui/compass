# Deployment Certification Report — CO-PRODUCTION-REGRESSION-PREVENTION-014

Copy this template for every Catalyst One production deployment candidate.

---

## Deployment identity

| Field | Value |
|-------|-------|
| **A. Git SHA** | |
| **Short SHA** | |
| **B. Branch** | |
| **Commit message** | |
| **C. Deployment target** | e.g. `https://catalyst-one.rupeecatalyst.com` |
| **Deployment timestamp (UTC)** | |
| **Deploy operator** | |
| **Sprint / scope** | |

---

## Engineering gates

| Gate | Result | Evidence |
|------|--------|----------|
| **D. Build** (`npm run build`) | PASS / FAIL / SKIPPED | |
| **E. TypeScript** (`npx tsc --noEmit`) | PASS / FAIL | |
| **F. Feature verification** | PASS / FAIL / N/A | List scripts run |
| Clean-SHA (`cert:production-clean-sha`) | PASS / FAIL | `git status --short` clean? |

> **Reminder:** BUILD PASS ≠ PRODUCTION PASS

---

## Production smoke (BAT-authenticated)

**Command:** `npm run cert:production-shell-smoke`  
**Target URL:**  
**BAT configured:** YES / NO  

| Check | Result |
|-------|--------|
| **G. Production smoke overall** | PASS / FAIL |
| **H. Critical routes tested** | `/login` `/dashboard` `/my-deals` `/documents` `/document-center` `/credit-workbench` |
| Client navigation flow | PASS / FAIL |
| **I. Shell / layout** | PASS / FAIL |
| **J. Notification (≤1 toast)** | PASS / FAIL |
| **K. CHANAKYA header containment** | PASS / FAIL |
| Viewport 1280px | PASS / FAIL |
| Viewport 1440px | PASS / FAIL |
| **L. Browser / runtime errors** | None / List |

---

## Failure detail (if BLOCKED)

| Item | Detail |
|------|--------|
| Exact failure | |
| Affected route | |
| Affected component | |
| Likely cause | |
| Deployed commit contains change? | YES / NO / UNKNOWN |
| Recommended next step | |

**Policy:** STOP · no speculative CSS · no automatic rollback · diagnose first.

---

## M. Final certification status

```
[ ] READY FOR PRODUCTION
[ ] BLOCKED
```

**Product Owner sign-off:** ___________________  
**Date:** ___________________

---

## Certification formula

```
BUILD PASS
+ FEATURE TEST PASS
+ PRODUCTION SHELL SMOKE PASS
+ CRITICAL ROUTE SMOKE PASS
= PRODUCTION CERTIFIED
```

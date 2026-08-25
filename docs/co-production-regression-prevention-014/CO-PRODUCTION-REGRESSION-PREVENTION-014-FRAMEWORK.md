# CO-PRODUCTION-REGRESSION-PREVENTION-014 — Production Regression Prevention Framework

**Status:** APPROVED · Permanent release-engineering discipline  
**Baseline commit:** `538e733` (CO-PRODUCTION-UX-STABILIZATION-013)  
**Incident reference:** CO-CHANAKYA-PRODUCTION-REGRESSION-012  

This framework does **not** change application behaviour. It defines how Catalyst One production deployments are certified so global shell, navigation, layout, header, notification, and critical-route regressions cannot pass silently.

---

## Core rule

```
BUILD PASS
+ FEATURE TEST PASS
+ PRODUCTION SHELL SMOKE PASS
+ CRITICAL ROUTE SMOKE PASS
= PRODUCTION CERTIFIED
```

**BUILD PASS ≠ PRODUCTION PASS.**  
A successful `npm run build` and `npx tsc --noEmit` alone must **never** be treated as production certification.

---

## 1. Clean-SHA deployment discipline

Every production deployment must record:

| Field | Source |
|-------|--------|
| Git branch | `git rev-parse --abbrev-ref HEAD` |
| Exact commit SHA | `git rev-parse HEAD` |
| Commit message | `git log -1 --format=%s` |
| Deployment target | e.g. `https://catalyst-one.rupeecatalyst.com` |
| Deployment timestamp | ISO-8601 at deploy time |

**Policy:**

- Production deploys from a **committed Git SHA only**
- **Never** deploy from a dirty working tree
- Before deploy: `git status --short` — unrelated dirty/untracked files must **not** be included in the artifact

**Gate script:** `npm run cert:production-clean-sha`

CI / Hostinger deploy should use `CERT_STRICT_UNTRACKED=1` for a fully clean checkout.

---

## 2. Production smoke certification

**Gate script:** `npm run cert:production-shell-smoke`

Uses approved BAT authentication (`CATALYST_BAT_URL`, `CATALYST_BAT_EMAIL`, `CATALYST_BAT_PASSWORD`). Never weakens auth.

**Critical routes (minimum):**

- `/login`
- `/dashboard`
- `/my-deals`
- `/documents`
- `/document-center`
- `/credit-workbench`

---

## 3. Global shell checks (REGRESSION-012)

Every smoke run verifies:

- Sidebar visible and positioned correctly
- Main content starts after sidebar (`main.x >= sidebar.right`)
- No horizontal page clipping (`h1` not under sidebar)
- Header contained within viewport
- CHANAKYA intelligence bar contained; no overlap with action cluster
- Notification UI does not cover primary workspace controls
- No unexpected horizontal overflow
- No major `pageerror` / console errors (favicon excluded)
- Client-side navigation works (sequential sidebar flow)

---

## 4. Notification regression check

Production notification **presentation contract** (post-013):

- Maximum **ONE** visible toast (`data-ene-visible-toasts="1"`)
- Additional notifications remain in internal queue
- Priority ordering preserved in queue module
- Toast does not cover workspace controls (bottom-right, bounded height)
- Notification history / unread count unchanged (presentation-only gate)

Verified on the **live application shell**, not in isolation.

---

## 5. CHANAKYA header check

- Live Intelligence bar inside its container
- No header expansion displacing navigation
- No overlap with notifications / profile / CHANAKYA AI cluster
- Long messages truncated / marquee-contained
- Tested at **1280px**, **1440px**, and default desktop widths

---

## 6. Critical route navigation

Sequential client navigation:

```
Dashboard → My Deals → Documents (primary sidebar)
→ Document Center (dashboard quick action when present)
→ Credit Workbench (in-app link or SPA deep-link goto)
```

Credit Workbench is **not** in primary sidebar (command palette / journey module). Direct route probes always cover `/credit-workbench`.

---

## 7. Build + static gates (engineering)

Before production deploy, continue to require:

| Gate | Command |
|------|---------|
| TypeScript | `npx tsc --noEmit` |
| Production build | `npm run build` |
| Scope verify scripts | e.g. `verify:co-notification-001`, Chanakya verify suite |

Master runner (`cert:production-regression-014`) runs Clean-SHA + TSC + shell smoke by default.  
Full build is opt-in: `CERT_RUN_BUILD=1`.

---

## 8. Deployment certification report

Use template: [DEPLOYMENT-CERTIFICATION-REPORT-TEMPLATE.md](./DEPLOYMENT-CERTIFICATION-REPORT-TEMPLATE.md)

Master runner emits JSON under `docs/co-production-regression-prevention-014/reports/`.

**Final status:** `READY FOR PRODUCTION` or `BLOCKED`

---

## 9. Failure policy

If any critical production smoke check fails:

1. **STOP**
2. Do **not** recommend speculative CSS/layout changes
3. Do **not** rollback automatically
4. Report: exact failure · affected route · affected component · likely cause · whether deployed commit contains the change · recommended next diagnostic step
5. No production fix until failure is understood

Shell smoke JSON includes `failurePolicy` guidance per failure.

---

## 10. Change isolation

Do **not** combine in one uncontrolled deployment:

- Feature development
- Unrelated notification/layout fixes
- Database migrations
- Production deployment

One deployment = one clearly identifiable scope.

---

## 11. Regression baseline

Known-good shell reference: **`538e733`** — `fix(production): stabilize notification and Chanakya chrome`

See [REGRESSION-BASELINE-538e733.md](./REGRESSION-BASELINE-538e733.md)

---

## Quick commands

```bash
# Pre-deploy discipline
npm run cert:production-clean-sha

# Production shell smoke (BAT required)
npm run cert:production-shell-smoke

# Full 014 certification (clean SHA + tsc + smoke)
node --env-file=.env.local scripts/co-production-regression-014-certify.mjs

# Static framework verify
npm run verify:co-production-regression-014
```

Optional evidence: `CERT_SHELL_SCREENSHOTS=1`

---

## Related

- CO-CHANAKYA-PRODUCTION-REGRESSION-012 (incident RCA)
- CO-PRODUCTION-UX-STABILIZATION-013 (fix baseline)
- CO-QA-001 / CO-CERT-005 (existing certification gates)
- `.cursor/rules/business-functional-certification-report.mdc`

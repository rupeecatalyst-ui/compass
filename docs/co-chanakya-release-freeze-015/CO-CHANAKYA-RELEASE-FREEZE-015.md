# CO-CHANAKYA-RELEASE-FREEZE-015 — Hostinger Production Freeze

**Status:** ACTIVE  
**Authority:** Product Owner  
**Effective:** Immediately — remains active through remaining Chanakya development / refinement sprints until FINAL CUTOVER approval.

## Principle

Hostinger production is frozen for Chanakya-related production cutover.

- Build / TypeScript / BAT / verify / local pass ≠ production deployment authorisation  
- Commit ≠ deploy  
- Push ≠ deploy  

Only explicit Product Owner approval of the **FINAL CUTOVER** authorises Hostinger production deployment.

## Forbidden without separate PO production approval

- Hostinger deploy or deploy triggers  
- `prisma migrate deploy` against production  
- Production environment variable changes  
- Production schema or data changes  
- Production document re-uploads  
- Production cutover

## Allowed

Local development, local verification, and Git commit/push to the designated branch (when authorised for that sprint). Unrelated dirty work must stay out of Chanakya commits.

## Final cutover sequence (high level)

1. PO confirms planned Chanakya refinement sprints complete  
2. Freeze final feature tree  
3. Full verification suite · tsc · production build · Chanakya BAT · regression-prevention certification  
4. Confirm clean Git SHA, complete diff, env vars, Prisma migrations + order, document storage, OAuth, Credit Workbench, Accounting, no unrelated changes  
5. Produce **FINAL CUTOVER READINESS REPORT** → **STOP**  
6. Deploy **only** after explicit PO FINAL CUTOVER approval, certified SHA only  
7. Post-deploy production validation (identity, BAT, critical routes, CHANAKYA, Credit, Document Intelligence, Accounting, OAuth, chrome/notifications, document retrieval, opportunity/org isolation, read-only enforcement)

## Failure policy

If production validation fails: **STOP**. Do not speculative-fix production. Do not rollback unless specifically approved. Diagnose exact failure and report evidence.

## Cursor rule

`.cursor/rules/co-chanakya-release-freeze-015.mdc` (always apply)

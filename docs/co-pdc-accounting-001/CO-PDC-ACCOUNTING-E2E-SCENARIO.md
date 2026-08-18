# E2E Business Scenario Pack — Post-Disbursement Confirmation + Accounting

### Scenario ID
CO-PDC-ACCOUNTING-E2E-001

### Business path
Deal → Disbursed → (72h server schedule) → Post-Disbursement Confirmation / Confirmation Pending → red Kanban warning + owner Task → Confirmation Received → Accounting Case → later Invoice (out of scope)

### Preconditions
- `ENTERPRISE_PERSISTENCE_MODE=prisma`
- Migration `20260815113000_post_disbursement_confirmation_accounting_case` applied (ops)
- CRON_SECRET configured for production cron
- Authenticated ADMIN/SUPER_ADMIN for Confirmation Received
- Deal has resolvable owner (`primaryOwnerUserId` / RM / createdBy)

### Steps
1. Mark an eligible Deal Disbursed.
2. Confirm no Accounting Case and no PDC confirmation task yet.
3. Advance schedule dueAt (or wait 72h) and run `/api/cron/post-disbursement-confirmation`.
4. Observe Lender Pipeline: stage Post-Disbursement Confirmation, sub-stage Confirmation Pending, red **LENDER CONFIRMATION PENDING**.
5. Open Tasks as Deal owner — task **Obtain Lender Disbursement Confirmation** appears (high, due same day).
6. Re-run cron — no duplicate task / no duplicate stage transition.
7. Select **Confirmation Received** (admin).
8. Confirm red warning gone, task completed, Accounting Case exists, EAR events present.
9. Retry Confirmation Received — no duplicate Accounting Case.

### Expected business outcomes
- Disbursed does not create Accounting or invoice.
- Confirmation Pending creates one owner task and Kanban alert.
- Confirmation Received activates one Accounting Case and closes the task.
- Invoice remains a later Accounting action.

### Related domains (re-run triggers)
- Deal stage transitions / schedule table
- EnterpriseDealTask / ETE hydrate
- Accounting Case registry
- EAR activity emission
- Lender Pipeline Kanban

### Last run
Date: pending Product Owner BAT  
Environment URL: not deployed (implementation stop)  
Result: engineering verify only  
Evidence: `npm run verify:co-accounting-post-disbursement`

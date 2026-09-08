# E2E Business Scenario Pack — Home Loan / HL BT Policy & Recommendation

### Scenario ID
CO-C1-HL-BT-POLICY-001-E2E-001

### Business path
COMPASS Fresh Home Loan / Home Loan Balance Transfer → sequential discovery → Assisted Offer (until programmes are uploaded) → Talk to an Expert → Contact + Opportunity (`dialogue` then `requirement_captured` on submit) → COMPASS Assessment tab → specialist SLA.

### Preconditions
- No live lender categories or verified programmes activated (this build must not seed them).
- Organisation working calendar falls back to Organization Workspace Settings.
- SMS OTP remains disabled until DLT/provider credentials are configured.

### Steps
1. Open COMPASS Fresh Home Loan discovery. Confirm one question (or small related group) at a time; name after property; mobile before income; email at the end.
2. Complete a salaried journey. Confirm the public result is Assisted Offer + Talk to an Expert, not fabricated lender cards.
3. Repeat for Balance Transfer only and Balance Transfer with Top-up.
4. Click Talk to an Expert twice. Confirm one Opportunity, one task, one SLA timer.
5. In Catalyst One Opportunity Workspace, open COMPASS Assessment. Confirm journey answers, calculation snapshot and SLA controls.
6. Record Connected. Confirm borrower copy becomes “Our Home Loan Specialist has connected with you.” and the timer stops.
7. Confirm existing Deal `lenderProgramId` stamps are unchanged.

### Expected business outcomes
- Public HL/BT path never shows empty rejection.
- No live CHANAKYA/public lender card without an approved, active, effective, complete programme plus an active A/B/C category assignment.
- Canonical initial Opportunity write remains `dialogue` (CO-OPP-002). Draft is not reintroduced.

### Related domains (re-run triggers)
COMPASS gateway, Opportunity Registry, ETE, Organisation calendar, lender programmes, recommendation masters, Advantage calculator base amount.

### Last run
2026-09-08 · Isolated worktree `co-c1-hl-bt-policy-recommendation-001` · ancestry `db72f61` · Result: focused verify Pass; `tsc --noEmit` Pass; scoped ESLint Pass; Catalyst One Next production build Pass (`BUILD_ID` `0IjakvliYpERHDLXBKdyV`, migrate-on-build off). Live Hostinger smoke Blocked — no disposable Postgres, no `psql`/`docker`, production migrate not run. Browser E2E not executed.

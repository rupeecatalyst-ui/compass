# CO-ARCH-003 — Opportunity Registry Completion (BAT Visibility)

**Date:** 2026-07-24  
**Scope:** Business entity visibility for BAT — Opportunity Registry + Deal Registry validation

---

## Delivered

### Part 1 — Opportunity Registry (My Opportunities)

| Item | Detail |
|------|--------|
| Route | `/my-opportunities` |
| Nav | Primary Column 1 — after Contacts, before My Deals |
| SSOT | `GET /api/enterprise-opportunities` |
| Columns | Opportunity Ref · Customer · Product · Stage · Owner · Created · Last Updated · Status |
| Capabilities | Enterprise search · stage/status filters · sort · pagination · Refresh · Open Opportunity Workspace |
| Immediate visibility | `notifyOpportunitiesUpdated` on create + subscribe on registry + loan-files sync |

### Part 2 — Deal Registry validation

See `CO-ARCH-003-DEAL-REGISTRY-VALIDATION-REPORT.md`.

**Fixes applied (not a rebuild):** same-tab refresh; Opportunity number join + column.

**Deferred:** Deal row open path still `/credit-bench` (D4).

### Part 3 — Standard BAT

1. Create Contact  
2. Start Journey  
3. Verify Opportunity in **My Opportunities**  
4. Create Deal (with Enterprise Lender)  
5. Verify Deal in **My Deals**  
6. Open Opportunity Workspace (from My Opportunities row)  
7. Open Deal Workspace (note: current My Deals open → Opportunity Workspace / Credit Bench until D4 certified)

---

## Explicitly not changed

- Loan Journey navigation / post-create redirect  
- Intermediate Loan Information screen  
- Deal Registry rebuild  

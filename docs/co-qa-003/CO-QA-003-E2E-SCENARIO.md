# CO-QA-003 — E2E Business Scenario Pack

**Scenario ID:** `CO-QA-003-E2E-001`  
**Standard:** CO-QA-001  
**Module:** Strategy Workbench · Enterprise Lender Registry Search  
**Status:** OPEN until live Pass

---

## Business objective

RM can search and select major lenders from the Enterprise Lender Registry in Strategy Workbench, add them to the Execution Queue, Move to Deal, and see the selection persist after refresh and re-login.

## Canonical business path

```text
Login → Opportunity → Strategy Workbench (LIFE)
  → Manual Recommendation search ICICI / HDFC / SBI
  → Select → Execution Queue → Move to Deal → Save
  → Refresh / Logout+Login → lender still present
```

## Preconditions

| Item | Value |
|------|--------|
| Auth | `admin@compass.com` / `Admin@123` |
| Persistence | `ENTERPRISE_PERSISTENCE_MODE=prisma` |
| Registry | Active lenders in Postgres (ICICI, HDFC, SBI, Axis, Kotak) |
| Build | Includes CO-QA-003 auth flush + error surfacing |

## Steps (live application)

1. Login as Business Certification Admin.  
2. Open an Opportunity.  
3. Navigate to Strategy Workbench / Funding Strategy (LIFE).  
4. In Manual Recommendation, search **ICICI** — verify ICICI appears (not stuck on Searching…).  
5. Search **HDFC** — verify HDFC appears.  
6. Search **SBI** — verify SBI appears.  
7. Select a lender → appears in Execution Queue.  
8. Move Opportunity to Deal / complete Move to Deal flow.  
9. Save.  
10. Refresh page — selected lender / Deal still present.  
11. Logout → Login → open same Opportunity — lender selection / Deal still present.  

## Expected business outcomes

| # | Observable result | Pass? |
|---|-------------------|-------|
| 1 | Searching… clears within a few seconds | ☐ |
| 2 | ICICI results shown | ☐ |
| 3 | HDFC results shown | ☐ |
| 4 | SBI results shown | ☐ |
| 5 | Select adds to Execution Queue | ☐ |
| 6 | Move to Deal succeeds | ☐ |
| 7 | Persists after refresh | ☐ |
| 8 | Persists after re-login | ☐ |
| 9 | Network: `GET /api/lender-registry/lenders` 200 with items | ☐ |

## Related domains (re-run triggers)

- `authenticatedJsonFetch` / auth refresh  
- `listCanonicalEnterpriseLenderOptionsAsync` / lender registry API  
- Tier-2 lender seed / production reset of lender master  
- Strategy Manual Recommendation UI  
- Deal Identify Additional Lender search  

## Last run log

| Date | URL | Result | Evidence notes | Runner |
|------|-----|--------|----------------|--------|
| 2026-07-27 | pending | ⏸️ Blocked | Fix implemented; live BAT not yet executed | — |

## Certification gate

- [ ] Scenario Pack executed on live app  
- [ ] All expected outcomes observed  
- [ ] Product Owner acceptance  

Build / TypeScript / Lint / verify / smoke alone do **not** certify this module.

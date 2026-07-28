# CO-QA-002 — E2E Business Scenario Pack

**Scenario ID:** `CO-QA-002-E2E-001`  
**Standard:** CO-QA-001  
**Module:** Lender Pipeline Kanban Delete Persistence  
**Status:** OPEN until live Pass

---

## Business objective

A deleted Lender Pipeline Kanban card must stay deleted after refresh, re-login, and cross-module navigation.

## Canonical business path

```text
Login → Create Opportunity → Move to Deal / Identify Lender
  → Lender Pipeline Kanban
  → Delete card
  → Refresh / Logout+Login / navigate away and back
  → Card absent
```

## Preconditions

| Item | Value |
|------|--------|
| Auth | `admin@compass.com` / `Admin@123` |
| Persistence | `ENTERPRISE_PERSISTENCE_MODE=prisma` |
| Build | Includes CO-QA-002 soft-delete in `persistDealPipelineLenders` |

## Steps (live application)

1. Login as Business Certification Admin.  
2. Create (or open) an Opportunity and move into Lender Pipeline (Deal Workspace).  
3. Ensure at least one Kanban card exists (Identify Additional Lender if needed). Note Deal number / lender name.  
4. Delete the Kanban card (Remove).  
5. Verify success notification (“Lender deal deleted.”).  
6. Refresh the page.  
7. Verify the card is still absent.  
8. Logout.  
9. Login again.  
10. Open the same Opportunity / Deal Lender Pipeline.  
11. Verify the card is still absent.  
12. Navigate across Dashboard → My Opportunities → My Deals → return to Pipeline.  
13. Verify the card never reappears.  
14. (DB optional) Confirm `enterprise_deals.is_deleted = true` for that Deal id.

## Expected business outcomes

| # | Observable result | Pass? |
|---|-------------------|-------|
| 1 | Success notification on delete | ☐ |
| 2 | Card gone immediately | ☐ |
| 3 | Card gone after refresh | ☐ |
| 4 | Card gone after logout/login | ☐ |
| 5 | Card gone after cross-module navigation | ☐ |
| 6 | Network: `DELETE /api/enterprise-deals/:id` observed | ☐ |

## Related domains (re-run triggers)

- `persistDealPipelineLenders` / Deal Workspace host  
- Enterprise Deal soft-delete API / repository list filters  
- Deal session cache / `listDealsByOpportunity`  
- Identify Additional Lender create path  
- Any hydration of Pipeline from `snapshot.lenders`  

## Last run log

| Date | URL | Result | Evidence notes | Runner |
|------|-----|--------|----------------|--------|
| 2026-07-27 | production | ❌ Fail | Mehernosh Dastoor — UI delete only; Postgres `is_deleted` remained false; no soft_delete_records. See `CO-QA-002-MEHRROSH-BAT-FAILURE-RCA.md` | BAT |
| pending | after explicit `removeLenderPipelineDeal` deploy | ⏸️ | Re-run same customer | — |

## Certification gate

- [ ] Scenario Pack executed on live app  
- [ ] All expected outcomes observed  
- [ ] Product Owner acceptance  

Build / TypeScript / Lint / verify / smoke alone do **not** certify this module.

# FS-01 Production Blockers — RCA & Fix (2026-07-24)

**Status:** Remediation deployed — awaiting Product Owner re-BAT  
**Business Certification:** BLOCKED until PO validates  
**Foundation Freeze:** PENDING  

---

## Blocker 1 — Authentication instability (“Invalid or expired token”)

### Root cause
Access JWTs expire (~15 min). Many browser clients used raw `fetch` + Bearer token **without** `/api/auth/refresh` on 401. Route Handlers return `Invalid or expired token`. Edge middleware only checks cookie **presence**, so the UI stayed “logged in” while APIs failed.

Secondary defect: `authenticatedJsonFetch` could let stale `Authorization` from `init.headers` override a refreshed token.

### Fix
- Harden `authenticatedJsonFetch` (header order + failed-refresh logout parity with axios)
- Route ECM, Tier-2 registries, Reference Masters, Invoice Party, Soft Delete, Lender Registry clients through `authenticatedJsonFetch`

### Regression
Low — same refresh contract as existing axios interceptor. Failed refresh still clears session and redirects to login.

---

## Blocker 2 — Move to Deal succeeds but Lender Pipeline empty

### Workflow trace

| Step | Result |
|------|--------|
| Opportunity → Move to Deal | OK |
| Ensure LoanFile attachment | OK |
| `syncShortlistToIdentified` (local lenders) | OK |
| `POST /api/enterprise-deals` | OK (Deal in Registry) |
| Navigate to Lender Pipeline | OK |
| Loan Workspace hydrate | **BREAK** — stale DAL cache (no lenders) served, then `saveDeals` wiped good localStorage |
| Enterprise map → LoanFile | **No lenders projection** from Deal snapshot |

### Root cause
Deal **was created**. Break was **UI hydrate**: stale `enterpriseDealCache` without `lenders[]` overwritten localStorage; Deal→LoanFile mapper did not rebuild pipeline cards.

### Fix
- `updateDeal` / Move to Deal always upsert DAL cache with final lenders + deal identity
- Skip `saveDeals` until Enterprise async hydrate completes
- Project Identified lender cards from Deal snapshot / primary counterparty when local lenders missing

### Regression
Low–medium — Pipeline now prefers local lenders when present; snapshot projection is Identified-stage recovery only.

---

## Product Owner re-test

1. Sign in, wait past ~15 minutes or force expired access token → confirm modules recover via refresh (no spurious “Invalid or expired token” storm).  
2. LIFE → Move to Deal → confirm Deal appears in **Lender Pipeline Identified**.  
3. Confirm Deal still listed in My Deals / Deal Registry.

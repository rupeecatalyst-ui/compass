# CO-MASTER-004 — Deployment + Live BAT Evidence

**Status:** Deployed · Verified · Awaiting no further code changes  
**Date:** 2026-08-09  
**No functional changes after Product Owner approval**

---

## Deployment

| Field | Value |
|-------|--------|
| Status | Ready (Production) |
| Deployment ID | `dpl_Cri2E7NJsMTsEW9tHNwVVaRpbe3z` |
| Production alias | https://catalyst-one-two.vercel.app |
| Unique URL | https://catalyst-klpg1s45g-rupee-catalyst.vercel.app |
| Lenders desk | https://catalyst-one-two.vercel.app/lenders |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/Cri2E7NJsMTsEW9tHNwVVaRpbe3z |

---

## Architecture (frozen)

```text
Product Master → canonical product code → Product–Lender Matrix → Enterprise Lender Directory
```

Legacy hardcoded `ELW_DIRECTORY_PRODUCTS` slug filter is **not** present in the deployed Directory workspace.

---

## Live BAT (post-deploy SSOT verify)

Shared production database · `npm run verify:co-master-004` **PASS** after deploy.

| # | Check | Result |
|---|--------|--------|
| 1 | Open Enterprise Lender Directory | Live `/lenders` reachable on production alias |
| 2 | Home Loan | **197** displayed = **197** matrix |
| 3 | LAP | **161** / **161** |
| 4 | Personal Loan | **197** / **197** |
| 5 | UBL (Unsecured Business Loan) | **236** / **236** |
| 6 | Commercial Purchase | **3** / **3** |
| 7 | Search + product (Home Loan + PNB) | **2** |
| 8 | Clear | Resets to `product: "all"` / page 1 (unchanged wiring) |
| 9 | Pagination | Uses filtered set; product change resets page (unchanged wiring) |
| 10 | Master-data / mappings changed? | **No** — deploy-only; verify is read-only |

---

## STOP

Product Owner BAT evidence complete. No further changes.

# CO-WP-BAT-006 — Wealth Partner App Deployment

**Status:** DEPLOYED · DEVELOPMENT STOPPED — AWAITING PRODUCT OWNER BAT  
**Date:** 2026-08-03  
**Priority:** CRITICAL  
**PO Approval:** Deploy Wealth Partner App only (Catalyst One untouched)

---

## Live URLs

| Surface | URL |
|---------|-----|
| **Wealth Partner App** | https://wealth-partner-app.vercel.app |
| Deployment alias | https://wealth-partner-2qssdoq1v-rupee-catalyst.vercel.app |
| Inspect | https://vercel.com/rupee-catalyst/wealth-partner-app/HjZ6Tr4Pmt6CUPHgpgtY9RtZWUq3 |
| Catalyst One API (unchanged) | https://catalyst-one-two.vercel.app |

---

## Version & build

| Field | Value |
|-------|--------|
| **Version** | `0.9.3` |
| **Label** | Product Owner BAT-006 |
| **Sprint** | `CO-WP-BAT-006` |
| **Build Number** | `dpl_HjZ6Tr4Pmt6CUPHgpgtY9RtZWUq3` |
| **Deployment Time (IST)** | 2026-08-03 21:00:56 IST |
| **Git Commit Hash (WP)** | *No git history — use deployment ID* |
| **Build Status** | ✅ READY (production) |

---

## Pre-deployment validation

| Check | Result |
|-------|--------|
| TypeScript (`tsc -b`) | ✅ |
| Production build (`vite build`) | ✅ |
| Lint (`oxlint`) | ✅ |
| Catalyst One modified | ❌ No (WP-only deploy) |

---

## Smoke test (automated, unauthenticated)

| Check | Result |
|-------|--------|
| `/` · `/login` | ✅ HTTP 200 |
| `/app/home` | ✅ HTTP 200 (SPA shell) |
| `/app/business` (My Business) | ✅ HTTP 200 |
| `/app/customers` (Customer Workspace entry) | ✅ HTTP 200 |
| Opportunity / Deal routes (SPA) | ✅ HTTP 200 (`/app/opportunities/new`) |
| `/app/identity` (Professional Identity) | ✅ HTTP 200 |
| JS / CSS assets | ✅ HTTP 200 |
| Bundle stamp `0.9.3` / BAT-006 | ✅ Present in production JS |
| Catalyst One `/api/partner/health` | ✅ HTTP 200 |
| Authenticated UI (login → desks) | ⚠️ Manual BAT with Product Owner credentials |

---

## Summary of changes included

- Latest Wealth Partner App working tree (Catalyst Connect)
- Version stamp → **0.9.3** / **CO-WP-BAT-006**
- Prior certified surfaces: Home · My Business · Customer Workspace · Opportunity/Deal Workspace · Professional Identity · Partner API connectivity

---

## Stop condition

**STOP DEVELOPMENT.**  
Do not begin any new development.  
Await Product Owner BAT.

# CO-UX-008 — Enterprise CHANAKYA Loading Experience Framework

**Status:** Business Certification **APPROVED** · Held for consolidated production-readiness deployment  
**Date:** 2026-07-27  
**Supersedes:** CO-UX-024 (evolved in place — single implementation)

## Certification

| Item | Status |
|---|---|
| Business Certification | **APPROVED** (2026-07-27) |
| Architectural approach | Accepted |
| Independent Vercel deploy | **Deferred** — include in next consolidated production-readiness deployment |
| Milestone Git commit | **Deferred** — with consolidated release |

## Constitution

Users should never wait without receiving value. Loading informs, guides, educates, and reassures.

## Delivered

### Levels
- Level 1 (&lt;500ms): no UI  
- Level 2 (500ms–2s): CHANAKYA + preparing line  
- Level 3 (&gt;2s): rotating prioritised messages (2.5s fade)

### Categories & priority
Critical → Pending work → Business insights → Progress → Tips → Knowledge / Status  

Tips and knowledge deferred when critical/pending work exists.

### Data
- Live signals from **EBI compose** (`deriveChanakyaLoadingSignalsFromEbi`)  
- No duplicated metric formulas  

### Surfaces
- `ChanakyaLoadingExperience` — canonical  
- `EnterpriseLoadingSurface` — controlled async gate  
- Route Suspense fallbacks / `app/loading.tsx` / GlobalLoading / CommandShellLoading / AuthGuard  

### Module catalogs
Dashboard, My Opportunities, My Deals, Loan Journey, Contacts, Contact Strategy, Mission Control, Documents, Credit, Tasks, Reports, Administration, Settings, Enterprise

### Wired routes / desks (non-exhaustive)
Dashboard · My Opportunities · My Deals · Contacts · Mission Control · Loan Journey · Tasks · CHANAKYA Radar · Lead Information · LIFE / Opportunities · Documents · Credit Bench / Workbench · Deal redirects · Admin Users · Auth session gate · Customer Engagement / Document portals · EME admin panel · Opportunity recommendation panel · Visual Analytics

### Spinner policy
- Full-page / panel waits → CHANAKYA only  
- Button-level busy glyphs (Save / Force Recalculate / upload) may retain compact `Loader2` — not full wait experiences  
- KPI micro-counts use pulse skeletons, not spinners  

## Performance

Completion never waits for the next rotation cycle. Level 1 loads skip overlay entirely via `EnterpriseLoadingSurface`.

## Pre-deployment regression gate (static)

Run before consolidated Vercel deploy:

```bash
npm run ux:chanakya-loading:verify
```

| Surface | Chanakya route/shell | Legacy full-page spinner | Notes |
|---|---|---|---|
| Dashboard | ✅ | None | Suspense + visual analytics panel |
| My Opportunities | ✅ | None | Button/refresh micro-busy retained |
| My Deals | ✅ | None | — |
| Contacts | ✅ | None | Wizard Save `Loader2` retained |
| Mission Control | ✅ | None | `CommandShellLoading` → Chanakya |
| Loan Journey | ✅ | None | — |
| Tasks | ✅ | None | — |
| Reports | ✅ | None | EI viz compact `Loader2` retained |
| Customer Portal | ✅ | None | EBI signals off on public portal (correct) |
| Administration | ✅ (Users, Reference Masters, EME) | None | Product Library / Production Reset: sync pages; button `Loader2` only |

### Gate checks

| Check | Result |
|---|---|
| No legacy full-page spinners (`fixed` + `Loader2` page shells) | ✅ |
| CHANAKYA messages on canonical route Suspense / Auth / root loading | ✅ |
| EBI insights via `composeBusinessIntelligenceSnapshot` | ✅ |
| No artificial loading delay after data ready | ✅ (complete immediately; ≤900ms completion flash) |
| Button-level busy independent of Chanakya | ✅ |

## Residual (non-blocking for APPROVED architecture)

- Product Library admin pages and Production Reset are sync/button-busy desks without route Suspense Chanakya shells — acceptable under button-level policy; optional polish later.
- Some registry table hydrates still use compact text/`Loader2` rows (Users, Reference Masters) — progressive cleanup, not full-page spinners.

## Deployment policy (locked)

Do **not** deploy CO-UX-008 independently.  
Keep the working tree.  
Include in the **single consolidated production-readiness Vercel deployment**, then one Business & Functional Certification report and milestone commit after remaining queued prompts complete.

# CO-ARCH-003 — Enterprise Processing Architecture & Critical User Journey

**Status:** OPEN — Architecture codified; Sprint 1 Tier 1 path deferrals shipped; BAT/RUM pending  
**Date:** 2026-07-28  
**Authority:** Product Architecture · Permanent principle  

> Note: Historical `docs/co-arch-003/` Deal/Opportunity constitutional waves remain separate. This document is the **processing-tier** constitution for operational performance.

---

## Principle

Every feature belongs to **exactly one** tier.

| Tier | Mode | Rule |
|------|------|------|
| **1 — Critical User Journey** | Synchronous, user waiting | Validate → write → commit → respond **only** |
| **2 — Background** | After commit / idle | Notifications, timeline, audit, ETE, EDC, messaging, cache warm |
| **3 — Enterprise Intelligence** | Scheduled (default overnight) | Scores, EME, dashboard aggregates, AI insights, rankings |

**No Tier 2 or Tier 3 work may block Tier 1.**

### Tier 1 targets

| Action | Target | Maximum |
|--------|-------:|--------:|
| Simple action | &lt; 1s | 5s |
| Screen open | &lt; 2s | 5s |
| Save | &lt; 2s | 5s |
| Move to Deal | &lt; 3s | 5s |

Strategy shortlist remains **Primary + Secondary only** (CO-ARCH-002 shortlist max two).

---

## Sprint 1 — Critical path deferrals (shipped)

| Change | Before | After | Tier move |
|--------|--------|-------|-----------|
| EME dashboard miss | `await forceRecalculate` on GET | Return null + background warm | 3 off Tier 1 |
| Deal stage transition | await timeline + snapshot + re-read | Return updated; `after()` Tier 2 writes | 2 off Tier 1 |
| Deal PATCH save | await timeline (+ snapshot) | Return serialize; `after()` Tier 2 | 2 off Tier 1 |
| Deal create client | sync ETE generation | `queueMicrotask` ETE | 2 off Tier 1 |
| New Arrivals KPIs | `await hydrateEcmFromPrisma` | Use layout hydrate; no re-dump | 2 off Tier 1 |
| OW intelligence / EDC | Sync on mount effect | `requestIdleCallback` defer | 2/3 off paint |
| Nightly EME | Cron route only | `vercel.json` cron `0 2 * * *` | Tier 3 schedule |

Prior CO-PERF-001/002 request reductions remain in force (parallel Move to Deal, warm session, save merge, lazy company links, lender pageSize 200).

---

## Before vs After (modeled critical path)

| Workflow | Sync extras removed | Est. wall save |
|----------|---------------------|----------------|
| Dashboard cold EME | Full org derive (≤500+500) | Multi-second → instant empty/warm |
| Pipeline stage change | 2–3 DB writes + re-GET | ~0.6–1.2s |
| Deal Save | 1–2 DB writes | ~0.3–0.6s |
| Move to Deal ×2 | ETE ×2 no longer on await | ~0.2–0.6s |
| Opportunity open | Intelligence/EDC after paint | First paint faster |

Full live RUM still blocked by cert login 401 (CO-PERF-001).

---

## SSOT paths

| Concern | Path |
|---------|------|
| Constants | `src/constants/enterprise-processing-architecture.ts` |
| Server Tier 2 | `server/lib/schedule-tier2.ts` |
| Client defer | `src/lib/enterprise-processing-architecture/schedule-client.ts` |
| Cursor rule | `.cursor/rules/enterprise-processing-architecture.mdc` |
| Verify | `scripts/co-arch-003-processing-tiers-verify.mjs` |

---

## Ops requirements

1. Set Vercel `CRON_SECRET` so `/api/cron/enterprise-metrics` is authorised.  
2. Set `DATABASE_URL` `connection_limit=5` (CO-PERF / CO-QA-005).  
3. Restore cert admin password for production profiling.

---

## Certification

**CO-ARCH-003 remains OPEN** until production profiling + BAT show Tier 1 workflows meet targets and Tier 2/3 never block them.

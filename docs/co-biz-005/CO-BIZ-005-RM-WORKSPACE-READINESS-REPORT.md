# CO-BIZ-005 — RM Workspace Readiness Report

**Date:** 2026-07-26  
**Layer:** Enterprise Relationship Manager Workspace  
**Constraint compliance:** Projection only · No duplicate workflow · No parallel task engine · No duplicate KPI formulas

---

## Executive summary

Catalyst One now delivers a definitive **RM morning desk** on User Home (`/dashboard`). The pack composes Today’s Work (ETE), My Pipeline (EBI), Priority Engine, Chanakya Daily Briefing, Customer Snapshots, Productivity Insights, and Quick Actions — without inventing new ownership models.

**Overall RM Workspace Score: 8.2 / 10** · **GO WITH OBSERVATIONS**

---

## Coverage

| Phase | Coverage |
|-------|----------|
| 1 Today’s Work | Follow-ups · Overdue · Meetings · Document collection · Lender actions (ETE) |
| 2 My Pipeline | Opportunities · Active deals · Disbursals · Lost · Value · Conversion · TAT (EBI + Deal DAL enrich) |
| 3 Priority Engine | Critical → Low from ageing, docs, lender SLA, inactivity, stage |
| 4 Chanakya Briefing | Personalised items + recommended actions (advisory) |
| 5 Customer Snapshots | Stage · pending · docs · last interaction · risk |
| 6 Productivity | Completed today · avg hours · movement · closed · weekly pace label |
| 7 Quick Actions | Call · Opp · Deal · Upload · Assign Task · Note |
| 8 Readiness | This report |

---

## ETE integration

- `buildMyWorkView(assigneeRef)` for overdue / due today / upcoming buckets  
- Work-type filters for documents / lender / follow-ups  
- `buildChanakyaWorkloadInsights` + `buildEteOperationalReport` for briefing / productivity  
- Identity: `user:${id}` from session (`resolveRmIdentity`)

---

## EBI integration

- `createRelationshipManagerBiProvider(displayName)` for pipeline value, conversion, TAT, RM focus  
- No recalculation of Radar / EBI formulas in UI

---

## Performance

- Client compose on User Home render (useMemo)  
- No extra network round-trips beyond existing Deal DAL sync already in session  
- Suitable for morning desk; large queues capped (priorities 24 → show 8, customers 12)

---

## Known gaps

1. **Identity bridge** — EBI keys by RM display name; ETE by `assigneeRef`; Deal may use `relationshipManagerUserId`. Projection normalises once but name mismatches remain a data-quality risk.  
2. **Meetings calendar** — Meeting bucket is ETE title heuristics, not a calendar SSOT.  
3. **Document Requests** — Pending docs primarily via ETE Document Collection + optional LOD lookup by opportunityRef; no global RM document-request index.  
4. **Weekly trend** — Narrative from open vs completed pressure; durable week-over-week series deferred (EBI gap).  
5. **Quick Actions** — Navigation into entity modules; full Action Center context still requires an open Opportunity/Deal.

---

## Recommendations

1. Align Deal `relationshipManagerUserId` with ETE assignee on create for perfect “my” filtering.  
2. Optional deep-link `/rm-workspace` → `/dashboard` if product wants a bookmark URL (no new primary nav).  
3. Wire same-session ETE update subscription when a shared event bus exists.  
4. Keep Mission Control executive — never relocate RM desk there.

---

## Architecture

```
Auth session → RmIdentity
                ↓
ETE My Work + EBI RM provider + Document Requests + Deal DAL
                ↓
enterprise-rm-workspace compose
                ↓
User Home /dashboard (RmWorkspacePack)
```

## Final verdict

✅ RM Workspace foundation ready as the **canonical operational home for Relationship Managers** in Catalyst One RC line.

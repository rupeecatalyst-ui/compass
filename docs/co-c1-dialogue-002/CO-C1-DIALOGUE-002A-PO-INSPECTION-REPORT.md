# CO-C1-DIALOGUE-002A — PO Inspection + Refinement Report

**Sprint:** CO-C1-DIALOGUE-002A  
**Basis:** Local inspection of CO-C1-DIALOGUE-002 Transaction Activity Timeline  
**Deployment:** None (forbidden)  
**Wealth Partner / Gateway:** Untouched  
**Migrations / production data:** None

---

## 1. What was inspected

| Surface | Method |
|---------|--------|
| Implementation report | `docs/co-c1-dialogue-002/CO-C1-DIALOGUE-002-IMPLEMENTATION-REPORT.md` |
| EAR projection | `transaction-timeline.ts` — scope, ordering, classification |
| Timeline UI | `TransactionActivityTimeline` |
| Opportunity Workspace | Strategic tab mount, focus maps, Notes retention, Overview jump |
| Deal Workspace | Collapsible timeline on `DealWorkspaceHost` |
| Add Note path | `BusinessNotesActionButton` → EBN service → EAR emit |
| EAR API | Auth gate + org-scoped list |
| Soft session fallback | `listEnterpriseActivity` client fallback behaviour |
| Automated verify | `npm run verify:co-c1-dialogue-002` |
| TypeScript / Lint / Build | Local regression |

**Note:** Interactive browser BAT against live Opportunities/Deals was constrained to code-path + projection inspection in this environment. Sibling isolation, ordering, actor, and noise rules were validated with deterministic corpus in the verify script. Product Owner should confirm visually on a real Opportunity with multiple Deals before consolidated deployment.

---

## 2. What worked

- EAR remains chronology SSOT — no new activity/Dialogue table
- Opportunity **Activity Timeline** tab exists; no `opp-demo-001` / dialogue seed on OW path
- Notes tab retained; Add Note uses existing EBN pathway (no second write API)
- Deal scope correctly includes Deal events + parent Opportunity events without `dealId`
- Sibling Deal events excluded by `filterEventsForScope`
- Newest-first ordering from `occurredAt`
- Filters + local search + Load earlier (bounded limit)
- Deal panel does not block Kanban (collapsible / progressive)
- Stage previous → new when payload carries stage fields
- Actor falls back to **System** when no human actor

---

## 3. What required refinement (002A)

| Issue | Refinement |
|-------|------------|
| Technical / Chanakya / Mission Control noise could clutter “All” | `isOperationalTimelineEvent` gate — hide low-value kinds/sources/titles |
| `sourceSystem` shown on every row felt like a debug log | Removed from user-facing footer |
| Stage arrow could appear on notes if payload had `stage` | Stage pair only for stage/approval/disbursement categories |
| Deal timeline loaded while collapsed | `active={timelineOpen}` — fetch only when expanded |
| Activity Timeline buried at end of OW tabs | Moved to position 2 (after Overview); teal discoverability cue |
| Soft EAR session fallback returned unscoped session cache | `sessionFallback` filters by opportunityId/dealId/contactId |
| Day scanning weak | Day-group headers; time on each item |
| Entity context unclear on Deal view | Labels: **This Deal** vs **Opportunity** |
| Copy too technical (“Enterprise Activity Registry”) | Softened to operational language |

---

## 4. Files changed (002A)

- `src/lib/enterprise-activity-registry/transaction-timeline.ts`
- `src/lib/enterprise-activity-registry/index.ts`
- `src/lib/enterprise-activity-registry/api-client.ts`
- `src/components/catalyst-one/transaction-activity-timeline/transaction-activity-timeline.tsx`
- `src/components/catalyst-one/opportunity-workspace/strategic-tabs.ts`
- `src/components/catalyst-one/opportunity-workspace/workspace-strategic-tabs.tsx`
- `src/components/catalyst-one/opportunity-workspace/workspace-dialogue-panel.tsx`
- `src/components/catalyst-one/opportunity-workspace/workspace-overview-panel.tsx`
- `src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx`
- `scripts/co-c1-dialogue-002-verify.mjs`
- `docs/co-c1-dialogue-002/CO-C1-DIALOGUE-002A-PO-INSPECTION-REPORT.md` (this file)

---

## 5. UX refinements

- Day separators + time-first item headers
- Notes/activities show description in quotes; system/docs/tasks plain
- Filter chips + local “Search this history…”
- OW Overview jump lists Activity Timeline first among continue actions
- Deal summary copy: “What happened on this Deal · expand to load”
- Empty state guides user to Add Business Note (same SSOT)

---

## 6. Security verification

| Check | Result |
|-------|--------|
| EAR GET/POST require access token | ✅ |
| Timeline scoped to current Opp/Deal ids from workspace context | ✅ |
| Sibling Deal exclusion in projection | ✅ |
| Soft session fallback no longer returns enterprise-wide session rows | ✅ (002A) |
| URL with foreign Opp/Deal id | Workspace still must authorize page load; EAR list is **org-scoped**, not per-user entity ACL — **pre-existing EAR limitation** (documented; not expanded in this sprint) |
| RBAC system changed | ❌ No — reused existing auth |

---

## 7. Performance observations

- No N+1 ECM/Deal/Opp hydrations in timeline reader
- Bounded limit (80 → +40 → max 200)
- Deal: EAR fetch deferred until expand (`active` flag)
- OW: timeline loads only when Activity Timeline tab is mounted/visited
- Parallel Deal+Opp EAR queries only in Deal mode

---

## 8. Missing EAR events (gaps — no producers added)

These appear **only if already emitted** into EAR. Inspection did **not** create producers:

| Event | Status |
|-------|--------|
| Business Notes | Emitted via EBN → EAR ✅ pathway intact |
| Deal timeline / stage (deal_timeline) | Emitted from Deal repository when durable ✅ |
| ECIE / dialogue activities | When ECIE dual-writes EAR |
| Document / Document Request | When document sources emit EAR |
| ETE tasks | When task source emits EAR |
| Opportunity Created / Lender Identified / Deal Created | **Gap if not emitted** — report only |
| Approval / Disbursement | **Gap if not emitted** — classification ready when present |
| Chanakya / Mission Control telemetry | Intentionally **filtered out** of operational timeline |

---

## 9. Known limitations

1. Coverage = EAR emission coverage (no new producers in 002/002A)
2. `/dialogue` demo route not promoted
3. Loan modal `FileTimeline` not unified
4. No document click-through
5. Actor role labels only when present on EAR row
6. EAR API is org-scoped after auth — entity-level ACL remains a platform follow-up
7. Interactive multi-Deal BAT on live data still recommended for PO before consolidated deploy

---

## 10. TypeScript result

✅ `npx tsc --noEmit -p tsconfig.json` — pass

## 11. Lint result

✅ Targeted `next lint` on refined timeline paths — pass (no warnings/errors)

## 12. Build result

✅ `npm run build` — pass

## 13. Verification result

✅ `npm run verify:co-c1-dialogue-002` — pass  
(Updated corpus covers noise gate, sibling isolation, stage-pair hygiene, nav discoverability, Deal lazy load, 002A report presence)

---

## Hard stop

No Vercel deployment. No Wealth Partner / Gateway changes. No migrations. No production data changes.

**Waiting for Product Owner approval before consolidated deployment.**

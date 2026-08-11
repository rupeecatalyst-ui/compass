# CO-C1-DIALOGUE-002 — Unified Transaction Activity Timeline

**Status:** Implementation complete · Awaiting Product Owner review  
**Deployment:** None (explicitly forbidden for this sprint)  
**Scope:** Catalyst One only — Wealth Partner App / Gateway untouched

---

## A. Architecture used

- **Chronology SSOT:** Enterprise Activity Registry (`EnterpriseActivityEvent` / EAR)
- **Pattern:** Read/projection + workspace UI — no new activity database, no Dialogue table, no Lead entity, no duplicate Opportunity/Deal activity stores
- **Write paths:** Unchanged — Business Notes, stage engines, document/task emitters continue to emit into EAR through existing services
- **Dialogue Center (`/dialogue`):** Not promoted as the operational solution; still not primary-nav; workspace timeline does **not** default to `opp-demo-001`

## B. EAR reader / projection

| Path | Role |
|------|------|
| `src/lib/enterprise-activity-registry/transaction-timeline.ts` | Unified reader: `loadTransactionActivityTimeline`, `filterEventsForScope`, `classifyEarEvent`, `mapEarEventToTimelineItem` |
| `listEnterpriseActivity` | Existing EAR API client — scoped by `opportunityId` / `dealId` |

**Scope rules**

- **Opportunity mode:** events where `opportunityId` matches
- **Deal mode:** events for this `dealId`, plus parent Opportunity events with **no** `dealId` (shared history). Sibling Deal events (`dealId` ≠ current) are excluded

## C. Components reused

- `WorkspaceDialoguePanel` mount point / name (refactored to EAR reader)
- `BusinessNotesActionButton` / `EnterpriseBusinessNotesPanel` (existing Add Note pathway)
- `subscribeEarUpdated` for same-session refresh
- Deal Workspace collapsible secondary-module pattern (same as Tasks)

## D. Components changed / created

| Path | Change |
|------|--------|
| `src/lib/enterprise-activity-registry/transaction-timeline.ts` | **New** EAR timeline projection |
| `src/lib/enterprise-activity-registry/index.ts` | Exports timeline helpers |
| `src/components/catalyst-one/transaction-activity-timeline/*` | **New** timeline UI |
| `src/components/catalyst-one/opportunity-workspace/workspace-dialogue-panel.tsx` | Refactored → EAR timeline (demo seed removed) |
| `src/components/catalyst-one/opportunity-workspace/strategic-tabs.ts` | Nav: **Activity Timeline** tab |
| `src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx` | Mount timeline tab; focus maps `dialogue`/`timeline` → timeline |
| `src/components/catalyst-one/opportunity-workspace/workspace-overview-panel.tsx` | Jump link to Activity Timeline |
| `src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx` | Collapsible Activity Timeline |
| `scripts/co-c1-dialogue-002-verify.mjs` | Focused verification |
| `package.json` | `verify:co-c1-dialogue-002` |

## E. Opportunity Workspace integration

- New strategic tab: **Activity Timeline** (alongside preserved **Notes**)
- Quick actions “Open Dialogue” / “View Timeline” resolve to the Activity Timeline tab
- Timeline loads only when a real `opportunityId` is present — no demo context

## F. Deal Workspace integration

- Collapsible **Activity Timeline** on `DealWorkspaceHost` (lazy expand, progressive load)
- Scope = current Deal + shared parent Opportunity events
- Sibling lender deals excluded

## G. Event types displayed

Presentation categories mapped from existing EAR `eventKind` / `sourceSystem` (not new producers):

`NOTE` · `ACTIVITY` · `STAGE CHANGE` · `DOCUMENT` · `TASK` · `LENDER` · `APPROVAL` · `DISBURSEMENT` · `SYSTEM`

Only events already present in EAR are shown.

## H. Business Notes handling

- **Notes** tab retained (`WorkspaceNotesPanel` → Enterprise Business Notes SSOT)
- Timeline classifies `business_notes` / `notes` as NOTE
- Add Note from timeline uses the same `BusinessNotesActionButton` → existing create API → EBN service EAR emit

## I. Add Activity handling

- No second write path
- Refresh via `subscribeEarUpdated` + manual Refresh after note save

## J. Stage event handling

- EAR `stage_change` (and deal timeline sources) mapped to STAGE CHANGE
- UI shows previous → new from payload fields (`fromStage`/`toStage`, etc.)
- Stage engine **not** modified

## K. Document event handling

- EAR kinds/sources `documents` / `document` / `document_request` → DOCUMENT
- No new document timeline store
- Deep-link navigation deferred (gap if product wants click-through later)

## L. Task event handling

- EAR `tasks` / `ete` → TASK
- ETE remains task SSOT; timeline is projection only

## M. Security / RBAC

- Timeline uses authenticated EAR list API (`credentials: "include"`)
- No new permission system
- Entity scoping prevents cross-Opportunity / cross-Deal leakage in the projection layer

## N. Performance

- Bounded `limit` (default 80, max 200)
- Deal mode: two parallel EAR queries (`dealId` + `opportunityId`), merge by id, then filter
- No N+1 ECM / lender / task hydrations in the timeline reader
- Deal panel loads on expand (`details`); does not block Kanban

## O. Pagination / loading

- Initial window + **Load earlier activity** (increments limit)
- Skeleton while first load; workspace remains usable

## P. Files changed

See section D. Wealth Partner App / Gateway: **unchanged**.

## Q. Verification results

Run: `npm run verify:co-c1-dialogue-002`

Proves: EAR reader usage, opportunity/deal filtering, no sibling leakage, newest-first ordering, actor resolution, OW/Deal mounts, Notes panel retained, EBN→EAR pathway references intact.

## R. TypeScript

✅ `npx tsc --noEmit -p tsconfig.json` — pass

## S. Lint

✅ Targeted `next lint` on changed dirs — pass (pre-existing unused-var warnings elsewhere in OW; none introduced as errors in new timeline files)

## T. Build

✅ `npm run build` — pass

## U. Regression

✅ `npm run verify:co-c1-dialogue-002` — pass  
Wealth Partner App / Gateway — not modified  
No Vercel deployment performed

## V. Known limitations / gaps (STOP — do not invent producers)

1. **Event coverage = EAR coverage.** If a business action does not already emit EAR, it will not appear. This sprint does **not** add producers.
2. **`/dialogue` route** still exists with historical demo defaults — intentionally not wired as the operational solution.
3. **Loan Workspace modal `FileTimeline`** remains the legacy LoanFile timeline projection; canonical Deal desk timeline is EAR on `DealWorkspaceHost`. Unifying Loan modal Timeline to EAR is a follow-up if Product Owner wants one surface.
4. **Document click-through** to Document Center not implemented.
5. **Full-text enterprise search** not implemented (local filter only).
6. **Actor role labels** (e.g. “Loan Officer”) appear only when present on the EAR event; otherwise name or “System”.
7. Session fallback for EAR list may briefly include broader session cache before scope filter — filtered by `filterEventsForScope` before display.

---

## Product Owner review

Implementation + local verification only. **No Vercel deployment.** Waiting for PO review.

# CO-WF-006 — Enterprise Stage Transition Experience & CHANAKYA Guidance

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-31  
**Principle:** Guide → Recommend → Confirm → Record → Update  

---

## 1. Implementation Summary

Every mid-stage Lender Pipeline Kanban move and Opportunity Workspace stage change opens the shared **Enterprise Stage Transition Dialog**:

- Current → New Stage  
- CHANAKYA advisory sub-stage recommendation  
- Sub-stage dropdown scoped to the target stage only  
- Reason / Outcome note  
- Inline **ECIE Activity Composer** (text + voice + STT)  
- **Save Transition** applies existing EOLE/EWOE or Deal `transitionDeal` sinks  

Specialized gates (Disbursed / Lost / Hold / Login Probe) remain — not duplicated.

Kanban cards now show **Stage + Sub-Stage** badges. Transitions append **EDC** `stage_change` timeline entries (append-only).

---

## 2. Components Modified / Created

| Path | Role |
|---|---|
| `enterprise-stage-transition-dialog.tsx` | Shared dialog |
| `constants/enterprise-stage-transition.ts` | Lender + EOLE sub-stage catalogues |
| `lib/enterprise-stage-transition/` | CHANAKYA recommend helper |
| `lender-pipeline-board.tsx` | Dialog gate + card sub-stage + EDC |
| `workspace-stage-panel.tsx` | OW uses shared dialog |
| `deal-pipeline-runtime.ts` | Persist `caseSubStage` / `toSubStage` |

---

## 3. Enterprise Registries Reused

No new registries. Consumes:

- Lender Pipeline / Deal Registry (`transitionDeal`)  
- EOLE + EWOE (Opportunity)  
- ECIE Activity Composer + Document Registry (audio)  
- EDC timeline (`stage_change`)  

---

## 4. Workflow Integration

- Deal: dialog → `applyMove` (+ `caseSubStage`) → `persistDealPipelineLenders` → `transitionDeal({ toSubStage })`  
- Opportunity: dialog → EWOE `advanceEwoeWorkflowStage` + `changeStage` (existing)  
- No new workflow engine  

---

## 5. ECIE Integration

`EnterpriseActivityComposer` `presentation="inline"` in the dialog. Reason note also saved as typed activity on Deal transitions when provided. Voice/audio follows approved ECIE → Document Registry → EDC path inside the composer.

---

## 6. Timeline Integration

`appendEdcTimelineEntry` with previous/new stage & sub-stage, actor, reason, expandable payload. Append-only — never overwrites history.

---

## 7. Kanban Changes

- Mid-stage drops open Transition Dialog (not immediate move)  
- Card shows Stage badge + Sub-Stage badge (or “Sub-stage —”)  
- Updates immediately after successful Save Transition  

---

## 8. Validation Results

`npm run verify:co-wf-006` — PASS  

---

## 9. Screenshots

Manual BAT: drag Kanban card → dialog → confirm; OW Change Stage → dialog.

---

## 10. Business Acceptance Checklist

- [ ] CHANAKYA recommendation visible and labelled advisory  
- [ ] Sub-stage list matches target stage only  
- [ ] Activity Composer (note + voice) usable in dialog  
- [ ] Save Transition updates Kanban Stage + Sub-Stage  
- [ ] Timeline shows previous/new stage & sub-stage  
- [ ] Disbursed / Lost / Hold / Login Probe still use specialized dialogs  
- [ ] No Prisma / raw DB errors  
- [ ] No new registry introduced  

---

**Known limitations:** Sub-stage catalogue is configuration constants (not Admin MDM UI yet). Opportunity sub-stage not yet PATCHed to Registry `requirementSubStage` (EOLE runtime + timeline recorded). Nightly EME unrelated.

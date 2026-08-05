# CO-UX-017 — Enterprise Deal Control Panel Redesign

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-31  
**Scope:** Kanban right drawer — operational Deal Control (not Strategy Workspace)

---

## 1. UI Changes

- Replaced analysis-first **View Strategy** drawer with **Deal Control Panel**
- Kanban CTA renamed **Deal Control**
- Primary surface: editable ops fields · Sales Contact · Participants · Quick Actions · ECIE Activity Composer · Timeline
- Strategic Score / Rank / FOIR / CIBIL / Income / Policy / ROI moved to **collapsed** “Strategic Analysis (read-only)”

---

## 2. Components Modified

| Path | Role |
|---|---|
| `deal-control-panel.tsx` | New Deal Control Panel |
| `lender-strategy-drawer.tsx` | Re-exports Deal Control (compat) |
| `lender-pipeline-board.tsx` | Opens panel + `onPatch` persist |
| `deal-pipeline-runtime.ts` | Persist ops fields + sales contact dirty detection |
| `deal-pipeline-runtime` types | Snapshot fields for login/disbursement/probability |

---

## 3. Registries Reused

- Enterprise Deal Registry (pipeline persist)
- Enterprise Contact Master (Sales Contact + participant open)
- ECIE Activity Registry + Document Registry (composer / voice)
- EDC timeline (opportunity-scoped recent events)

**No new registries.**

---

## 4. Editable Fields

Loan Amount · Product · Current Stage · Current Sub-Stage · Expected Login Date · Expected Disbursement Date · Priority (probability master)

---

## 5. Contact Registry Integration

`LenderSalesContactCapture` — ECM Lender Employee / Sales designations. Change assignment from panel. Participant rows open `/contacts?contactId=` when linked.

---

## 6. ECIE Integration

Inline `EnterpriseActivityComposer` (`contextType: deal`) — text · voice · STT.

---

## 7. Timeline Integration

Recent ECIE activities for the Deal (+ Sales Contact) and EDC opportunity timeline entries. Append-only; no historical overwrite.

---

## 8. Validation Results

`npm run verify:co-ux-017` — PASS

---

## 9. Screenshots

Manual BAT: Kanban card → Deal Control → edit fields → save → change Sales Contact → add activity → confirm timeline.

---

## Business Acceptance Checklist

- [ ] Panel titled Deal Control / operational first  
- [ ] Strategy metrics collapsed by default  
- [ ] Editable fields save and refresh card  
- [ ] Lender Sales Contact selectable from ECM  
- [ ] Participants list shows roles + mobile  
- [ ] Call / WhatsApp / View Contact work when mobile linked  
- [ ] Activity Composer (note + voice) works  
- [ ] Timeline updates after activity  
- [ ] No new registry / fabricated scores  

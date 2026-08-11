# CO-ARCH-REVIEW-002 — Dialogue Module Architectural Status

**Code:** CO-ARCH-REVIEW-002  
**Nature:** Verification only — no fixes · no implementation  
**Date:** 2026-08-06  

---

## Naming clarification (important)

“Dialogue” appears in **two different senses** in Catalyst One:

| Sense | Meaning |
|---|---|
| **A. Dialogue module / Enterprise Dialogue Center (EDC)** | Operational timeline / dialogue UI + library |
| **B. “Dialogue Opportunity” lifecycle** | Opportunity identity stage (`lifecycleStatus: "dialogue"`) on Start Loan Journey — **not** the Dialogue Center module |

This review answers questions about **Sense A** (Dialogue module / EDC), and notes Sense B only where it could confuse navigation copy.

---

## 1. Does the Dialogue module currently exist?

**Yes.**

| Layer | Evidence |
|---|---|
| Route page | `src/app/(dashboard)/dialogue/page.tsx` → `DialogueCenterWorkspace` |
| Workspace UI | `src/components/catalyst-one/dialogue/dialogue-center-workspace.tsx` |
| Library SSOT | `src/lib/enterprise-dialogue-center/` |
| Types | `src/types/enterprise-dialogue-center.ts` |
| Constants | `src/constants/enterprise-dialogue-center/` |
| Route constant | `ROUTES.DIALOGUE = "/dialogue"` |
| Opportunity-embedded panel (code exists) | `workspace-dialogue-panel.tsx` |

EDC describes itself as a “unified operational timeline” for opportunity / loan / customer (and other) context events.

---

## 2. Where is it accessible?

| Access path | Present? | Evidence |
|---|---|---|
| Primary left nav (Column 1) | **No** | `primaryDomainNavigation` in `src/config/navigation.ts` — Dialogue not listed |
| Command palette / supporting routes | **Yes** | `systemAdministrationCommandPaletteRoutes` → `{ title: "Dialogue", href: ROUTES.DIALOGUE }` |
| Direct URL | **Yes** | `/dialogue` |
| Opportunity Workspace primary tabs | **Not as Dialogue** | Tabs expose **Notes** (and a `timeline` tab id exists in strategic-tabs); mounted panel is `WorkspaceNotesPanel`, not Dialogue |
| Loan File / Deal Workspace UI | **No dedicated Dialogue surface found** | No EDC list/UI imports under loan-files / deal-workspace components searched |

**Standalone page behaviour:** `DialogueCenterWorkspace` defaults `contextId = "opp-demo-001"` and filters EDC entries to that id (demo-oriented).

---

## 3. Is it connected to Opportunities?

**Partially — write paths yes; primary OW read/UI integration incomplete.**

### Connected (writes / projections)

- EDC `EdcContextType` includes `"opportunity"`.
- Opportunity Workspace context and several OW panels **append** EDC entries (`appendEdcTimelineEntry`) for stage/document/task/workflow-style events.
- ECIE `saveConversationActivity` can project `conversation_activity` onto EDC with opportunity context.
- Standalone Dialogue page and `WorkspaceDialoguePanel` **can** filter by opportunity id.

### Not connected as primary OW surface

- `opportunity-workspace.tsx` maps focus `dialogue` / `timeline` → tab **`notes`**.
- It renders **`WorkspaceNotesPanel` only** for that tab.
- **`WorkspaceDialoguePanel` is never imported or mounted** in `opportunity-workspace.tsx` (grep: only defined in its own file).

So: Opportunities can **emit** Dialogue/EDC events, but the primary Opportunity Workspace does **not** currently show the Dialogue Center panel as the Notes/Timeline experience.

---

## 4. Is it connected to Loan Files?

**Model: yes (context type). UI / Loan Workspace: no dedicated integration found.**

| Aspect | Status | Evidence |
|---|---|---|
| EDC supports `contextRef.type = "loan"` | Yes | `EdcContextType` in `enterprise-dialogue-center.ts` |
| ECIE composer can map loan context → EDC | Yes | `save-activity.ts` `mapEdcContextType` |
| Loan Files workspace lists/reads EDC | **Not found** | No `listEdcTimeline` / Dialogue panel under loan-files components |
| LoanFile embedded `timeline[]` | Separate store | Used by Radar / Deal DAL — **not** EDC |

**Verdict:** Loan File connection is **typed/capable**, not **operationally visible** in Loan Workspace UI.

---

## 5. Does SARATHI write conversation history into Dialogue?

**No.**

Evidence: no imports of `appendEdcTimelineEntry`, `listEdcTimeline`, or `enterprise-dialogue-center` under `src/lib/enterprise-ai-platform/`.

SARATHI persistence is Enterprise AI conversation memory / continuity (`conversation-memory/store.ts` Map, turn orchestrator) — separate from EDC.

---

## 6. Does Dialogue persist conversations?

**Not durably.**

| Mechanism | Status |
|---|---|
| Default EDC ports | **In-memory** — `createInMemoryEdcPorts()` in `composition.ts` |
| Prisma / DB table for EDC timeline | **Not present** as EDC SSOT (contrast: `EnterpriseConversationActivity` is ECIE, not EDC) |
| Demo seed | Optional sample entries when `isDemoSeedEnabled()` |
| Conversation transcript SSOT | ECIE Activity Registry (optional Prisma) — **projects** a summary line into EDC on save; EDC is not the transcript store |

**Verdict:** Dialogue/EDC timeline entries are **session/process memory**, not a durable conversation store. Refresh/reset loses them unless a port override is configured (none shipped as default durable adapter).

---

## 7. Dialogue vs Activity Timeline (current implementation)

These are **different artefacts**:

| | **Dialogue (EDC)** | **Activity Timeline (dashboard widget)** | **OW Notes** | **LoanFile timeline** |
|---|---|---|---|---|
| Purpose | Enterprise operational dialogue/timeline events | Dashboard “Recent Activity” card | Planning notes in OW | Embedded deal/loan events for Radar etc. |
| Component | `DialogueCenterWorkspace` / `WorkspaceDialoguePanel` | `src/components/catalyst-one/activity-timeline.tsx` | `WorkspaceNotesPanel` | `LoanFile.timeline[]` |
| Data | EDC in-memory registry | **Static** `@/data/catalyst-one/dashboard` | `localStorage` `catalyst.strategic.notes:{opportunityId}` | Deal/LoanFile storage |
| Live enterprise SSOT? | Soft / in-memory | No (demo catalog) | Browser-local only | Entity-embedded |

There is **no single shared “Activity Timeline” product** that equals Dialogue. Naming overlap is a source of confusion.

---

## 8. Why is Dialogue not visible / integrated into primary Opportunity Workspace?

**Because the OW shell was rewired to Notes instead of mounting the Dialogue panel.**

Evidence chain:

1. `WorkspaceDialoguePanel` exists and is EDC-backed.  
2. `opportunity-workspace.tsx` imports **`WorkspaceNotesPanel`**, not `WorkspaceDialoguePanel`.  
3. Focus keys `dialogue` / `timeline` map to tab id **`notes`**.  
4. Render: `{tab === "notes" && <WorkspaceNotesPanel />}`.  
5. Strategic tab label shown to users is **“Notes”** (`strategic-tabs.ts`), not “Dialogue”.  
6. Standalone Dialogue lives at `/dialogue`, which is **command-palette only**, not primary nav — so executives do not see it as a first-class Column 1 module.  
7. Standalone page defaults to demo context `opp-demo-001`, further reducing real-Opportunity visibility.

**Architectural status:** Dialogue module is **implemented as a library + standalone page + unused OW panel**, but **not wired as the primary Opportunity Workspace history surface**.

---

## Summary table

| # | Question | Answer |
|---|---|---|
| 1 | Exists? | **Yes** (EDC + `/dialogue` UI) |
| 2 | Accessible where? | `/dialogue` + command palette; **not** primary nav |
| 3 | Connected to Opportunities? | **Partial** (writes yes; OW primary UI shows Notes, not Dialogue) |
| 4 | Connected to Loan Files? | **Typed only**; no Loan Workspace Dialogue UI found |
| 5 | SARATHI → Dialogue? | **No** |
| 6 | Persist conversations? | **No durable EDC persistence** (in-memory); transcripts live in ECIE if saved via Composer |
| 7 | vs Activity Timeline? | Different components/stores; dashboard Activity Timeline is static demo |
| 8 | Why not in primary OW? | OW mounts **Notes** (`localStorage`); `WorkspaceDialoguePanel` is unmounted orphan |

---

## Status

Architectural verification complete. **No code changes. No fixes proposed.**

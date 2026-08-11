# CO-AI-111 — Architecture Report

**Sprint:** AI-11 · SARATHI Conversation Experience (TEXT ONLY)  
**Code:** CO-AI-111  
**Framework:** `1.12.0-ai11` · Conversation Experience `1.0.0-ai11`  
**Behaviour Constitution:** SARATHI Bible v1.0 · Enterprise AI Constitution  
**Status:** Implementation Complete — awaiting Product Owner approval  
**Date:** 2026-08-06  

Extends frozen Enterprise AI Platform — **not redesigned**.

---

## 1. Objective

Build the first customer-facing **SARATHI** experience:

- Conversation Screen  
- Conversation History  
- Typing Experience  
- Session Continuity  
- Suggested Questions  
- Adaptive Questioning  
- Micro Communication  
- Tone Library  
- Action Proposal Cards  

**Hard scope:** Text only · No Voice · No CRM execution · No workflow execution.  
Every turn operates **completely** through the Enterprise AI Platform.

---

## 2. Architecture

```text
User utterance (text)
        │
        ▼
┌──────────────────────────────────────────────┐
│ SARATHI Conversation UI (/sarathi)           │
│  · Message list (history)                    │
│  · Typing indicator                          │
│  · Composer                                  │
│  · Suggested / adaptive questions            │
│  · Action Proposal cards (display only)      │
│  · localStorage continuity                   │
└──────────────────────────────────────────────┘
        │
        ▼
 runEaiSarathiConversationTurn
        │
        ├── Policy Gate + Domain Boundary
        ├── Advisory Reasoning
        ├── Planner (gaps / questions)
        ├── Consultation Intelligence
        ├── Lead Intelligence (draft proposals)
        ├── Explainability & Trust
        └── Response Composer (Tone + Micro Communication)
        │
        ▼
 Facing text + draft Action Proposals + continuity state
```

---

## 3. Modules

| Concern | Path |
|---|---|
| Types | `src/types/enterprise-ai-conversation-experience.ts` |
| Constants | `src/constants/enterprise-ai-platform/conversation-experience.ts` |
| Turn orchestrator | `src/lib/enterprise-ai-platform/conversation-experience/` |
| UI | `src/components/catalyst-one/sarathi/` |
| Route | `/sarathi` (`ROUTES.SARATHI`) · `/ai-assistant` redirects here |

**Entry:** `runEaiSarathiConversationTurn`

---

## 4. Experience contracts

| Capability | Behaviour |
|---|---|
| History | Messages retained in continuity state + platform session turns |
| Typing | Client typing delay only — not streaming / not voice |
| Continuity | `continuityKey` · `conversationId` · `sessionId` · localStorage |
| Suggested questions | Starter catalogue when no adaptive set |
| Adaptive questioning | Planner selected questions → consultation missing-info prompts |
| Micro Communication | Applied solely via `composeEaiResponse` |
| Tone Library | Applied solely via `composeEaiResponse` |
| Action Proposal cards | `draft` / `pending_review` display — **no Execute CTA** |

---

## 5. Hard rules

| Rule | Enforcement |
|---|---|
| Platform-only conversation | UI calls turn orchestrator; no parallel LLM / CRM path |
| No Voice | No speech APIs in UI or orchestrator |
| No CRM / workflow execution | Proposals stay draft; `executed_reserved` remains blocked |
| Outside domain | Fixed refusal via Domain Boundary + Policy Gate |
| Single implementation | Placeholder AI Assistant redirects to SARATHI |

---

## 6. Out of scope (honoured)

Voice · Streaming · CRM create/update · Workflow execution · Deployments (pending PO)

---

## 7. Version lineage

| Sprint | Framework |
|---|---|
| AI-10 Explainability | `1.11.0-ai10` |
| **AI-11 Conversation Experience** | **`1.12.0-ai11`** |

---

## 8. Next gate

**Do not** deploy or commit until Product Owner approval.

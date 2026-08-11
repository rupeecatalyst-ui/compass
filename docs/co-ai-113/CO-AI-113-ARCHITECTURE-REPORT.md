# CO-AI-113 — Architecture Report

**Sprint:** AI-13 · Voice & Real-Time Conversation Engine  
**Code:** CO-AI-113  
**Framework:** `1.14.0-ai13` · Voice Engine `1.0.0-ai13`  
**Governing standards:** Enterprise AI Constitution · SARATHI Bible v1.0  
**Status:** Implementation Complete — awaiting Product Owner approval  
**Date:** 2026-08-06  

Extends frozen Enterprise AI Platform — **maintains all previous architecture**.  
**Product Owner authorized Voice** for this sprint (Constitution exception: scope expansion).

---

## 1. Objective

Enable real-time voice conversation with SARATHI.

Voice is **only another interface**. Conversation intelligence is unchanged.

---

## 2. Architecture

```text
Microphone / audio frames
        │
        ▼
┌─────────────────────────────────────┐
│ Voice Engine (interface layer)      │
│  STT abstraction · VAD · Streaming  │
│  Session Manager · Interrupt · Queue│
│  TTS abstraction · Recovery · Errors│
└─────────────────────────────────────┘
        │ transcript (text)
        ▼
 runEaiSarathiConversationTurn  ← UNCHANGED intelligence path
        │
        ├── Policy Gate
        ├── Context Intelligence
        ├── Planner
        ├── Advisory / Knowledge
        ├── FDI
        ├── Consultation / Lead Intelligence / Trust
        └── Response Composer
        │
        ▼ facingText
        │
        ▼
 TTS queue → audio frames (provider-independent)
```

---

## 3. Modules

| Concern | Path |
|---|---|
| Types | `src/types/enterprise-ai-voice.ts` |
| Constants | `src/constants/enterprise-ai-platform/voice.ts` |
| Engine | `src/lib/enterprise-ai-platform/voice/` |

**Entry:** `runEaiVoiceConversationTurn` → always calls `runEaiSarathiConversationTurn`

---

## 4. Hard rules

| Rule | Enforcement |
|---|---|
| Voice ≠ new AI | STT/TTS only; platform engines decide |
| Provider-independent | `EaiSttProvider` / `EaiTtsProvider` / `EaiVadProvider` ports |
| Languages | `en` · `hi` · `mr` |
| No CRM / workflow execution | Proposals remain draft |
| No voice cloning / emotion detection | Out of scope — not implemented |
| SARATHI Bible | Outside domain fixed refusal unchanged |

---

## 5. Out of scope (honoured)

Voice cloning · Emotion detection · CRM execution · Workflow execution · Deployments (pending PO)

---

## 6. Version lineage

| Sprint | Framework |
|---|---|
| AI-12 Wealth Partner | `1.13.0-ai12` (historical) |
| **AI-13 Voice** | **`1.14.0-ai13`** |

---

## 7. Next gate

**Do not** deploy or commit until Product Owner approval.

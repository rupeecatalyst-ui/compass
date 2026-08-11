# CO-AI-113 — Voice Architecture Report

**Sprint:** AI-13 · Voice & Real-Time Conversation Engine  
**Code:** CO-AI-113  
**Voice Engine:** `1.0.0-ai13`  
**Governing standards:** Enterprise AI Constitution · SARATHI Bible v1.0  
**Date:** 2026-08-06  

---

## 1. Principle

**Voice is only another interface.**

Speech-to-Text produces text.  
Text-to-Speech consumes facing text.  
All reasoning remains on the Enterprise AI Platform.

---

## 2. Component map

| Component | Responsibility | Path |
|---|---|---|
| STT abstraction | Provider-independent transcription (+ optional stream partials) | `stub-providers.ts` · `EaiSttProvider` |
| TTS abstraction | Provider-independent synthesis (+ optional stream chunks) | `stub-providers.ts` · `EaiTtsProvider` |
| VAD | Speech present / ended detection | `EaiVadProvider` |
| Voice Session Manager | Lifecycle · language · continuity linkage | `session-manager.ts` |
| Conversation Interrupt | Barge-in cancels TTS queue | `interruptEaiVoiceSession` · `interruptEaiVoiceQueue` |
| Streaming Architecture | Event bus for STT/TTS/VAD/status/errors | `streaming.ts` |
| Voice Response Queue | Ordered speak queue with depth limit | `response-queue.ts` |
| Voice Session Recovery | Rebuild/reattach from conversation continuity | `recoverEaiVoiceSession` |
| Voice Error Handling | Typed `EaiVoiceError` codes · recoverable flags | types + turn orchestrator |

---

## 3. Provider independence

```text
configureEaiVoicePorts({
  sttProvider: myStt,
  ttsProvider: myTts,
  vadProvider: myVad,
})
```

- Stub providers ship for offline readiness (`eai.stt.stub` · `eai.tts.stub` · `eai.vad.stub`).
- Platform core **must not** import vendor speech SDKs.
- Swap providers without changing conversation logic.

---

## 4. Languages

| Code | Language |
|---|---|
| `en` | English |
| `hi` | Hindi |
| `mr` | Marathi |

Declared on STT/TTS stubs and voice session create.

---

## 5. Turn sequence

1. Optional barge-in interrupt  
2. VAD on audio frame  
3. STT (stream partials → final transcript)  
4. **`runEaiSarathiConversationTurn`** (Policy · Context · Planner · Knowledge/Advisory · FDI · …)  
5. Enqueue facing text → TTS (stream chunks optional)  
6. Emit stream events · return continuity  

---

## 6. Explicit non-goals

- Voice cloning  
- Emotion detection  
- CRM execution  
- Workflow execution  

---

## 7. Compliance

- Enterprise AI Constitution — Voice authorized by Product Owner for AI-13 as interface only  
- SARATHI Bible — domain refusal and engine-decide rules unchanged  
- No parallel intelligence stack  

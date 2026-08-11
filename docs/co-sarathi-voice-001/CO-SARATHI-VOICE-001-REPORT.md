# CO-SARATHI-VOICE-001 — Voice Interaction Layer

**Status:** Implemented · Awaiting Product Owner review  
**Principle:** Voice is an interface only — reasoning stays on the Enterprise AI Platform.

---

## What changed

1. **Microphone** in the SARATHI composer (real `getUserMedia` + Web Speech Recognition).  
2. **Language selector** — English · Hindi · Marathi (`en-IN` / `hi-IN` / `mr-IN`).  
3. **Live STT** into the composer textarea (editable before Send).  
4. **Recording indicator + live waveform** from `AnalyserNode` (real mic levels).  
5. **TTS** for SARATHI replies via `speechSynthesis` (toggle mute).  
6. **Context-aware status** — no idle “I’m listening”:
   - Recording → `Listening...`
   - Processing → `Understanding your request...`
   - Reviewing → `I'm reviewing what you've shared...`

---

## Architecture

```text
Mic → browser STT (live transcript) → user edits → Send
  → runEaiSarathiConversationTurn (unchanged intelligence)
  → facing text stream → optional browser TTS
```

Does **not** redesign Planner, Platform, or Domain Boundary. Reuses CO-VOICE-002 `startLiveBrowserStt`.

---

## Files

| Path | Role |
|------|------|
| `src/constants/sarathi-voice.ts` | Languages + status copy |
| `src/lib/sarathi-voice/browser-tts.ts` | Real TTS |
| `src/lib/sarathi-voice/use-mic-waveform.ts` | Waveform levels |
| `src/components/catalyst-one/sarathi/conversation-composer.tsx` | Mic · lang · STT · waveform |
| `src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx` | TTS + status wiring |
| `consultant-facing.ts` / `natural-timing.ts` | Remove fake “listening” |

Version: `1.0.0-voice-001`

---

## Known limitations

1. Browser support: Chrome / Edge best for SpeechRecognition; Safari / Firefox may lack STT.  
2. Hindi / Marathi accuracy depends on OS/browser voice packs.  
3. TTS voice quality varies by device; not a neural voice clone.  
4. Requires microphone permission; denied → clear hint, typing still works.  
5. No cloud STT/TTS vendor yet — browser providers only (provider-swappable later via CO-AI-113 ports).

---

## Manual BAT

1. Open `/sarathi` on Chrome.  
2. Select Hindi → mic → speak → see live transcript → edit → Send.  
3. Confirm reply streams, then speaks (mute toggle works).  
4. Confirm recording shows **Listening...** + waveform.  
5. Confirm processing shows **Understanding your request...**

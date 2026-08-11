# CO-AI-114 — Architecture Report

**Sprint:** AI-14 · Multilingual Intelligence Engine  
**Code:** CO-AI-114  
**Framework:** `1.15.0-ai14` · Multilingual Engine `1.0.0-ai14`  
**Governing standards:** Enterprise AI Constitution · SARATHI Bible v1.0  
**Status:** Implementation Complete — awaiting Product Owner certification  
**Date:** 2026-08-06  

Extends frozen Enterprise AI Platform — **maintains all previous architecture**.  
Multilingual is a **localisation / interface layer** — not a second intelligence stack.

---

## 1. Objective

Implement multilingual conversation for SARATHI.

**Supported languages:** English · Hindi · Marathi

| Capability | Responsibility |
|---|---|
| Language Detection | Deterministic script / marker detection |
| Language Preference | Explicit > continuity > detected / mixed primary > default `en` |
| Mixed-language support | Hinglish / Devanagari+Latin flagged; primary language chosen |
| Translation Layer | Catalogue phrase map → canonical English for engines |
| Response Localisation | English-composed facing text → preferred language |
| Tone Library Localisation | Curated hi/mr catalogues (customer + partner) |
| Micro Communication Localisation | Refusal variants preserved; Devanagari-aware shaping |
| Domain Boundary localisation | Identical-meaning refusal in en / hi / mr |

---

## 2. Architecture

```text
User utterance (en | hi | mr | mixed)
        │
        ▼
┌──────────────────────────────────────┐
│ Multilingual Intelligence Engine     │
│  Detect · Prefer · Mix · Translate   │
└──────────────────────────────────────┘
        │ canonicalUtterance (for engines)
        ▼
 Policy Gate · Context · Planner · Advisory · FDI · …
        │ English facing composition (behaviour SSOT)
        ▼
 Localise (Tone · Micro · Domain Boundary · Response)
        │
        ▼ facingText (preferred language)
```

**Hard rule:** Conversation logic / engines remain unchanged.  
Voice (AI-13) remains an interface; it now passes `languagePreference` into the same turn path.

---

## 3. Outside-domain refusal (identical meaning)

| Language | Facing text |
|---|---|
| `en` | `I'm not trained for this subject.` (canonical SSOT) |
| `hi` | `मैं इस विषय के लिए प्रशिक्षित नहीं हूँ।` |
| `mr` | `मी या विषयासाठी प्रशिक्षित नाही.` |

**Meaning key:** `outside_domain.not_trained_for_subject`  
Policy / audit `refusalText` remains English canonical.  
Facing text is localised. Behaviour is identical across languages.

---

## 4. Behaviour consistency

- Same Policy Gate outcomes for equivalent intents  
- Engines receive English-enriched canonical utterances when needed  
- Compose English first → localise facing surface  
- No CRM / workflow execution  
- No parallel AI  

---

## 5. SSOT paths

| Concern | Path |
|---|---|
| Types | `src/types/enterprise-ai-multilingual.ts` |
| Constants / catalogues | `src/constants/enterprise-ai-platform/multilingual.ts` |
| Engine | `src/lib/enterprise-ai-platform/multilingual/` |
| Wire-in | Conversation turn · Response Composer · Tone · Micro · Safe refusal · Voice |

---

## 6. Compliance

- Enterprise AI Constitution — engines decide; localisation does not override Policy Gate  
- SARATHI Bible — outside domain fixed refusal meaning preserved across languages  
- AI-11 / AI-12 / AI-13 architecture maintained  

---

## 7. Version lineage

| Sprint | Framework |
|---|---|
| AI-13 Voice | `1.14.0-ai13` (historical) |
| **AI-14 Multilingual** | **`1.15.0-ai14`** |

---

## 8. Next gate

Awaiting Product Owner certification. Deploy / git milestone only when directed.

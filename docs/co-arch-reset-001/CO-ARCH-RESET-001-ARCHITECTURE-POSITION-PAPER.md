# CO-ARCH-RESET-001 — Architecture Position Paper

**Exercise type:** Architecture Alignment  
**Authority:** Chief Architect perspective → **Product Owner Accepted**  
**Status:** **ACCEPTED** · Superseded as decision record by **ADR-022** (architecture frozen)  
**Date:** 2026-08-06  
**Scope:** SARATHI conversation architecture vs Digital Financial Consultant vision  
**Explicit non-actions at time of writing:** No code · No redesign · No deploy · No sprint plan  

**Binding decision:** [`ADR-022`](../adr/ADR-022-enterprise-ai-orchestrator-conversational-reasoning.md)  
**Migration roadmap:** [`CO-ARCH-RESET-001-MIGRATION-ROADMAP.md`](./CO-ARCH-RESET-001-MIGRATION-ROADMAP.md)

---

## 0. Executive verdict

**Agree with the Product Owner’s diagnosis.**

The Enterprise AI Platform through AI-16 is **constitutionally strong**: Policy Gate, Domain Boundary, Action Proposals, audit posture, and engine-owned calculations are the right enterprise spine.

The conversation experience layer, however, has been **optimized as a governed dialogue machine** (planner slots → facing templates → UX polish → reasoning heuristics). That produces a competent **guided chatbot**. It will not, by incremental extension alone, produce a **Digital Financial Consultant** comparable to a modern conversational AI.

**Recommendation (one sentence):**

> Evolve the Enterprise AI Platform into an **orchestration and authority layer around a configurable conversational reasoning model**, and demote the current planner from “dialogue brain” to **structured gap / readiness instrumentation** — do not keep extending planner-driven facing as the path to human-parity consultation.

---

## 1. What I agree with

1. **SARATHI is not a chatbot / questionnaire / FAQ.** That product boundary is correct and overdue as the primary north star (not a UX slogan beside a planner).
2. **Division of labour in VISION-001 is right in principle:** LLM leads *dialogue*; enterprise systems own *truth, policy, actions, calculations*.
3. **Voice is an interface, not the product.** STT/TTS quality matters, but replacing “I’m listening” without a reasoning model only removes inconsistency — it does not create consultant intelligence.
4. **Bible constraints must survive:** Domain Boundary, Policy Gate, Read Connectors, Action Proposals (never silent CRM/workflow execution), Tone/Micro discipline as *guardrails*, engine-owned FOIR/eligibility/pricing.
5. **Success criterion is experiential:** five-minute indistinguishability from an experienced Rupee Catalyst consultant is the right acceptance bar — not “slots filled” or “proposals unlocked.”
6. **Current implementation is technically valuable.** Continuity, memory hooks, proposal lifecycle, multilingual hooks, security suites, and turn orchestration are assets — not scrap.

---

## 2. What I disagree with (or would challenge)

### 2.1 “LLM leads dialogue” while the runtime still leads with planner + templates

VISION-001 already states LLM-primary dialogue. The runtime still largely does:

```text
utterance → gates → context → planner question → advisory fragments → facing shaper / heuristics → UI
```

That is **enterprise-orchestrated reply synthesis**, not **conversational reasoning**. Calling experience-layer heuristics a “Reasoning Engine” risks false confidence: it improves order and memory, but it is not a consultant model.

**Challenge:** Until the model proposes the next conversational move (and enterprise systems only *constrain / enrich / veto*), the product will keep feeling like a clever form with better prose.

### 2.2 Extending the planner further will not converge on human parity

More slots, better missing-fact ranking, richer answer banks, and self-validation loops improve **consistency**. They do not create:

- multi-turn pragmatic understanding  
- judgment about when *not* to ask  
- natural education beats  
- recovery from vague customer speech  
- consultant-style pacing and empathy that is not templated  

**Challenge:** Planner-led dialogue has a ceiling. You are near that ceiling for “consultant feel.”

### 2.3 Voice-first as the next *product* priority before dialogue architecture

Voice amplifies whatever conversation quality already exists. A mediocre dialogue spoken aloud becomes a louder chatbot.

**Challenge:** Voice Interaction Layer is necessary eventually; it is not the architectural unlock. The unlock is **who owns the next utterance**.

### 2.4 “Configurable conversational reasoning model” must not mean “unbounded LLM product”

If “configurable” means prompt soup without contracts, you will lose Bible guarantees.

**Challenge:** The model must be **configuration-bounded**: tools, retrieval contracts, refusal schema, proposal-only side effects, calculation engines as tools — not free-form enterprise truth invention.

### 2.5 Human indistinguishability is a direction, not a near-term absolute claim

Five-minute parity on *common* loan consultations is achievable with the right architecture. Claiming parity across edge credit judgment, lender negotiation nuance, and regulated advice without human escalation would be reckless.

**Challenge:** Define **consultant-grade within a clear advice boundary**, with transparent escalation — not omniscient digital RM.

---

## 3. Risks

| Risk | Why it matters |
|------|----------------|
| **Dual brains** | Planner and LLM both deciding “what to ask next” → inconsistent, harder BAT, two SSOTs for dialogue. |
| **Prompt-as-policy** | Softening Policy Gate into prompt instructions → constitutional regression. |
| **Hallucinated enterprise truth** | LLM invents rates, eligibility, timelines as facts → CAD / Bible breach. |
| **Action leakage** | Conversational agents that “just book” CRM updates → Action Proposal constitution broken. |
| **Rewrite temptation** | Throwing away AI-1…AI-16 spine to chase ChatGPT UX → lose years of enterprise control. |
| **Experience-layer sprawl** | More facing shapers / memory heuristics / banned-phrase lists → brittle pseudo-LLM. |
| **Evaluation blindness** | No consultant-quality eval harness → PO reviews stay anecdote-driven. |
| **Multilingual illusion** | Language selector without reasoning quality → Hindi/Marathi surface polish over English-brain logic. |

---

## 4. Better alternatives (ranked)

### A. Recommended — Orchestration Platform + Conversational Reasoning Core

```text
Customer utterance (text or STT)
  → Domain Boundary / Policy Gate (hard)
  → Conversation Orchestrator
       ├─ assemble Enterprise Context pack (read-only)
       ├─ assemble Knowledge / advisory evidence (cited)
       ├─ expose tools: engines, memory, proposal drafts (never execute)
       └─ call Conversational Reasoning Model (configurable)
  → Structured model output (say / ask / educate / recommend / refuse / escalate)
  → Policy / schema validation
  → Persist memory · audit · continuity
  → Facing text (+ optional TTS)
  → Action Proposals remain draft until human/system approval
```

Planner becomes **instrumentation**: gap detection, readiness scores, BAT fixtures — not the author of customer speech.

### B. Acceptable interim — Hybrid with hard ownership rule

- Model owns **wording and turn objective**.  
- Planner owns **missing enterprise facts list** as *hints*, not forced next questions.  
- Facing shapers become **post-filters** (banned phrases, length, tone constraints), not dialogue authors.

Use only as a short bridge — not the end state.

### C. Not recommended — Keep extending planner-driven architecture as primary path

Will produce better chatbot metrics and poorer consultant identity. Highest long-term cost for lowest experience ceiling.

### D. Not recommended — Greenfield “just put GPT on /sarathi”

Destroys Policy Gate / Action Proposal / engine SSOT advantages. Enterprise regression disguised as UX progress.

---

## 5. Simpler architecture (what “simpler” actually means)

Simpler is **not** fewer folders. Simpler is **one dialogue authority**.

| Today (complex in the wrong place) | Target (complex in the right place) |
|------------------------------------|-------------------------------------|
| Many facing composers, slot askers, progressive labels, banned generics | One reasoning core + thin validators |
| Planner decides next question almost every turn | Model decides; planner reports gaps |
| Experience layer tries to simulate reasoning | Experience layer presents + voice I/O |
| Multiple “almost brains” | One brain, many governors |

**Delete cognitive duplication; keep constitutional machinery.**

---

## 6. Long-term implications

1. **SARATHI becomes a product of judgment + governance**, not a form engine with speech.  
2. **Enterprise AI Platform becomes the OS** for multiple personas (customer SARATHI, Wealth Partner, internal copilots) sharing the same gates and tools.  
3. **Evaluation becomes first-class:** consultant transcripts, refusal tests, hallucination tests, proposal-only tests.  
4. **Configuration replaces hard-coded interview graphs:** product playbooks as *knowledge + constraints*, not scripts.  
5. **Human consultants remain in the loop** for exceptions; SARATHI drafts proposals and educates.  
6. **Competitive moat** is enterprise truth + policy + action safety — not model novelty alone.

---

## 7. Migration strategy (direction only — not a sprint plan)

**Principle:** Strangler pattern on the *dialogue brain*, freeze constitutional spine.

1. **Freeze** further investment in planner-authored facing as the product path.  
2. **Declare** Conversational Reasoning Core as the future dialogue authority (config + contracts).  
3. **Keep** turn orchestrator as the outer pipe (gates → context pack → reason → validate → persist).  
4. **Reclassify** planner outputs as `gapHints[]` / readiness, not mandatory next utterance.  
5. **Shrink** experience-layer answer banks to safety nets / offline fallback only.  
6. **Introduce** structured model response schema + post-validators before any UI cutover.  
7. **Add** consultant-quality evaluation suite before claiming vision success.  
8. **Only then** deepen voice as primary modality on top of stable dialogue quality.

This is evolutionary on the platform shell; revolutionary on who writes the next sentence.

---

## SPECIFIC QUESTIONS

### Q1 — Continue planner-driven, or orchestration around a conversational reasoning model?

**Do not continue extending planner-driven architecture as the primary path to modern conversational AI quality.**

**Evolve the Enterprise AI Platform into an orchestration / authority layer around a configurable conversational reasoning model.**

**Why:**

- Planner architectures optimize for *coverage of slots*. Consultant conversations optimize for *judgment under uncertainty*.  
- Modern conversational quality comes from models that maintain pragmatic state, not from better next-question pickers.  
- You already built the hard part enterprises usually lack: gates, proposals, engines, audit. The missing piece is the soft part: dialogue intelligence. Put the model where dialogue lives; keep the platform where authority lives.  
- Extending the planner further increases cost and complexity while locking product identity as “smart questionnaire.”

**What “configurable” must mean:**

- Model provider swappable  
- System prompt / playbook versioned  
- Tool contracts fixed (engines, context reads, proposal draft)  
- Output schema fixed (intent, speech, memory writes, proposal intents, refusal)  
- Policy Gate remains pre- and/or post- model, never optional  

---

### Q2 — What should remain unchanged?

**Keep frozen / nearly frozen:**

1. **SARATHI Bible** principles (SB-01…SB-10 intent)  
2. **Domain Boundary** (exact outside-domain refusal contract)  
3. **Policy Gate** (hard deny / allow — not prompt theatre)  
4. **Read Connectors** (read-only enterprise context)  
5. **Action Proposals** lifecycle (draft / review — never auto-execute CRM/workflow)  
6. **Engine-owned calculations** (FOIR, eligibility, pricing — CAD provenance)  
7. **Audit / memory learning audit / security denial posture**  
8. **Continuity session identity** (conversation continuity keying)  
9. **Voice-as-interface principle** (STT in / TTS out; intelligence not in the mic)  
10. **Enterprise AI Constitution** single-platform rule (no parallel SARATHI brain outside the platform)

These are your moat and your license to operate.

---

### Q3 — Which components should be simplified?

1. **Dialogue Planner role** — from “author of next question” → “structured gap / readiness advisor.”  
2. **Facing composition stack** — multiple shapers, tone weavers, progressive interview templates → thin post-processor (length, banned claims, language).  
3. **Experience-layer “reasoning” heuristics** — valuable as a bridge; should not grow into a second LLM. Collapse into validators + fallback.  
4. **Questionnaire residue** — chips, confirm forms, forced utterance confirms (already partially retired; finish conceptually).  
5. **Turn UX chrome complexity** relative to dialogue quality — status copy and mic polish are fine; they must not substitute for architecture change.  
6. **Stub-heavy voice platform vs browser voice UI** — unify conceptually later; avoid two incomplete voice stories.

---

### Q4 — Which components become unnecessary (as dialogue authorities)?

**Unnecessary as primary conversation controllers (not necessarily delete files tomorrow):**

- Fixed question banks as customer journey  
- Mid-chat suggested-question interrogation UX  
- Summary-confirm gates as the path to advice  
- Large libraries of canned “consultant” sentences presented as intelligence  
- Planner-forced KYC/document loops when the model would educate or answer first  
- Parallel “RM task / priority” or parallel metric formulas (already constitutionally forbidden — keep it that way)

**Still useful as subordinate tools:** gap lists, confidence hints, proposal card rendering, continuity storage.

---

### Q5 — Preserve Policy, Context, Proposals, Audit, Security while improving conversation

Use a **governed agent** pattern:

| Concern | How it stays sacred |
|---------|---------------------|
| **Policy Gate** | Runs on ingress (and optionally egress). Model never bypasses deny. |
| **Enterprise Context** | Injected as a *context pack* with provenance; model may cite, not invent. |
| **Knowledge / Advisory** | Retrieved evidence attached; unsupported claims stripped or refused. |
| **Calculations** | Exposed only as engine tools; model must call tools for numbers. |
| **Action Proposals** | Model may emit `propose_action` intents → existing proposal objects; execution remains human/system. |
| **Audit** | Log: utterance, context pack hash, model config version, tool calls, facing text, proposal IDs, gate decisions. |
| **Security** | Keep injection suites; treat model output as untrusted until schema + policy validation. |
| **Domain Boundary** | Pre-filter remains; contextual follow-ups resolved with continuity, not loosened to open-world chat. |

**Key insight:** Conversation quality improves by giving the model *freedom of dialogue* inside a *narrow tool and truth cage* — not by removing the cage.

---

### Q6 — Target architecture if starting today

```text
┌─────────────────────────────────────────────────────────────┐
│ Surfaces: Voice (STT/TTS) · Text · (later) Partner desk      │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ Conversation Orchestrator (Enterprise AI Platform)          │
│  1. Domain Boundary                                         │
│  2. Policy Gate                                             │
│  3. Build Context Pack (Read Connectors + Memory)           │
│  4. Attach Knowledge / Evidence                             │
│  5. Conversational Reasoning Model (configurable)           │
│      tools: engines · memory write intents · propose_action │
│  6. Validate schema · claim checker · tone constraints      │
│  7. Persist continuity · audit                              │
│  8. Emit facing + draft Action Proposals                    │
└─────────────────────────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   Enterprise Ops      Decision / Metric      Human Review
   Registries          Engines (SSOT)         of Proposals
```

**Personas** (customer, wealth partner) = behaviour packs + playbooks, not separate platforms.

**Evaluation harness** sits beside the orchestrator from day one.

---

### Q7 — Can current implementation evolve, or different migration path?

**Yes — evolve the shell; replace the dialogue brain.**

| Layer | Path |
|-------|------|
| Gates · proposals · engines · audit · continuity | **Keep and harden** |
| Turn orchestrator pipe | **Keep; change the middle step** |
| Planner | **Demote** to hints / readiness |
| Facing shapers / heuristic “reasoning” | **Shrink** to validators + fallback |
| Conversation Experience UI | **Keep**; consume better facing |
| Voice providers / browser voice | **Keep as I/O**; do not treat as intelligence |
| Greenfield rewrite of platform | **Reject** |

**Different migration path only if:** Product Owner insists on unbounded chat without Action Proposal / Policy Gate discipline — then you are building a different product (consumer chatbot), not SARATHI.

For the stated vision, **strangler evolution is correct.**

---

## Architecture opinion summary

| Topic | Position |
|-------|----------|
| PO diagnosis (“we’re still designing a chatbot”) | **Agree** |
| Vision: Digital Financial Consultant | **Agree** |
| Keep extending planner as primary brain | **Disagree** |
| Platform as orchestration around reasoning model | **Recommend** |
| Scrap Enterprise AI Platform | **Disagree** |
| Voice before dialogue ownership change | **Disagree as strategy** (voice still needed later) |
| Preserve Bible governors | **Non-negotiable** |
| Migration | **Strangle dialogue brain; keep constitutional spine** |

---

## What this paper is — and is not

**Is:** Architectural foundation for the next phase of SARATHI.  
**Is not:** Sprint backlog, ADR approval, implementation license, or certification of any in-flight voice/reasoning code.

**Requested next Product Owner decision (only):**

1. Accept or contest this position.  
2. Explicitly choose: **Orchestration + Reasoning Core (A)** vs keep planner-primary (C).  
3. Only after that decision: commission the next architecture ADR / programme — not more experience-layer patches.

---

*End of Architecture Position Paper — CO-ARCH-RESET-001*

# ADR-022 / CO-ARCH-RESET-001 — Enterprise AI Orchestrator & Conversational Reasoning Ownership

**Status:** **APPROVED** · **Architecture CERTIFIED** · **Architecture FROZEN**  
**Official acceptance:** Product Owner **G0 APPROVED** · ADR-022 **officially accepted** (2026-08-07)  
**Implementation:** Phase **G1 / Phase 1 contracts** authorised separately as **CO-AI-G1-001** — **not** Hybrid Cutover.  
**Date:** 2026-08-06 · Amended 2026-08-07  
**Programme:** **CO-ARCH-RESET-001 — SARATHI Conversation Architecture Reset**  
**ADR ID:** ADR-022  
**Directive class:** Product Architecture Decision  
**Classification:** ARCH / ENTERPRISE AI / CONVERSATION OWNERSHIP / PRE-LAUNCH  

**Foundation (approved):**  
- [`CO-ARCH-RESET-001-ARCHITECTURE-POSITION-PAPER.md`](../co-arch-reset-001/CO-ARCH-RESET-001-ARCHITECTURE-POSITION-PAPER.md) — **Accepted**  
- [`CO-SARATHI-VISION-001-PRODUCT-VISION-RESET.md`](../co-sarathi-vision-001/CO-SARATHI-VISION-001-PRODUCT-VISION-RESET.md) — Product vision  
- SARATHI Bible v1.0 (SB-01…SB-10) — **unchanged; not reopened**  

**Migration roadmap (architecture only):**  
[`CO-ARCH-RESET-001-MIGRATION-ROADMAP.md`](../co-arch-reset-001/CO-ARCH-RESET-001-MIGRATION-ROADMAP.md)

**Phase 1 contracts (G1):**  
[`CO-AI-G1-001-ORCHESTRATOR-CONTRACTS.md`](../co-ai-g1-001/CO-AI-G1-001-ORCHESTRATOR-CONTRACTS.md)

**Related (do not weaken):**  
- Enterprise AI Constitution · SARATHI Bible  
- CAD-2026-001 / ADR-017 — Business data provenance  
- ADR-021 — Enterprise Conversation Intelligence Engine (ECIE) — conversation *capture* platform; **orthogonal** to SARATHI dialogue ownership  
- CO-AI-101…CO-AI-117 — Enterprise AI Platform baseline (spine retained)  
- Pre-Launch Single Implementation Rule  

---

## 1. Status of authorisation

| Item | Decision |
|------|----------|
| Architecture Position Paper | **Accepted** |
| This ADR (architecture) | **APPROVED · CERTIFIED · FROZEN** |
| Frozen principle (dialogue vs authority) | **FROZEN** — see §3 |
| Implementation under this ADR | **NOT authorised** |
| Wave / programme implementation | Requires **separate** Product Owner wave authorisation after roadmap acceptance |

### Product Owner certification record

| Field | Value |
|-------|--------|
| Decision | **Architecture Position Accepted** |
| Architecture | **CERTIFIED · FROZEN** |
| Implementation | **NOT YET AUTHORISED** |
| Date | 2026-08-06 |

---

## 2. Context

Over successive Product Owner reviews, Catalyst One concluded:

- The **Enterprise AI Platform** (through AI-16) is constitutionally strong.
- SARATHI’s **conversation experience** is still designed as a **planner-led / template-shaped chatbot**, not a Digital Financial Consultant.
- Incremental extensions to planner-driven facing, experience-layer heuristics, and voice I/O will not converge on human-parity consultation.

**Product vision (locked):**

SARATHI is **not** a chatbot, questionnaire, or FAQ assistant.  
SARATHI is a **Digital Financial Consultant** — natural consultation comparable to an experienced Rupee Catalyst loan advisor.

**Architectural tension:**

| Layer | Current tendency | Required ownership |
|-------|------------------|--------------------|
| What to say next / how to consult | Planner + facing shapers + heuristics | **Conversational reasoning model** |
| Truth, policy, tools, actions, audit | Enterprise AI Platform | **Enterprise AI Orchestrator** (evolved platform) |

Without a frozen ownership split, engineering will keep improving the wrong brain.

---

## 3. Decision

### 3.1 Primary frozen principle

```text
Conversation ownership  →  Conversational Reasoning Model
Business authority      →  Catalyst One (via Enterprise AI Orchestrator)
```

**The Enterprise AI Platform shall evolve into the Enterprise AI Orchestrator.**

| Actor | Owns | Must never |
|-------|------|------------|
| **Enterprise AI Orchestrator** | Enterprise Context · Policy Gate · Tool orchestration · Action Proposals · Audit · Enterprise Memory · Validation · Security | Replace conversational reasoning / author natural dialogue as primary brain |
| **Conversational Reasoning Model** | Understanding the customer · Natural dialogue · Intelligent follow-ups · Explanations · Consultation flow · Multilingual interaction | Bypass enterprise governance / invent enterprise truth / execute CRM or workflow side effects |

This principle is **FROZEN**. Material change requires a new ADR or explicit Product Owner supersession.

### 3.2 Rename / evolution (capability identity)

| Former identity (runtime baseline) | Target identity |
|------------------------------------|-----------------|
| Enterprise AI Platform (dialogue + governance co-mingled) | **Enterprise AI Orchestrator** (governance + tools + validation) + **Conversational Reasoning Model** (dialogue) |

The Orchestrator is the **same constitutional platform evolved**, not a second parallel AI stack.

### 3.3 Target turn shape (architecture)

```text
Customer utterance (text or STT)
  → Domain Boundary / Policy Gate          [Orchestrator — hard]
  → Assemble Enterprise Context pack       [Orchestrator — read]
  → Attach Knowledge / evidence            [Orchestrator — read]
  → Conversational Reasoning Model         [Dialogue owner]
       tools: engines · memory intents · propose_action
  → Schema / claim / policy validation     [Orchestrator — hard]
  → Persist memory · audit · continuity    [Orchestrator]
  → Facing text (+ optional TTS)
  → Action Proposals remain draft          [Orchestrator — never auto-execute]
```

### 3.4 Consultation Readiness Engine (Planner repositioned — PO amendment)

The Dialogue Planner is **not removed**.

It is repositioned as the **Consultation Readiness Engine (CRE)**, responsible for:

- Consultation Confidence  
- Missing Information Analysis  
- Proposal Readiness  
- Action Readiness  

CRE outputs are **instrumentation / readiness signals** consumed by the Orchestrator (and later offered to the model as hints).  
CRE **must not** remain the primary author of customer-facing dialogue after Hybrid Cutover.

### 3.4A Enterprise engines remain SSOT (constitutional freeze — PO amendment)

Enterprise engines / Catalyst One systems remain the **Single Source of Truth** for:

- Calculations · Eligibility · Product Rules · Credit Policies  
- Workflow · CRM · Audit · Business Actions  

The Conversational Reasoning Model may **explain, guide, and recommend**.  
It shall **never** become the business authority.

### 3.4B Consultant Benchmark (Phase 2A — PO amendment)

Before Hybrid Cutover, a **Consultant Benchmark** evaluation framework is mandatory, comparing the conversational reasoning model against Rupee Catalyst expected consultant behaviour across:

Home Loan · LAP · Business Loan · Working Capital · Balance Transfer · Personal Loan

### 3.5 Voice

Voice remains an **interface** (STT in · TTS out).  
Voice does **not** own reasoning.  
Voice-first UX may proceed only after dialogue ownership aligns with this ADR (or under a separately authorised interim I/O wave that does not claim consultant parity).

### 3.6 Relationship to ECIE (ADR-021)

| Capability | Owns |
|------------|------|
| **ADR-021 ECIE** | Capture / transcribe / analyse *enterprise activities* from conversations (RM notes, etc.) |
| **ADR-022 SARATHI dialogue** | Live Digital Financial Consultant conversation with customers |

They share governance patterns where useful; they are **not** the same capability and must not be merged into one ambiguous “voice brain.”

---

## 4. Consequences

### 4.1 Positive

- Clear SSOT for “who decides the next sentence”
- Path to modern conversational quality without abandoning enterprise control
- Bible / Policy Gate / Action Proposals / engines preserved as moat
- Strangler migration: keep shell, replace dialogue brain

### 4.2 Negative / costs

- Requires model provider contracts, output schema, eval harness
- Temporary hybrid complexity during migration
- BAT and certification suites must expand beyond gate/refusal tests to consultant-quality transcripts
- Experience-layer heuristics become transitional debt to retire

### 4.3 Forbidden after freeze

- New planner-authored questionnaire flows as the SARATHI product path
- Expanding canned facing banks as a substitute for the reasoning model
- Allowing the model to execute CRM/workflow or invent calculation results
- Building a second AI stack outside the Orchestrator
- Claiming “Reasoning Engine complete” for heuristic-only experience layers

---

## 5. Legacy Retirement Impact

| Item | Current | After ADR-022 target state |
|------|---------|----------------------------|
| Business capability | SARATHI consultation (chatbot-shaped) | SARATHI Digital Financial Consultant |
| Dialogue authority | Planner + facing synthesis (+ heuristics) | Conversational Reasoning Model |
| Governance authority | Enterprise AI Platform | Enterprise AI Orchestrator (evolved) |
| Planner | Primary next-question author | Gap / readiness advisor only |
| Facing shapers | Dialogue authors | Thin validators / fallback |
| Routes / nav | `/sarathi` retained | No route rewrite required by this ADR |
| Dual implementation | Risk of planner + model both owning dialogue | **Single dialogue implementation** — model; orchestrator governs |

**Replacement Certification** (when implementation waves complete) must confirm:

1. Model is sole dialogue author for customer-facing consultation turns  
2. Planner no longer forces customer interview sequences as SSOT  
3. Policy Gate · Action Proposals · engines · audit still mandatory  
4. Only one active dialogue implementation remains  

---

## 6. Compatibility with frozen standards

| Standard | Impact |
|----------|--------|
| SARATHI Bible SB-01…SB-10 | **Preserved** — governors stay; dialogue authorship moves |
| CAD-2026-001 / ADR-017 | **Strengthened** — model must use engines/tools for business numbers |
| Pre-Launch Single Implementation | **Applies** — one dialogue brain after cutover |
| Chanakya non-blocking | Unchanged — SARATHI consultation ≠ Chanakya policy |
| ADR-018 / ADR-019 | Unrelated journey/Deal identity — **not reopened** |

---

## 7. Implementation authorisation boundary

This ADR **does not** authorise:

- Production code changes  
- Provider selection  
- Prompt / playbook publication as live SSOT  
- Voice cutover  
- Planner deletion  
- Vercel deploy for this programme  

Next authorised artefacts (documentation only until PO wave approval):

1. This ADR (**done**)  
2. Migration roadmap (**companion**)  
3. Later: Implementation Programme + Wave 1 plan + Constitutional Health Check **GREEN** + PO wave approval  

---

## 8. Decision summary

| Decision | Value |
|----------|--------|
| Conversation owner | **Conversational Reasoning Model** |
| Business authority | **Catalyst One via Enterprise AI Orchestrator** |
| Platform evolution | Enterprise AI Platform → **Enterprise AI Orchestrator** |
| Planner | Demoted to instrumentation — not dialogue brain |
| Voice | Interface only |
| Implementation | **Not authorised** |
| Principle status | **FROZEN** |

---

*ADR-022 — Architecture FROZEN · Implementation NOT AUTHORISED*

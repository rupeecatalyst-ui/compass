# CO-ARCH-RESET-001 — Migration Roadmap

**Status:** **G0 APPROVED** · Roadmap **accepted with PO amendments** (2026-08-07)  
**Governing ADR:** [ADR-022](../adr/ADR-022-enterprise-ai-orchestrator-conversational-reasoning.md) — **OFFICIALLY ACCEPTED · FROZEN**  
**Position paper:** [Architecture Position Paper](./CO-ARCH-RESET-001-ARCHITECTURE-POSITION-PAPER.md) — **Accepted**  
**Principle:** Conversation → Reasoning Model · Authority → Enterprise AI Orchestrator  

**Current gate:** **G2 Wave 1 delivered** — Shadow Mode Foundation ([CO-AI-G2-W1](../co-ai-g2-w1/CO-AI-G2-W1-SHADOW-MODE-FOUNDATION.md))  
**Not authorised:** Hybrid Cutover · dialogue replacement · UX · deploy · Phase 2A Benchmark programme start

---

## 0. Product Owner amendments (frozen into roadmap)

1. **Planner is not removed.** It becomes the **Consultation Readiness Engine (CRE)** owning:
   - Consultation Confidence  
   - Missing Information Analysis  
   - Proposal Readiness  
   - Action Readiness  

2. **Phase 2A — Consultant Benchmark** (mandatory before Hybrid Cutover): evaluation framework vs Rupee Catalyst consultant behaviour across Home Loan · LAP · Business Loan · Working Capital · Balance Transfer · Personal Loan.

3. **Constitutional SSOT freeze:** Enterprise engines remain SSOT for Calculations · Eligibility · Product Rules · Credit Policies · Workflow · CRM · Audit · Business Actions. The model may explain, guide, recommend — **never** become business authority.

---

## 1. Migration philosophy

**Strangler pattern on dialogue authorship. Preserve constitutional spine. Keep CRE.**

```text
KEEP     Policy Gate · Domain Boundary · Read Context · Action Proposals
         Engines (SSOT) · Audit · Security · Continuity · Proposal UI
REPOSITION  Dialogue Planner → Consultation Readiness Engine (CRE)
SHRINK   Facing shapers / heuristic dialogue authors → validators + fallback
ADD      Conversational Reasoning Model + contracts + Consultant Benchmark
RENAME   Enterprise AI Platform → Enterprise AI Orchestrator (governance)
```

---

## 2. Current → target map

| Concern | Current | Target |
|---------|---------|--------|
| Next utterance | Planner + facing | Reasoning model |
| Readiness / gaps / confidence | Mixed into dialogue | **CRE** (instrumentation) |
| Enterprise truth | Mixed fragments | Context pack + engine tools |
| Side effects | Action Proposals | Model propose intents → same lifecycle |
| Success metric | Slots filled | Consultant Benchmark + governors |

---

## 3. Phases

### Phase 0 — Freeze & alignment ✅

Position paper · ADR-022 · roadmap G0 · amendments accepted.

### Phase 1 — Orchestrator Contracts ✅ complete (G1 approved)

See: [`docs/co-ai-g1-001/`](../co-ai-g1-001/)

### Phase 2 — Shadow mode

| Wave | Status |
|------|--------|
| **G2-W1 Shadow Mode Foundation** | **Delivered** — flag OFF by default; customer isolated ([docs](../co-ai-g2-w1/CO-AI-G2-W1-SHADOW-MODE-FOUNDATION.md)) |
| **G2-W4 Triple Comparison** | **Delivered** — Live · Model · Gold internal reports only ([docs](../co-ai-g2-w4/CO-AI-G2-W4-TRIPLE-COMPARISON.md)) |
| **G2-W5 Context Quality Analyzer** | **Delivered** — optimization reports only ([docs](../co-ai-g2-w5/CO-AI-G2-W5-CONTEXT-QUALITY-ANALYZER.md)) |
| **G2-W6 Policy Validation Harness** | **Delivered** — shadow response validation reports only ([docs](../co-ai-g2-w6/CO-AI-G2-W6-POLICY-VALIDATION-HARNESS.md)) |
| **G2-W7 Cost & Performance Profiler** | **Delivered** — metrics + optimization report; no runtime opt ([docs](../co-ai-g2-w7/CO-AI-G2-W7-COST-PERFORMANCE-PROFILER.md)) |
| **G2-W8 Shadow Mode Dashboard** | **Delivered** — Product Owner review only; no customer access; no deploy ([docs](../co-ai-g2-w8/CO-AI-G2-W8-SHADOW-MODE-DASHBOARD.md)) |
| Later G2 waves (real provider) | Not authorised |

Model proposes in parallel when enabled; current dialogue still serves customers; CRE continues.

### Phase 2A — Consultant Benchmark ✅ foundation delivered (G2-W2)

Evaluation framework comparing consultation behaviour across eight dimensions for:

| Product path |
|--------------|
| Home Loan |
| Loan Against Property |
| Business Loan |
| Working Capital |
| Balance Transfer |
| Personal Loan |

**Artefacts:** [`docs/co-ai-g2-w2/`](../co-ai-g2-w2/) · offline reports only · **no runtime wiring**  
**Gold Standard Library (G2-W3):** [`docs/co-ai-g2-w3/`](../co-ai-g2-w3/) — PO benchmark dialogues · **not runtime SSOT**

**Exit (still required before Hybrid):** PO accepts quality bar thresholds on top of this framework.

### Phase 3 — Hybrid Cutover *(not authorised)*

Model owns dialogue; CRE supplies readiness hints only; engines remain SSOT.

### Phase 4 — Retire planner-**led dialogue** path

**Does not delete CRE.** Retires planner-as-facing-author only. CRE remains.

### Phase 5 — Voice-primary I/O *(after dialogue quality)*

### Phase 6 — Hardening & Freeze

---

## 4. Decision gates

| Gate | Meaning | Status |
|------|---------|--------|
| G0 | Accept ADR + roadmap | **APPROVED** |
| G1 | Phase 1 contracts | **AUTHORISED / in delivery** |
| G2 | Shadow mode | Wait for PO after G1 approval |
| G2A | Consultant Benchmark wave | Before Hybrid |
| G3 | Hybrid Cutover | After Benchmark |
| G4 | Replacement Certification (dialogue author) | After Phase 4 |
| G5 | Voice-primary | After dialogue BAT |

---

## 5. Untouched always

Domain Boundary · Policy Gate · Action Proposals (no auto-execute) · Engine SSOT · CAD-2026-001 · CRE capability (repositioned, not deleted)

---

*Migration Roadmap — amended 2026-08-07*

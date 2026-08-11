# CO-AI-104 DIE — Architecture Report

**Sprint:** AI-4 · Domain Intelligence Engine & SARATHI Communication Foundation  
**Code:** CO-AI-104-DIE  
**Framework:** `1.5.0-ai4-die` · Domain Governance `1.1.0-ai4-die` · Policy `1.3.0-domain-intelligence`  
**Status:** Implementation Complete — awaiting Product Owner approval  
**Date:** 2026-08-06  

Extends frozen AI-1 … AI-4 / AI-4A — **not redesigned**.

---

## 1. Objective

SARATHI is a **Financial Domain Intelligence System**, not a general-purpose AI.

Domain eligibility is enforced by the **platform** before Context Builder, Knowledge retrieval, and LLM.

---

## 2. Runtime topology

```text
Incoming request
      │
      ▼
 Domain Boundary Engine  ── Zone 1 / 2 / 3 · Intent
      │
      ├── OUTSIDE / UNKNOWN ──► "I'm not trained for this subject."
      │                         (no LLM · no knowledge · no alternate answers)
      │
      └── IN DOMAIN ──► Policy Gate → Context Builder → Tools → LLM → Composer
                         Tone Library + Micro Communication shape facing text
```

---

## 3. Delivered modules

| Concern | Path |
|---|---|
| Domain Boundary | `domain-governance/domain-boundary.ts` |
| Knowledge Zones | `constants/.../domain-governance.ts` |
| Tone Library | `constants/.../tone-library.ts` + resolver |
| Micro Communication | `domain-governance/micro-communication.ts` |
| Context Builder gate | `context-intelligence/package-builder.ts` |
| Composer | `response-composer.ts` |

---

## 4. Outside-domain contract

Exact response (all Behaviour Packs):

> I'm not trained for this subject.

No redirects. No LLM. No knowledge search.

---

## 5. Out of scope (honoured)

No UI · Voice · Streaming · Planner · Financial Decision Engine · CRM/Workflow execution

---

## 6. Next gate

Await Product Owner approval before deploy / git milestone / next sprint.

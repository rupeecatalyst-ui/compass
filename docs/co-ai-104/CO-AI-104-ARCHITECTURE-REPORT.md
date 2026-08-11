# CO-AI-104 — Architecture Report

**Sprint:** AI-4 · Enterprise Read Connectors & Tool Bus Integration  
**Code:** CO-AI-104  
**Framework:** `1.5.1-ai4-read` · Read Connectors `1.1.0-ai4`  
**Behaviour Constitution:** SARATHI Bible v1.0  
**Status:** Implementation Complete — awaiting Product Owner certification before CO-AI-105 / deploy / git  
**Date:** 2026-08-06  

Extends frozen AI-1 … AI-4 DIE — **not redesigned**.

---

## 1. Objective

Connect Context Intelligence to Catalyst One through **READ ONLY** Enterprise Read Connectors.

```text
Enterprise SSOT services
        ↓
Enterprise Read Connectors
        ↓
Business-safe Projections
        ↓
Context Providers → Context Builder
```

Direct database / Prisma access is permanently prohibited (SARATHI Bible SB-04 / SB-05).

---

## 2. Architecture

| Layer | Responsibility |
|---|---|
| Domain Boundary | Blocks outside-domain before knowledge / tools / LLM |
| Read Connectors | Sole AI entry into enterprise data |
| Projections | Flat business-safe fields only |
| Context Providers | Consume connectors only |
| Tool Bus | Read tools only |
| Audit | Behaviour Pack · Provider · Projection · Timestamp · Purpose |

---

## 3. Constitutional compliance

| Rule | Status |
|---|---|
| SARATHI Bible v1.0 | ✅ Formalised + enforced on read path |
| Enterprise AI Constitution | ✅ |
| SSOT / no Prisma in connectors | ✅ |
| Policy Gate + Capability Layer | ✅ |
| Context Intelligence sole preparer | ✅ |
| MAY READ / MUST NEVER WRITE | ✅ |

---

## 4. Out of scope (honoured)

No UI · Voice · Streaming · Planner · Financial Decision Engine · Product recommendations · CRM/Workflow mutations · Lead/Opportunity creation

---

## 5. Next gate

Await Product Owner certification before CO-AI-105, Vercel deploy, or Git milestone.

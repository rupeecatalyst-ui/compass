# CO-AI-115 — Architecture Report

**Sprint:** AI-15 · Enterprise Conversation Memory & Learning  
**Code:** CO-AI-115  
**Framework:** `1.16.0-ai15` · Conversation Memory Engine `1.0.0-ai15`  
**Governing standards:** Enterprise AI Constitution · SARATHI Bible v1.0  
**Status:** Implementation Complete — awaiting Product Owner certification  
**Date:** 2026-08-06  

Extends frozen Enterprise AI Platform — **maintains all previous architecture**.  
Memory enhances **long-term continuity** — it does not replace Policy Gate, Planner, Advisory, FDI, or enterprise rules.

---

## 1. Objective

Enhance long-term conversation continuity with controlled, auditable memory.

| Capability | Responsibility |
|---|---|
| Conversation Memory | Enterprise memory envelope keyed by continuity |
| Consultation History | Retained consultation snapshots (id · state · summary) |
| Customer Preferences | Language / product preferences (explicit upsert) |
| Known Facts | Sanitized facts from Consultation Intelligence |
| Outstanding Questions | Open planner / suggested / gap questions |
| Previous Recommendations | Facing recommendation lines retained |
| Previous Action Proposals | Draft / pending proposals only (`executionForbidden`) |
| Memory Confidence | Completeness / freshness band (not FOIR math) |
| Memory Expiry | TTL + expire open questions / envelope |
| Memory Validation | Structure · learning mode · audit invariants |

---

## 2. Hard constraints (honoured)

1. **Never** perform automatic online learning.  
2. **Never** modify enterprise rules / policies / certified calculations.  
3. Learning remains **controlled** (`controlled_explicit`) and **auditable**.  
4. Memory **never** executes CRM / workflow Action Proposals.  
5. Outside-domain refusal remains fixed; memory does not invent answers.

---

## 3. Architecture

```text
Conversation turn
        │
        ▼
 resolve / create Enterprise Conversation Memory
        │ compactProjection (EaiConversationMemory)
        ▼
 Planner · Consultation · Lead Intelligence  ← existing engines (unchanged)
        │
        ▼
 updateEaiEnterpriseMemoryFromTurn  (controlled explicit refresh + audit)
        │
        ▼
 Continuity.enterpriseMemoryId + turn.memory summary
```

Existing Context Intelligence compact memory (`EaiConversationMemory`) remains the projection SSOT for engines.  
AI-15 adds the long-term enterprise envelope + audit + expiry + validation around it.

---

## 4. Learning model

| Allowed | Forbidden |
|---|---|
| Explicit refresh from turn | Automatic online learning |
| Human-review audit notes | Unsupervised weight updates |
| Expiry / validation | Enterprise rule mutation |
| Draft proposal memory | Proposal execution |

Every audit entry affirms:

- `enterpriseRulesUnchanged: true`  
- `automaticOnlineLearning: false`

---

## 5. SSOT paths

| Concern | Path |
|---|---|
| Types | `src/types/enterprise-ai-conversation-memory.ts` |
| Constants | `src/constants/enterprise-ai-platform/conversation-memory.ts` |
| Engine | `src/lib/enterprise-ai-platform/conversation-memory/` |
| Compact projection (AI-3) | `src/lib/enterprise-ai-platform/context-intelligence/conversation-memory.ts` |
| Wire-in | `conversation-experience/turn-orchestrator.ts` |

---

## 6. Compliance

- Enterprise AI Constitution — engines decide; memory is continuity only  
- SARATHI Bible — domain refusal unchanged; Action Proposals remain gated  
- AI-11…AI-14 architecture maintained  

---

## 7. Version lineage

| Sprint | Framework |
|---|---|
| AI-14 Multilingual | `1.15.0-ai14` (historical) |
| **AI-15 Conversation Memory** | **`1.16.0-ai15`** |

---

## 8. Next gate

Awaiting Product Owner certification. Deploy / git milestone only when directed.

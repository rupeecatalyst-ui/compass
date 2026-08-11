# CO-AI-103 — Context Intelligence Engine Report

**Sprint:** AI-3  
**Code:** CO-AI-103  
**Status:** Implementation Complete — awaiting Product Owner approval before AI-4  
**Date:** 2026-08-05  
**Extends:** CO-AI-101 (foundation), CO-AI-102 (capability layer) — frozen, not redesigned

---

## 1. What was implemented

**Enterprise Context Intelligence Engine** — the only module allowed to prepare AI context.

| Module | Path | Role |
|---|---|---|
| Context Builder | `context-intelligence/package-builder.ts` | Build Context Packages |
| Providers | `context-intelligence/providers.ts` | Interfaces + stubs (all `implemented: false`) |
| Prioritisation | `context-intelligence/prioritisation.ts` | Relevant domains only |
| Sanitisation | `context-intelligence/sanitisation.ts` | Strip PII/secrets/internal IDs |
| Budget | `context-intelligence/budget.ts` | Max size · priority · truncation · summary replace |
| Conversation memory | `context-intelligence/conversation-memory.ts` | Structured memory — never full chat |
| Validator | `context-intelligence/package-validator.ts` | Structure · duplicates · providers · size |
| Readiness | `context-intelligence/readiness.ts` | End-to-end smoke |
| Compiler bridge | `context-compiler.ts` → `compileEaiContextFromPackage` | Package → LLM-facing compiled context |

Types: `src/types/enterprise-ai-context-intelligence.ts`  
Constants: `src/constants/enterprise-ai-platform/context-intelligence.ts`

---

## 2. Architecture diagram

```text
Behaviour Pack request (future)
        │
        ▼
┌───────────────────────────┐
│ Context Intelligence      │
│  Prioritiser              │── domains (relevant only)
│  Providers (stubs AI-3)   │── sanitized slices
│  Sanitiser                │── strip secrets / IDs / PII
│  Budget                   │── truncate / summarize
│  Builder                  │── Context Package + versioning
│  Validator                │── readiness checks
└─────────────┬─────────────┘
              │ EaiContextPackage
              ▼
┌───────────────────────────┐
│ Context Compiler          │  (projection only — not a second preparer)
│  compileEaiContextFromPkg │
└─────────────┬─────────────┘
              │ EaiCompiledContext (facts + refs + redaction notes)
              ▼
     LLM Provider Abstraction / Policy Gate / Composer
```

**Hard rule:** LLM never receives raw enterprise objects.

---

## 3. Context Package (canonical)

Optional sections: Customer · Loan · Partner · Product · Workflow · Knowledge · Conversation · Financial · Document · Policy  

Each package includes: versioning (package/builder/provider versions + timestamp + future audit ref), budget metadata, sanitisation notes.

---

## 4. Prioritisation examples

| Hint | Domains |
|---|---|
| "What is Balance Transfer?" | product / knowledge / conversation — **not** customer or loan |
| "Should I reduce my EMI?" | loan / financial / conversation / product |

---

## 5. How this supports Behaviour Packs

| Pack | How CIE helps |
|---|---|
| **SARATHI Customer** | Minimal education context by default; loan/financial only when intent warrants |
| **SARATHI Wealth Partner** | Partner + product + knowledge domains selectable; same sanitisation/budget rules |
| **Future CHANAKYA** | Same engine; different domain force lists / memory — no second context stack |

Policy Gate + Capability Manifest still decide *whether* a pack may request a domain’s tools; CIE decides *what sanitized slice* is prepared.

---

## 6. How AI-4 should integrate (Enterprise Tool Bus Read Connectors)

1. Implement real `EaiContextProvider`s (`implemented: true`) that call **existing SSOT read projections** (never raw Prisma rows).  
2. `registerEaiContextProvider(provider)` replaces stubs per domain.  
3. Optionally mirror the same projections as Tool Bus **read** tools with matching tool categories from AI-2.  
4. Keep calculations in enterprise engines — providers return **results**, not formulas.  
5. Do **not** bypass CIE by feeding registry dumps into `compileEaiContext`.  
6. Still no SARATHI UI / CRM mutation unless PO expands scope.

---

## 7. Extension points

| Extension | API |
|---|---|
| Register provider | `registerEaiContextProvider` |
| Build package | `buildEaiContextPackage` |
| Validate | `validateEaiContextPackage` |
| Project to LLM context | `compileEaiContextFromPackage` |
| Budget policy | `budgetPolicy` on build request |
| Force domains | `forceDomains` override |

---

## 8. Out of scope (confirmed)

No SARATHI UI · Voice · Planner · Product recommendation · Financial decision engine · Customer/Loan registry production connectors · Credit engine · CRM actions

---

## 9. Validation

| Check | Command |
|---|---|
| Structural | `npm run verify:co-ai-103` |
| Readiness | `npm run ai:context:validate` |
| Regression | `npm run verify:co-ai-101` · `verify:co-ai-102` · foundation/capability validates |

---

## 10. Final status

**Implementation Complete (Context Intelligence)** · **Ready for Product Owner review** · **AI-4 blocked pending approval**

# CO-AI-101 — Enterprise AI Platform Foundation Report

**Sprint:** AI-1  
**Code:** CO-AI-101  
**Status:** Implementation Complete — awaiting Product Owner approval before AI-2  
**Date:** 2026-08-05

---

## 1. What was implemented

Persona-agnostic **Enterprise AI Platform** foundation only. No SARATHI conversational product, voice, multilingual, advisory, or CRM execution.

| Module | Path | Role |
|---|---|---|
| Session Orchestrator | `src/lib/enterprise-ai-platform/session-orchestrator.ts` | Session lifecycle, turns, continuity keys |
| Context Compiler | `src/lib/enterprise-ai-platform/context-compiler.ts` | Sanitized facts + opaque refs; connector stubs |
| Policy Gate | `src/lib/enterprise-ai-platform/policy-gate.ts` | Tools, data scopes, Action Proposal requirement |
| Tool Bus | `src/lib/enterprise-ai-platform/tool-bus.ts` | Tool registration + gated read invocation |
| Response Composer | `src/lib/enterprise-ai-platform/response-composer.ts` | Sole audience-facing text composer |
| Action Proposal Framework | `src/lib/enterprise-ai-platform/action-proposals.ts` | Propose-only CRM/workflow intents |
| Enterprise AI Registry | `src/lib/enterprise-ai-platform/ai-registry.ts` | Interaction recording framework |
| LLM Provider Abstraction | `src/lib/enterprise-ai-platform/llm-provider.ts` | Vendor-invisible completion API |
| Composition / Ports | `composition.ts` + `repositories/in-memory.ts` | EDE-style ports + stub LLM |
| Foundation Validation | `foundation-validation.ts` | End-to-end module smoke |

Supporting:

- Types: `src/types/enterprise-ai-platform.ts`, `enterprise-ai-platform-ports.ts`
- Constants: `src/constants/enterprise-ai-platform/`
- Rule: `.cursor/rules/enterprise-ai-platform.mdc`
- Verify: `npm run verify:co-ai-101`
- Runtime smoke: `npm run ai:foundation:validate`

---

## 2. Module relationships

```text
Caller (future Behaviour Pack)
        │
        ▼
Session Orchestrator ──► turns / session lifecycle
        │
        ▼
Context Compiler ──► sanitized context (never raw registries)
        │
        ▼
Policy Gate ──► allowed tools / scopes / require Action Proposal
        │
        ├──────────────► Tool Bus (read tools only)
        │                      │
        │                      ▼
        │               Enterprise Engines (future connectors)
        │
        ├──────────────► Action Proposal Framework (no execute)
        │
        ├──────────────► LLM Provider Abstraction (stub today)
        │
        ▼
Response Composer ──► audience-facing text
        │
        ▼
Enterprise AI Registry ──► interaction audit record
```

**Hard rules encoded**

- Engines decide; LLM explains (no eligibility / FOIR / DBR / pricing in AI modules).
- Mutate/propose tools cannot run through Tool Bus.
- `executed_reserved` on Action Proposals is blocked in AI-1 (forced back to `pending_review`).
- Response Composer is the only facing-text composer.

---

## 3. Directory structure

```text
src/types/enterprise-ai-platform.ts
src/types/enterprise-ai-platform-ports.ts
src/constants/enterprise-ai-platform/index.ts
src/lib/enterprise-ai-platform/
  index.ts
  composition.ts
  session-orchestrator.ts
  context-compiler.ts
  policy-gate.ts
  tool-bus.ts
  response-composer.ts
  action-proposals.ts
  ai-registry.ts
  llm-provider.ts
  registry-snapshot.ts
  foundation-validation.ts
  repositories/in-memory.ts
.cursor/rules/enterprise-ai-platform.mdc
docs/co-ai-101/CO-AI-101-ENTERPRISE-AI-PLATFORM-FOUNDATION-REPORT.md
scripts/co-ai-101-verify.mjs
```

---

## 4. Interfaces (extension points)

| Interface | Purpose |
|---|---|
| `EaiPorts` | Swap session/context/proposal/interaction/tool stores + LLM provider |
| `EaiLlmProvider` | Plug OpenAI / Azure / Anthropic / Google / local later |
| `registerEaiTool(def, handler?)` | Register future engine-backed tools |
| `EaiContextSourceDescriptor` | Catalogue for future registry connectors (`implemented: false` in AI-1) |
| `EaiPersonaPackId` | Reserved packs: `sarathi_customer`, `sarathi_wealth_partner`, `chanakya_executive` |
| `EaiActionProposal` | Future governed executor consumes proposals (not AI-1) |

Configure provider without leaking vendor types into business modules:

```ts
configureEaiPorts({ llmProvider: myProvider });
```

---

## 5. Technical decisions

1. **Same ports pattern as EDE/ETE** — in-memory default, injectable adapters.
2. **Deny-by-default Policy Gate** — unknown tools fail; mutate denied; CRM intent hints force proposals.
3. **Stub LLM provider** (`eai.stub`) — foundation works offline; no API keys required.
4. **No Planner module in AI-1** — deferred to behaviour-pack sprints (architecture reserved conceptually).
5. **No Prisma / API routes in AI-1** — framework only; persistence and HTTP surfaces later.
6. **Persona packs reserved but inactive** — platform remains agnostic.

---

## 6. Assumptions

1. Architecture freeze from CO-AI-000 / CO-AI-001 remains authoritative.
2. Phase-1 conversational product will be SARATHI; CHANAKYA stays intelligence-only until a later gate.
3. Production LLM credentials and network egress are out of scope for AI-1.
4. Future CRM execution will call ETE / Opportunity / Document Request services — never invent a parallel task engine.
5. CAD-2026-001 applies: AI must not invent business values; uncaptured stays Not Specified at product layers.

---

## 7. What remains (explicitly out of scope for AI-1)

- SARATHI UI / chat screen / streaming
- Voice / STT / TTS / multilingual
- Financial advisory behaviour pack
- Real registry connectors in Context Compiler
- Real engine tools on Tool Bus
- Action Proposal **execution**
- Durable AI Registry persistence
- Production LLM providers
- Conversational CHANAKYA

---

## 8. How Sprint AI-2 should build on this

**Recommended AI-2 focus (await PO approval):**

1. Wire first **read** tools to existing SSOTs (e.g. customer/product summary projections) via Tool Bus handlers — still no mutate.
2. Flesh Context Compiler connectors for COMPASS/Connect **sanitized** projections.
3. Expand Policy Gate allowlists per reserved persona pack (still without shipping SARATHI UI if PO prefers a pure integration sprint).
4. Optionally introduce a thin **Planner** interface that emits tool plans + Action Proposal drafts.
5. Do **not** start voice, multilingual, or CRM execution in AI-2 unless PO explicitly expands scope.

Do **not** begin AI-2 until Product Owner approves this foundation.

---

## 9. Validation

| Check | Command |
|---|---|
| Structural | `npm run verify:co-ai-101` |
| Runtime foundation | `npm run ai:foundation:validate` |

---

## 10. Final status

**Implementation Complete (Foundation)** · **Ready for Product Owner review** · **AI-2 blocked pending approval**

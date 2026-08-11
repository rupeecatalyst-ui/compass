# CO-AI-102 — Enterprise Capability Layer Report

**Sprint:** AI-2  
**Code:** CO-AI-102  
**Status:** Implementation Complete — awaiting Product Owner approval before AI-3  
**Date:** 2026-08-05  
**Extends:** CO-AI-101 (frozen foundation)

---

## 1. What was implemented

Declarative **Enterprise Capability Layer** on top of the AI-1 platform. No SARATHI UI, voice, chat, multilingual runtime, financial advisory, CRM execution, or Mission Control changes.

| Deliverable | Path |
|---|---|
| Behaviour Pack framework | `behaviour-packs.ts`, `behaviour-pack-scaffolds.ts` |
| Capability Manifest | `capability-manifest.ts` + catalogue constants |
| Permission Matrix | `permission-matrix.ts` + `EAI_PLATFORM_PERMISSION_MATRIX` |
| Tool Categories | `tool-categories.ts` + `EAI_TOOL_CATEGORY_CATALOGUE` |
| Behaviour Configuration | `behaviour-config.ts` (tone/style — no prompts) |
| Policy Gate integration | `policy-gate.ts` (capability + category aware) |
| Readiness validation | `capability-readiness.ts` |

Types: `src/types/enterprise-ai-capability-layer.ts`  
Constants: `src/constants/enterprise-ai-platform/capability-layer.ts`

---

## 2. Behaviour Pack architecture

A Behaviour Pack is a loadable personality container:

- `packId` (aligned with `EaiPersonaPackId`)
- Capability Manifest
- Behaviour Configuration
- Optional permission overlays
- Lifecycle: `scaffold` | `registered` | `active` | `retired`

**Dynamic API:** `registerEaiBehaviourPack` · `loadEaiBehaviourPack` · `listEaiBehaviourPacks`

**AI-2 scaffolds (not conversationally active):**

1. `platform_none`
2. `sarathi_customer`
3. `sarathi_wealth_partner`
4. `chanakya_executive` (future conversational — intelligence-only today)

---

## 3. Capability Manifest architecture

Each pack exposes a declarative capability list + explicit denials.

Catalogue includes explain/compare/ask/consultation/proposals/document request/context reads/knowledge, plus reserved: voice, workflow execution, notifications, scheduling, CRM mutation, create opportunity.

---

## 4. Permission model

1. **Platform Permission Matrix** — global allow/deny per capability  
2. **Pack Manifest** — pack may only use a subset of platform-allowed capabilities  
3. **Pack overlays** — optional deny/allow refinement  
4. **Policy Gate** — sole enforcement boundary (`evaluateEaiPolicy`)

Examples enforced in readiness:

| Capability | Allowed |
|---|---|
| Generate Action Proposals | Yes (proposal only) |
| Create Opportunity | No |
| Execute Workflow | No |
| CRM Mutation | No |
| Voice | No |

---

## 5. Tool category architecture

Groups: Registry · Knowledge · Financial · Workflow · Communication  

All categories `implemented: false` in AI-2. Tools may declare `category`; Policy Gate denies tools/categories not allowed by the pack configuration.

---

## 6. Policy Gate integration

`EaiPolicyRequest` now accepts:

- `requestedCapabilityIds`
- `requestedToolCategories`

`EaiPolicyDecision` returns:

- `allowedCapabilityIds` / `deniedCapabilityIds`
- `deniedToolCategories`

No bypass path — capabilities not in matrix/manifest are denied.

---

## 7. Directory structure

```text
src/types/enterprise-ai-capability-layer.ts
src/constants/enterprise-ai-platform/capability-layer.ts
src/lib/enterprise-ai-platform/
  behaviour-packs.ts
  behaviour-pack-scaffolds.ts
  behaviour-config.ts
  capability-manifest.ts
  permission-matrix.ts
  tool-categories.ts
  capability-readiness.ts
  policy-gate.ts                    (extended)
  tool-bus.ts                       (category on register)
  registry-snapshot.ts              (extended)
  index.ts                          (exports)
docs/co-ai-102/CO-AI-102-ENTERPRISE-CAPABILITY-LAYER-REPORT.md
scripts/co-ai-102-verify.mjs
scripts/co-ai-102-capability-validate.mts
```

---

## 8. Future extension strategy

1. Activate a Behaviour Pack (`lifecycle: active`) only with PO approval.  
2. AI-3 should wire **read** tool handlers + sanitized context connectors under allowed categories.  
3. Add financial tool categories to packs only when calculator engines are exposed via Tool Bus (engines still calculate).  
4. Never promote `crm_mutation` / `workflow_execution` without Action Proposal executor + Policy Engine.  
5. Voice/language fields stay configuration-only until dedicated sprints.

---

## 9. How AI-3 should build on this

Recommended AI-3 (await PO approval):

1. Context Compiler connectors for allowed registry categories (sanitized projections).  
2. Register real read handlers on Tool Bus with categories.  
3. Thin Planner that emits capability + tool plans validated by Policy Gate.  
4. Still **no** SARATHI UI / voice / CRM execution unless scope explicitly expanded.

---

## 10. Architectural improvements discovered

1. Separating **platform permission** from **pack manifest** prevents a pack from self-escalating into denied capabilities.  
2. Tool categories on Tool Bus definitions make Policy Gate category checks enforceable without stringly-typed app logic.  
3. Keeping CHANAKYA Executive as a scaffold (not active) preserves SARATHI-first sequencing without deleting multi-persona readiness.

---

## 11. Validation

| Check | Command |
|---|---|
| Structural | `npm run verify:co-ai-102` |
| Readiness | `npm run ai:capability:validate` |
| AI-1 still green | `npm run verify:co-ai-101` · `npm run ai:foundation:validate` |

---

## 12. Final status

**Implementation Complete (Capability Layer)** · **Ready for Product Owner review** · **AI-3 blocked pending approval**

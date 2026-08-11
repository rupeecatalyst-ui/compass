# CO-AI-G1-001 — Enterprise AI Orchestrator Contracts (Phase 1)

**Status:** Phase 1 deliverable · **Awaiting Product Owner approval before G2**  
**Authorisation:** G1 **AUTHORISED** (2026-08-07)  
**Governing ADR:** [ADR-022](../adr/ADR-022-enterprise-ai-orchestrator-conversational-reasoning.md)  
**Contract version:** `1.0.0-g1-001`  
**TypeScript SSOT (types only):** `src/types/enterprise-ai-orchestrator/`

### Explicit non-scope (this gate)

- No Hybrid Cutover  
- No replacement of current dialogue engine  
- No SARATHI UX changes  
- No production wiring of model into `/sarathi`  
- No deployment  

---

## 1. Frozen ownership (recap)

| Actor | Owns |
|-------|------|
| **Conversational Reasoning Model** | Understanding · dialogue · follow-ups · explanations · consultation flow · multilingual |
| **Enterprise AI Orchestrator** | Context · Policy Gate · tools · Action Proposals · audit · memory · validation · security |
| **Consultation Readiness Engine (CRE)** | Confidence · missing info · proposal readiness · action readiness *(planner repositioned — not removed)* |
| **Enterprise engines / Catalyst One** | **SSOT** for calculations · eligibility · product rules · credit policies · workflow · CRM · audit · business actions |

Model may explain, guide, recommend. Model is **never** business authority.

---

## 2. Component diagram

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Surfaces (unchanged in G1)                                               │
│  /sarathi text UX · (future) Voice I/O                                   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │  (live path still = current dialogue)
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Enterprise AI Orchestrator (target control plane)                        │
│                                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐ │
│  │ Policy Gate │  │ Context Pack │  │ CRE (hints) │  │ Tool Router   │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └───────┬───────┘ │
│         │                │                 │                  │         │
│         └────────────────┴────────┬────────┴──────────────────┘         │
│                                   ▼                                      │
│                    ┌──────────────────────────┐                          │
│                    │ Model Provider Port      │ ← abstraction            │
│                    │ (untrusted until valid.) │                          │
│                    └────────────┬─────────────┘                          │
│                                 ▼                                        │
│         ┌──────────────┐  ┌─────────────┐  ┌────────────────────────┐  │
│         │ Validation   │  │ Memory      │  │ Action Proposal Drafts │  │
│         └──────┬───────┘  └──────┬──────┘  └───────────┬────────────┘  │
│                └─────────────────┴──────────────────────┘                │
│                                   ▼                                      │
│                            ┌────────────┐                                │
│                            │ Audit Log  │                                │
│                            └────────────┘                                │
└──────────────────────────────────────────────────────────────────────────┘
           │ read-only / compute-only / propose-only
           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Enterprise Authority (SSOT)                                              │
│  Product · Lender · Credit · FOIR/Eligibility engines · CRM · Workflow   │
│  Registries · EDL / Audit stores                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

**G1 freeze:** contracts + diagrams + types. Live arrow from `/sarathi` to Orchestrator model path is **not** cut over.

---

## 3. Sequence diagram (target turn — post–future cutover)

```text
Customer          Orchestrator              CRE           Model Provider         Engines
   │                    │                    │                  │                   │
   │  utterance         │                    │                  │                   │
   │───────────────────►│                    │                  │                   │
   │                    │ Policy Gate        │                  │                   │
   │                    │──────────────────────────────────────────────────────────►│
   │                    │◄── decision ──────────────────────────────────────────────│
   │                    │ assemble Context Pack (registries)                        │
   │                    │───────────────────►│ readiness snapshot                   │
   │                    │◄── confidence/gaps─│                  │                   │
   │                    │ Conversation Request                                      │
   │                    │──────────────────────────────────────►│                   │
   │                    │                    │   tool calls?    │                   │
   │                    │◄──────────────────────────────────────│                   │
   │                    │ invoke tools (allowed only) ─────────────────────────────►│
   │                    │◄── engine payloads ───────────────────────────────────────│
   │                    │ Conversation Response (untrusted)                         │
   │                    │◄──────────────────────────────────────│                   │
   │                    │ Response Validation                                       │
   │                    │ Memory apply (validated)                                  │
   │                    │ Action Proposal drafts (never execute)                    │
   │                    │ Audit record                                              │
   │  facing text       │                    │                  │                   │
   │◄───────────────────│                    │                  │                   │
```

**G1:** This sequence is the **contract target**. Current production turn path is unchanged.

---

## 4. Contract specifications (ten frozen contracts)

TypeScript definitions: `src/types/enterprise-ai-orchestrator/contracts.ts`

| # | Contract | `contractId` | Purpose |
|---|----------|--------------|---------|
| 1 | Enterprise Context | `eao.context.v1` | Provenanced read pack for the model; CRE readiness attached; engines are SSOT |
| 2 | Conversation Request | `eao.request.v1` | Bounded history + utterance + language + `propose_only` side-effect policy |
| 3 | Conversation Response | `eao.response.v1` | One objective + facingText + memory/proposal/tool intents; untrusted until validated |
| 4 | Tool Invocation | `eao.tool.request.v1` / `eao.tool.result.v1` | Engine-backed tools; `forbidden_execute` for CRM/workflow execute |
| 5 | Policy Gate | `eao.policy.request.v1` / `eao.policy.decision.v1` | Hard allow/deny; domain boundary mandatory |
| 6 | Enterprise Memory | `eao.memory.v1` | Consultation memory; not CRM SSOT; writes via validated intents |
| 7 | Action Proposal | `eao.action_proposal.v1` | Draft proposals; `executionPolicy: never_auto_execute` |
| 8 | Response Validation | `eao.validation.v1` | Reject invented calc/eligibility/EMI; strip/regenerate/fallback |
| 9 | Audit | `eao.audit.v1` | Forensic record: hashes, policy, model version, tools, proposals, validation |
| 10 | Model Provider Abstraction | `eao.model_provider.v1` | Port + selection policy; model never authoritative for enterprise domains |

### 4.1 Context packaging strategy

1. Assemble **only** Policy-Gate–allowed scopes.  
2. Every fact is an `EaoProvenancedFact` (registry / engine / memory / CRE / utterance).  
3. Mark engine outputs as authoritative; mark model-inferred values `model_inference_untrusted` if ever stored.  
4. Attach CRE snapshot as **hints**, not scripts.  
5. Compute `contentHash` for audit.  
6. Redact PII beyond allowed scopes; record `redactionNotes`.  
7. Cap pack size (implementation detail later) — prefer denser facts over narrative dumps.

### 4.2 Tool calling strategy

| Class | Allowed | Examples |
|-------|---------|----------|
| `read_only` | Yes | Opportunity snapshot, product master read |
| `compute_only` | Yes | FOIR / eligibility **engine** calls |
| `propose_side_effect` | Yes → Action Proposal | Create task / document request **proposal** |
| `forbidden_execute` | Never via model | CRM write, workflow transition execute |

Flow: Model requests tool → Orchestrator checks Policy Gate allow-list → Engine executes → Result returns with `provenance: enterprise_engine` → Model may narrate result → Validator ensures narration does not invent extra numbers.

### 4.3 Provider abstraction design

```text
EaoModelProviderPort
  providerId · configVersion · capabilities
  complete(EaoConversationRequestContract) → EaoConversationResponseContract
```

- Orchestrator **must not** import vendor SDKs in core.  
- Selection is **config-driven**.  
- Output always `trustState: unvalidated` until Response Validation.  
- `neverAuthoritativeFor` lists the constitutional SSOT domains.

---

## 5. Error handling strategy

| Failure | Orchestrator behaviour |
|---------|------------------------|
| Domain out of scope | Safe refusal text from Policy Gate; no model call required |
| Policy deny | Block tools/scopes; refuse or constrained continue per decision |
| Model provider down | **Fallback dialogue** (current engine / minimal pack) — labelled degraded in audit |
| Schema-invalid response | `regenerate_once` then fallback |
| Invented EMI / eligibility / rate | `strip_claims` or `force_refusal`; never publish as fact |
| Unapproved tool call | Drop call; validation failure |
| CRM/workflow execute attempt in payload | Reject; audit security event |
| Memory write conflicts with registry SSOT | Prefer registry; reject conflicting write intent |
| CRE unavailable | Continue without readiness hints; audit null readiness |

**Principle:** Prefer **safe degradation** over silent hallucination.

---

## 6. Security considerations

1. **Ingress Policy Gate + Domain Boundary** — mandatory.  
2. **Egress validation** — model output untrusted.  
3. **Prompt injection** — treat utterance as hostile; tools/scopes only via gate.  
4. **No credential leakage** into context pack.  
5. **Action Proposals only** — no silent CRM/workflow.  
6. **Audit hashes** — utterance/facing/context without necessarily storing full PII in every sink.  
7. **Provider isolation** — vendor adapters outside orchestrator core.  
8. **CRE is not a privilege escalation path** — readiness cannot unlock denied tools.

---

## 7. Migration impact assessment

| Area | Impact of G1 contracts | Risk if misused |
|------|------------------------|-----------------|
| Live SARATHI UX | **None** (not wired) | Accidental early cutover |
| Current dialogue engine | **Unchanged** | Dual-brain if both write facing |
| Planner / CRE | Types define CRE snapshot; runtime planner **unchanged** in G1 | Premature planner deletion (forbidden) |
| Policy Gate / proposals | Contracts align with existing platform types | Drift if parallel gate invented |
| Engines | Reinforced as SSOT | Model treated as calculator |
| AI-1…AI-17 suites | Compatible; G1 adds contract types | Breaking old types unnecessarily |
| G2 Shadow | Can consume these contracts | Starting G2 without PO approval |
| Hybrid (G3) | Depends on contracts + Phase 2A Benchmark | Skipping Benchmark |

**Rollback of G1:** Delete or ignore contract module; no runtime dependency yet.

---

## 8. Relationship to Consultation Readiness Engine

CRE (repositioned planner) feeds `EaoConsultationReadinessSnapshot` into Context + Request contracts.

CRE owns:

- Consultation Confidence  
- Missing Information Analysis  
- Proposal Readiness  
- Action Readiness  

CRE does **not** own `facingText` after future Hybrid Cutover. In G1, CRE runtime behaviour is **not modified**.

---

## 9. Phase 2A reminder (not in G1)

**Consultant Benchmark** must exist before Hybrid Cutover — product paths:

Home Loan · LAP · Business Loan · Working Capital · Balance Transfer · Personal Loan.

G1 does not build the benchmark harness.

---

## 10. Approval request

Product Owner is requested to:

1. **Approve** these ten contracts as frozen for Orchestrator integration design.  
2. **Confirm** G1 complete (documentation + types-only contract layer).  
3. **Withhold G2** until explicit authorisation (Shadow mode).

---

## 11. Files delivered

| Path | Role |
|------|------|
| `docs/co-ai-g1-001/CO-AI-G1-001-ORCHESTRATOR-CONTRACTS.md` | This specification |
| `docs/co-ai-g1-001/README.md` | Index |
| `src/types/enterprise-ai-orchestrator/contracts.ts` | Frozen TypeScript contracts |
| `src/types/enterprise-ai-orchestrator/index.ts` | Exports |
| ADR-022 / Migration Roadmap | Amended for CRE · Phase 2A · SSOT · G1 |

---

*End of CO-AI-G1-001 — awaiting PO approval before G2*

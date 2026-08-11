# CO-AI-G2-W1 — Shadow Mode Foundation

**Status:** Wave 1 delivered · **Awaiting Product Owner validation**  
**Authorisation:** G2 Wave 1 only (2026-08-07)  
**Governing ADR:** [ADR-022](../adr/ADR-022-enterprise-ai-orchestrator-conversational-reasoning.md)  
**G1 contracts:** [CO-AI-G1-001](../co-ai-g1-001/CO-AI-G1-001-ORCHESTRATOR-CONTRACTS.md)  
**Version:** `1.0.0-g2-w1`

### Explicit non-scope

- No customer UX changes  
- No SARATHI dialogue authorship change (`facingText` still from current path)  
- No Hybrid Cutover  
- No deploy  
- No Consultant Benchmark (Phase 2A)  

---

## 1. Architecture Report

### Objective

Create **Shadow Mode infrastructure** so a Conversational Reasoning Model (stub in W1; real provider later) can run **silently in parallel** with the live SARATHI turn for capture and comparison — without affecting what the customer sees.

### Principles

| Rule | Enforcement |
|------|-------------|
| Customer sees current SARATHI only | Shadow response never assigned to `facingText` |
| Flag OFF by default | `EAO_SHADOW_MODE_ENABLED` unset ⇒ no-op |
| Failures isolated | Shadow errors swallowed; live path unaffected |
| Engines remain SSOT | Stub does not invent EMI / eligibility / approvals |
| Contracts reused | Shadow request/response use G1 `eao.request.v1` / `eao.response.v1` |

### Components

| Component | Path | Role |
|-----------|------|------|
| Feature flag | `src/constants/enterprise-ai-orchestrator/shadow-mode.ts` | Default OFF |
| Pipeline | `src/lib/enterprise-ai-orchestrator/shadow/pipeline.ts` | Invoke · capture · compare |
| Stub provider | `stub-provider.ts` | Silent parallel “reasoning” for W1 |
| Capture store | `capture-store.ts` | In-memory records (max 200) |
| Comparison | `compare.ts` | Lexical / length / banned / objective dims |
| Live hook | `turn-orchestrator.ts` | `scheduleEaoShadowAfterLiveTurn` after live facing is fixed |

### Customer isolation guarantee

```text
liveFacing = current SARATHI path
scheduleShadow(liveFacing)   // fire-and-forget; ignored when flag off
return { facingText: liveFacing }  // unchanged
```

---

## 2. Sequence Diagram

```text
Customer                Live SARATHI                 Shadow Pipeline              Stub/Model
   │                         │                              │                         │
   │  utterance              │                              │                         │
   │────────────────────────►│                              │                         │
   │                         │ Policy/Planner/CRE/Facing    │                         │
   │                         │ (UNCHANGED authorship)       │                         │
   │                         │                              │                         │
   │                         │ if flag OFF: return          │                         │
   │                         │ if flag ON:                  │                         │
   │                         │ scheduleEaoShadowAfterLiveTurn                         │
   │                         │─────────────────────────────►│                         │
   │  facingText (live only) │                              │ build request           │
   │◄────────────────────────│                              │────────────────────────►│
   │                         │                              │◄── response ────────────│
   │                         │                              │ compare + capture       │
   │                         │                              │ (never → UI)            │
```

---

## 3. Feature Flag Design

| Item | Value |
|------|--------|
| Env var | `EAO_SHADOW_MODE_ENABLED` |
| Default | **disabled** (unset / empty / false) |
| Truthy | `1` · `true` · `yes` · `on` (case-insensitive) |
| Public mirror | **None** — server/runtime only; do not expose to browser as UX toggle in W1 |
| Helper | `isEaoShadowModeEnabled()` |

When disabled:

- `scheduleEaoShadowAfterLiveTurn` returns immediately  
- No provider call  
- No capture store write  

Enable only in controlled BAT / shadow environments — not production customer traffic without PO approval.

---

## 4. Shadow Invocation Flow

1. Live turn completes and fixes `facingText`.  
2. Hook calls `scheduleEaoShadowAfterLiveTurn({ live })`.  
3. If flag off → exit.  
4. If flag on → `runEaoShadowInvocation`:  
   - Build `EaoConversationRequestContract`  
   - `provider.complete(request)` (stub by default; injectable via `configureEaoShadowProvider`)  
   - `compareEaoShadowToLive`  
   - `saveEaoShadowCapture` with `customerIsolated: true`  
5. Live return value unchanged.

---

## 5. Comparison Framework (W1)

Dimensions (0–1 scores → overall mean):

- Lexical overlap (Jaccard)  
- Length similarity  
- Both non-empty  
- Shadow avoids banned generics  
- Live avoids banned generics  
- Objective alignment (when live hint present)  

`diverged` when overall &lt; 0.55 (threshold tunable in later waves).

---

## 6. Validation Report

| Check | Result |
|-------|--------|
| Flag defaults OFF | ✅ `isEaoShadowModeEnabled()` false when unset |
| Disabled path no capture | ✅ skip status; store unchanged |
| Enabled path captures | ✅ verify script toggles env |
| Customer facing unchanged | ✅ hook does not assign shadow to facingText |
| Stub avoids invented EMI | ✅ stub copy policy |
| No UI files changed | ✅ SARATHI components untouched |
| `verify:co-ai-g2-w1` | Run in Validation section below |

---

## 7. Migration impact

| Area | Impact |
|------|--------|
| Customer UX | None (flag off default) |
| Dialogue authorship | Unchanged |
| G1 contracts | Reused, not broken |
| G2 full shadow programme | Foundation ready for real provider + dashboards |
| Phase 2A Benchmark | Not started |
| Hybrid Cutover | Not authorised |

---

## 8. Files

- `src/constants/enterprise-ai-orchestrator/shadow-mode.ts`  
- `src/types/enterprise-ai-orchestrator/shadow.ts`  
- `src/lib/enterprise-ai-orchestrator/shadow/*`  
- `docs/co-ai-g2-w1/*`  
- Hook: `turn-orchestrator.ts` (schedule only)

---

*Awaiting PO approval before G2 Wave 2 / G2A / Hybrid*

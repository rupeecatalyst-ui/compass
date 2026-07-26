# ADR-019 Implementation Programme  
# CO-ARCH-004 — Deal Workspace Identity

**Document type:** Implementation Programme (Planning Only)  
**Status:** **APPROVED** · **Roadmap CERTIFIED** · **Programme FROZEN**  
**Product Owner certification:** 2026-07-25  
**Date:** 2026-07-25 · **Amended:** 2026-07-25 (governance enhancements) · **Certified:** 2026-07-25  
**Programme ID:** CO-ARCH-004-DWI / ADR-019-IMP  
**Parent ADR:** [`ADR-019-co-arch-004-deal-workspace-identity.md`](../adr/ADR-019-co-arch-004-deal-workspace-identity.md) — **APPROVED · Architecture CERTIFIED · FROZEN**  
**Baseline:** [`ENTERPRISE-ARCHITECTURE-BASELINE-REPORT.md`](../architecture/ENTERPRISE-ARCHITECTURE-BASELINE-REPORT.md) — **Accepted**  

| Field | Value |
|-------|--------|
| Programme STATUS | **APPROVED** |
| ROADMAP | **CERTIFIED** |
| IMPLEMENTATION | **NOT YET AUTHORISED** |

**Implementation authorisation**

- This programme certification does **not** authorise production code.  
- The **planning phase is complete** — this Implementation Programme is **frozen**.  
- **Wave 1** is an **independent** implementation authorisation and requires its own Architecture Approval · Sprint Approval · Constitutional Health Check (**GREEN**) before any production code.  
- Do **not** commence Wave 1 until a **separate Product Owner authorisation** is issued.  

**Explicit non-goals of this document**

- No production code  
- No routing, UI, database, workflow, navigation, or business-logic changes under this document alone  
- No cleanup, retirement, or migration execution until the authorised wave  

---

## 0. Authorisation & governance compliance

| Artefact | Requirement |
|----------|-------------|
| CAD-2026-001 | No invented business values; LoanFile adapters structure-only for Opportunity |
| ADR-018 | **Frozen** — do not reopen Start / Hub / Lead Information |
| ADR-019 | **Frozen architecture** — implement exactly as certified |
| Enterprise Architecture Baseline | Official reference for impacts |
| Pre-Launch Single Implementation Rule | One active Deal desk after Replace |
| Business Capability Ownership | One identity · route · workspace · data owner · implementation |
| Constitutional Health Check | **Every wave start** — proceed only if **GREEN** |
| Enterprise Health Check | **Every wave end** — certify only if **GREEN** |
| Per-wave freeze | See §7 Freeze Protocol |

### Product Architecture / Product Owner certification

| Field | Value |
|-------|--------|
| Roadmap | **Approved · Certified** |
| Governance controls (mandatory) | Business Milestones · CHC · EHC · Architecture Impact Report · Replacement Certification · Freeze Gates |
| Programme planning | **FROZEN** |
| Implementation | **Not authorised** — Wave 1 requires separate PO authorisation |

### Standard Catalyst One implementation lifecycle (until Go-Live)

This lifecycle is **mandatory** for all future implementation programmes until official production Go-Live:

```text
1. Architecture Approval
2. Sprint Approval
3. Constitutional Health Check (GREEN)
4. Implementation
5. Business Acceptance Testing (BAT)
6. Product Owner Certification
7. Replacement Certification (where applicable)
8. Enterprise Health Check (GREEN)
9. Freeze
```

---

## 0A. Business Milestones

Implementation waves are organised under **Business Milestones**. Milestones communicate business outcomes; waves are the engineering delivery units.

| Business Milestone | Outcome | Waves |
|--------------------|---------|-------|
| **Foundation** | Programme locked; governance gates and readiness confirmed | Wave 0 |
| **Deal Identity** | Canonical Deal Workspace route exists (`/deals/:dealId`) with Deal business chrome | Wave 1 |
| **Deal Entry** | Move to Deal lands only on Deal Workspace | Wave 2 |
| **Business Adoption** | My Deals, journey stages, and active deep links adopt Deal Workspace | Wave 3 |
| **Legacy Isolation** | `/loan-files` demoted to compatibility alias; primary identity is Deal Workspace | Wave 4 |
| **Legacy Elimination** | Replacement Certification + controlled retirement of dead journey participation | Waves 5–6 |

```text
Foundation → Deal Identity → Deal Entry → Business Adoption
  → Legacy Isolation → Legacy Elimination
```

---

## 0B. Constitutional Health Check (wave start — mandatory)

**Every implementation wave shall begin with a Constitutional Health Check**  
(see `.cursor/rules/constitutional-health-check.mdc` and `docs/governance/ARCHITECTURE-IMPACT-REPORT-TEMPLATE.md`).

| Result | Meaning | Action |
|--------|---------|--------|
| **GREEN** | No constitutional conflict; change within certified bounds | Implementation **may proceed** (after Architecture + Sprint Approval) |
| **AMBER** | Possible constitutional impact / uncertainty | **STOP** — produce Architecture Impact Report — wait for Product Owner |
| **RED** | Violates ADR / CAD / ownership / Single Implementation / certified behaviour | **STOP** — Architecture Impact Report — implementation **blocked** |

**Rule:** Implementation may only proceed if the Constitutional Health Check result is **GREEN**.  
If **AMBER** or **RED**, do not write production code for that wave until Product Owner approval of the Impact Report.

---

## 0C. Enterprise Health Check (wave end — mandatory)

**Every implementation wave shall conclude with an Enterprise Health Check**  
(template: `docs/governance/ENTERPRISE-HEALTH-CHECK-TEMPLATE.md`).

The Enterprise Health Check verifies the completed wave has **not** introduced unintended side effects into:

- Navigation · Routing  
- Business Processes  
- Opportunity Lifecycle · Deal Lifecycle  
- Business Calculations  
- Registries · Registers  
- Security  
- Enterprise Engines  
- APIs · Events · Reporting  
- Existing Certified Business Capabilities (especially ADR-018 Hub / Lead Information / Opportunity Workspace)

| Result | Action |
|--------|--------|
| **GREEN** | Eligible to proceed to Product Owner Certification / Freeze gates |
| **AMBER** / **RED** | **Do not certify** the wave — remediate or open Impact Report |

---

## 1. Programme Objective

Deliver the **Deal Workspace** as the sole first-class business capability for post–Move to Deal lender execution, with canonical route **`/deals/:dealId`**, Enterprise Deal Registry as SSOT, and Loan File demoted to an implementation/runtime artefact.

**Success (programme-level):**

1. Users and BAT open Deal execution only via Deal Workspace identity.  
2. Move to Deal, My Deals, and journey stages resolve to `/deals/:dealId`.  
3. `/loan-files` is not an alternate active Deal journey (redirect/alias only or retired).  
4. Replacement Certification accepted by Product Owner.  
5. ADR-018 Opportunity journey remains intact and frozen.

---

## 2. End-State Architecture

### 2.1 Business Capability Ownership (Deal)

| Pillar | End state |
|--------|-----------|
| Canonical business identity | Deal Workspace |
| Canonical route | `/deals/:dealId` |
| Primary workspace | Deal Workspace desk |
| Authoritative data owner | Enterprise Deal Registry |
| Active implementation | **One** — Deal Workspace |

### 2.2 Entity relationship (unchanged grain)

```text
Opportunity (Registry)
  → Move to Deal
  → Enterprise Deal (Registry SSOT)
  → Deal Workspace (/deals/:dealId)
  → Loan File (adapter / runtime only — not business identity)
```

### 2.3 Routing end state

| Surface | End state |
|---------|-----------|
| Deal open | `/deals/:dealId` (+ optional tab query) |
| My Deals row open | → `/deals/:dealId` |
| Move to Deal success | → `/deals/:dealId` |
| Canonical journey Lender Pipeline / Disbursed / Complete | → Deal Workspace via `dealId` |
| `/loan-files?file=` | Compatibility redirect → `/deals/:dealId` (or retired after cert) |
| `/loan-journey` | Unchanged (ADR-018 Hub) |
| `/lead-information` | Unchanged (ADR-018) |

### 2.4 Explicit non-goals of the programme

- Redesigning Lender Pipeline business rules  
- Changing Opportunity lifecycle (ADR-018)  
- Full deletion of LoanFile TypeScript types (may be Wave 6 backlog)  
- MFA / Break Glass (out of scope — baseline P3)  
- Reopening ADR-016 grain debates already settled by CO-ARCH-003 F0′  

---

## 3. Wave-by-Wave Implementation Plan

### Wave overview (with Business Milestones)

| Wave | Business Milestone | Name | Primary outcome |
|------|--------------------|------|-----------------|
| **0** | Foundation | Programme freeze | Programme accepted; Wave 1 gate defined |
| **1** | Deal Identity | Deal Workspace route skeleton | `/deals/:dealId` host exists; composes existing desk |
| **2** | Deal Entry | Move to Deal cutover | Success navigation → `/deals/:dealId` only |
| **3** | Business Adoption | Journey & navigation cutover | My Deals, stages, deep links → Deal Workspace |
| **4** | Legacy Isolation | Loan Files demotion | Primary identity removed; alias/redirect only |
| **5** | Legacy Elimination | Replacement Certification | PO accepts single active Deal Workspace |
| **6** | Legacy Elimination | Controlled retirement | Dead journey participation removed; adapter backlog |

**Companion (optional, same programme or FS-02-aligned):** Move to Deal Enterprise Confirmation Modal + business messaging + Lender Pipeline sync hardening — must not create a second Deal desk.

**Every wave (1–6):** start Constitutional Health Check (**GREEN** required) · end Enterprise Health Check (**GREEN** required for Freeze).

---

### Wave 0 — Programme Freeze (governance) · Milestone: Foundation

| Field | Content |
|-------|---------|
| **Business Milestone** | Foundation |
| **Objective** | Accept this Implementation Programme (with governance enhancements); lock wave order and gates |
| **Scope** | Docs/governance only |
| **Deliverables** | Accepted programme; Wave 1 prerequisites checklist; no code |
| **Dependencies** | ADR-019 certified; Baseline accepted |
| **Business capabilities affected** | None (planning) |
| **Modules / Registries / Registers** | None |
| **Security / Workflow / Routing impact** | None |
| **Constitutional Health Check** | N/A (no production code) — result N/A |
| **Enterprise Health Check** | N/A |
| **BAT success criteria** | N/A |
| **PO certification criteria** | Programme **APPROVED WITH GOVERNANCE ENHANCEMENTS** (this review) |
| **Replacement Certification** | N/A |

---

### Wave 1 — Deal Workspace Route Skeleton · Milestone: Deal Identity

| Field | Content |
|-------|---------|
| **Business Milestone** | Deal Identity |
| **Objective** | Introduce canonical route `/deals/:dealId` as Deal Workspace host without changing Move to Deal or retiring `/loan-files` yet |
| **Scope** | New route + page shell; load Deal by `dealId` from Enterprise Deal Registry; may **compose** existing `LoanWorkspaceModal` / desk internals behind Deal chrome; ROUTES + PROTECTED_ROUTES; no dual “primary” marketing of Loan Workspace |
| **Out of scope** | Move to Deal href change (Wave 2); nav primary cutover (Wave 3); `/loan-files` redirect (Wave 4) |
| **Deliverables** | `/deals/[dealId]` page; Deal context resolver; Deal identity header chrome (Deal number, Opportunity link); deep-linkable tabs (e.g. lenders); smoke docs; CHC + EHC records |
| **Dependencies** | Wave 0 / programme accepted; Deal Registry readable by id; **explicit Wave 1 Product Owner approval**; Sprint Approval |
| **Business capabilities affected** | Deal Workspace (new route); Loan Files (unchanged primary) |
| **Existing modules affected** | `loan-files` / `loan-workspace-modal` (composition only); `enterprise-deal` DAL; possibly `deal-workspace` components |
| **Registries affected** | Deal Registry (read); Opportunity Registry (parent link read-only) |
| **Registers affected** | Architecture Freeze / Change Register entries |
| **Security impact** | Auth gate on `/deals/*`; same role posture as Deal book; no new privilege model required in Wave 1 |
| **Workflow impact** | None for Move to Deal yet |
| **Routing impact** | **Additive** route only; `/loan-files` remains live primary |
| **Constitutional Health Check** | **Mandatory at start** — proceed only if **GREEN**. Confirm ADR-018 untouched; no Opportunity SSOT writes; LoanFile not presented as business SoR in chrome. AMBER/RED → Impact Report → stop |
| **Enterprise Health Check** | **Mandatory at end** — certify only if **GREEN**. Verify no side effects on nav, routing, Opp/Deal lifecycle, registries, security, engines, APIs, events, reporting, certified ADR-018 capabilities |
| **BAT success criteria** | Manual open `/deals/{knownDealId}` shows Deal Workspace with Deal identity; Lender Pipeline usable; parent Opportunity visible; ADR-018 Start path unchanged |
| **PO certification criteria** | Skeleton accepted; dual open paths still allowed **only** as interim (document in cert notes); EHC GREEN |
| **Replacement Certification criteria** | **Not yet** — Wave 1 is additive |
| **Freeze eligibility** | CHC GREEN · BAT complete · PO cert · EHC GREEN (Replacement N/A) |

**Legacy retirement (Wave 1):** None retired. **Repurpose:** modal internals as Deal Workspace body. **Compat:** `/loan-files` remains. **Debt reduction:** Establishes canonical URL for later cutover.

**Risks / mitigation / rollback (Wave 1):**

| Risk | Mitigation | Rollback |
|------|------------|----------|
| Broken Deal load by id | Feature-flag route; BAT with known deals | Disable route / remove from nav (not yet primary) |
| Accidental Opportunity field invent | CAD-2026-001 review; no ensure-loan-workspace for display | Revert shell |
| Users confused by two open paths | BAT script states Wave 1 interim dual-host | Communicate interim explicitly |

**Business impact:** Low — additive capability.

---

### Wave 2 — Move to Deal Cutover · Milestone: Deal Entry

| Field | Content |
|-------|---------|
| **Business Milestone** | Deal Entry |
| **Objective** | Move to Deal success navigates **only** to `/deals/:dealId` |
| **Scope** | `move-to-deal.ts` / `run-move-to-deal-transition` href builders; toast copy; optional Enterprise Confirmation Modal (companion); ensure `dealId` always available post-create |
| **Out of scope** | Full nav cutover; Loan Files redirect |
| **Deliverables** | Canonical `buildDealWorkspaceHref(dealId)`; Move to Deal uses it exclusively; BAT evidence; CHC + EHC records |
| **Dependencies** | Wave 1 Frozen; Deal create returns stable `dealId` |
| **Business capabilities affected** | Move to Deal; Deal Workspace; LIFE |
| **Modules affected** | `strategic-lender-pipeline`, Opportunity Workspace LIFE board, deal API client |
| **Registries affected** | Deal Registry (create/read); Opportunity (conversion mark — existing) |
| **Registers affected** | Change Register |
| **Security impact** | Session errors still route to login (existing); no privilege expansion |
| **Workflow impact** | Post–Move to Deal landing changes; Lender Pipeline entry via Deal Workspace |
| **Routing impact** | Primary success path leaves `/loan-files?file=` |
| **Constitutional Health Check** | **Start — GREEN only.** Single Implementation for Move to Deal landing; no second success href; ADR-018 untouched. AMBER/RED → stop + Impact Report |
| **Enterprise Health Check** | **End — GREEN required.** No regressions to Opp lifecycle, Hub, Lead Information, registries, security, engines, APIs, reporting |
| **BAT success criteria** | LIFE → Move to Deal → lands `/deals/:dealId`; Deal number visible; lenders in pipeline; no Loan Workspace as primary chrome |
| **PO certification criteria** | Move to Deal landing certified; EHC GREEN |
| **Replacement Certification** | Partial — landing path replaced; full desk Replace still open |
| **Freeze eligibility** | CHC GREEN · BAT · PO cert · Replacement (partial ok) · EHC GREEN |

**Legacy retirement (Wave 2):** Retire Move to Deal success builders targeting `/loan-files?file=` as **primary**. Keep temporary debug/deep-link only if documented as compat.

**Risks / mitigation / rollback:**

| Risk | Mitigation | Rollback |
|------|------------|----------|
| Missing dealId after create | Harden create + assert before navigate | Fallback href gated + alert — prefer fail closed |
| Pipeline empty on new route | Reuse FS-01 hydrate lessons; DAL cache sync | Fix hydrate; temporary compat open `/loan-files` only with PO approval |
| Confirm UX still `window.confirm` | Optional companion modal wave | Keep confirm; do not block identity |

---

### Wave 3 — Journey & Navigation Cutover · Milestone: Business Adoption

| Field | Content |
|-------|---------|
| **Business Milestone** | Business Adoption |
| **Objective** | All **active** journey and navigation entry points for Deal execution open Deal Workspace |
| **Scope** | Canonical Journey Header `lender_pipeline` / disbursed / complete hrefs; My Deals row open; deep links; entity-link helpers; command palette / dashboard Deal actions; chrome labels “Deal Workspace” |
| **Out of scope** | Physical deletion of Loan Files book (Wave 4–6) |
| **Deliverables** | Updated href builders; My Deals → `/deals/:dealId`; journey stages; BAT matrix of entry points; CHC + EHC records |
| **Dependencies** | Wave 2 Frozen |
| **Business capabilities affected** | My Deals; Deal Workspace; Lender Pipeline; Dashboard Deal actions; Radar Deal opens (if any) |
| **Modules affected** | `canonical-journey-header`, `my-deals`, `navigation`, `entity-link`, dashboard panels, possibly Radar |
| **Registries affected** | Deal Registry (read); no Opportunity write |
| **Registers affected** | Change Register; Architecture Freeze notes |
| **Security impact** | Same auth; ensure `/deals` in protected routes |
| **Workflow impact** | Continue/Back preserve Opportunity + Deal context |
| **Routing impact** | Active journey no longer prefers `/loan-files?file=` |
| **Constitutional Health Check** | **Start — GREEN only.** Business Capability Ownership for Deal; Single Implementation for active entry points; ADR-018 Hub/Lead Information unchanged |
| **Enterprise Health Check** | **End — GREEN required.** Full side-effect matrix; especially Opportunity journey and certified capabilities |
| **BAT success criteria** | From My Deals, journey stages, and deep links → Deal Workspace only; Opportunity path still Hub → Lead Info → OW |
| **PO certification criteria** | Navigation/journey cutover accepted; EHC GREEN |
| **Replacement Certification** | Entry points replaced; Loan Files may still exist as book |
| **Freeze eligibility** | CHC GREEN · BAT · PO cert · Replacement (partial ok) · EHC GREEN |

**Legacy retirement (Wave 3):** Retire “Open Loan Workspace” CTAs for Deal cases. **Repurpose:** labels to Deal Workspace. **Compat:** bookmarks to `/loan-files?file=` still work until Wave 4.

**Risks / mitigation / rollback:**

| Risk | Mitigation | Rollback |
|------|------------|----------|
| Missed deep link | Entry-point inventory from Baseline §9/§13 | Patch list; freeze Wave 3 until BAT green |
| Context loss (opportunityId) | Preserve query/context helpers | Restore prior builder behind flag |

---

### Wave 4 — Loan Files Demotion · Milestone: Legacy Isolation

| Field | Content |
|-------|---------|
| **Business Milestone** | Legacy Isolation |
| **Objective** | Demote `/loan-files` from primary Deal identity to **compatibility alias** (redirect to `/deals/:dealId`) or fold browse into My Deals |
| **Scope** | Redirect `?file=` → resolve Deal id → `/deals/:dealId`; browse/Kanban: either redirect to My Deals or rebrand under Deal book with no Loan Workspace identity; Create Loan Modal: remove from Deal journey or re-home under certified Deal create only |
| **Out of scope** | Deleting LoanFile types; Phase C storage purge (Wave 6 backlog) |
| **Deliverables** | Redirect strategy live; docs; BAT on old bookmarks; CHC + EHC; Replacement Certification draft |
| **Dependencies** | Wave 3 Frozen; dealId resolution from legacy file id reliable |
| **Business capabilities affected** | Loan Files (demoted); Deal Workspace (sole primary); My Deals |
| **Modules affected** | `loan-files-workspace`, create-loan-modal, routes, middleware |
| **Registries affected** | Deal Registry (id resolution); legacy LoanFile cache read |
| **Registers affected** | Change Register; Replacement Certification draft begins |
| **Security impact** | Redirect must not leak deals across orgs; auth on both sides |
| **Workflow impact** | No alternate Deal journey remains in active UX |
| **Routing impact** | `/loan-files` → compat only |
| **Constitutional Health Check** | **Start — GREEN only.** Single Implementation Rule for Deal desk; no dual active journeys |
| **Enterprise Health Check** | **End — GREEN required.** Confirm Hub redirect still correct; Opportunity path intact; no calc/registry regressions |
| **BAT success criteria** | Old `/loan-files?file=` bookmarks land in Deal Workspace; no Loan Workspace chrome as primary; Start Journey still Hub |
| **PO certification criteria** | Demotion accepted; EHC GREEN |
| **Replacement Certification** | Draft completed for Wave 5 sign-off |
| **Freeze eligibility** | CHC GREEN · BAT · PO cert · Replacement draft · EHC GREEN |

**Legacy retirement (Wave 4):** `/loan-files` as primary Deal open **RETIRE** from journey. CreateLoanModal as Deal alternate **RETIRE** or **MERGE**. Browse book **MERGE** into My Deals or **COMPATIBILITY ONLY**.

**Risks / mitigation / rollback:**

| Risk | Mitigation | Rollback |
|------|------------|----------|
| file→dealId resolution failure | Mapping table / legacyLoanFileId; BAT edge cases | Temporary pass-through with PO approval |
| Break Hub redirect logic | Keep Hub redirect separate from Deal demotion | Preserve Wave 3 Hub behaviour |

---

### Wave 5 — Replacement Certification · Milestone: Legacy Elimination

| Field | Content |
|-------|---------|
| **Business Milestone** | Legacy Elimination |
| **Objective** | Product Owner accepts that only **one** active Deal Workspace implementation remains |
| **Scope** | Complete `docs/governance/REPLACEMENT-CERTIFICATION-TEMPLATE.md`; evidence from Waves 1–4; no new features |
| **Deliverables** | Signed Replacement Certification; programme status CERTIFIED for Replace; CHC + EHC (attestation) |
| **Dependencies** | Waves 1–4 Frozen |
| **Business capabilities affected** | Deal Workspace (certified sole) |
| **Modules / Registries** | Documentation of retired surfaces |
| **Security / Workflow / Routing** | Attestation only |
| **Constitutional Health Check** | **Start — GREEN only.** Confirm no silent dual path remains before cert ceremony |
| **Enterprise Health Check** | **End — GREEN required.** Full regression pack vs certified capabilities |
| **BAT success criteria** | Regression pack: Start Journey (ADR-018) + Move to Deal + My Deals + bookmark redirect |
| **PO certification criteria** | Replacement Certification **Accepted**; EHC GREEN |
| **Replacement Certification criteria** | **Complete** — this wave’s purpose |
| **Freeze eligibility** | CHC GREEN · BAT · PO cert · **Replacement Complete** · EHC GREEN |

**Legacy retirement (Wave 5):** Formal attestation of retired routes/nav/workflow. No code required unless gaps found (then reopen Wave 3/4).

**Risks:** Certification blocked by residual dual path → fix before sign-off. **Rollback:** N/A (governance). **Business impact:** Enables Wave 6 cleanup authorisation.

---

### Wave 6 — Controlled Retirement · Milestone: Legacy Elimination

| Field | Content |
|-------|---------|
| **Business Milestone** | Legacy Elimination |
| **Objective** | Remove dead Loan Workspace **journey participation**; quarantine unused hosts; optional adapter cleanup backlog |
| **Scope** | Delete/quarantine unused Hub-on-loan-files code paths; remove dead CTAs; document LoanFile DTO as adapter-only; optional FS-02 UX/sync companions if not done earlier |
| **Out of scope** | Mandatory full LoanFile type deletion (may be separate Phase C programme) |
| **Deliverables** | Retirement report; reduced TD-01/TD-02 surface; backlog for Phase C storage; CHC + EHC |
| **Dependencies** | Wave 5 Replacement Certification Accepted + Frozen |
| **Business capabilities affected** | None new; debt reduction |
| **Modules affected** | Dead loan-files journey code; docs |
| **Registries** | Unchanged authority |
| **Security** | Reduce attack surface of unused routes if any |
| **Workflow / Routing** | Compat redirects retained as decided in Wave 4/5 cert |
| **Constitutional Health Check** | **Start — GREEN only.** No behaviour change to certified Deal Workspace beyond approved retirement |
| **Enterprise Health Check** | **End — GREEN required.** Full regression; Deal Workspace + ADR-018 intact |
| **BAT success criteria** | Full regression green; no resurrected Loan Workspace primary |
| **PO certification criteria** | Retirement wave accepted; programme may Freeze; EHC GREEN |
| **Replacement Certification** | Already done; amend if further retirements |
| **Freeze eligibility** | CHC GREEN · BAT · PO cert · Replacement (amend if needed) · EHC GREEN |

**Risks:** Over-deletion breaking compat redirects → retain redirect layer until Phase C. **Rollback:** Restore redirect module from git. **Business impact:** Lower BAT investigation cost.

---

## 4. Legacy Retirement Plan (programme roll-up)

| Item | Wave | Classification |
|------|------|----------------|
| Move to Deal → `/loan-files?file=` primary | 2 | **RETIRE** |
| My Deals → OW `/credit-bench` | 3 | **RETIRE** / retarget Deal Workspace |
| “Open Loan Workspace” Deal CTAs | 3 | **RETIRE** / **REPURPOSE** to Deal Workspace |
| `/loan-files` primary Deal identity | 4 | **COMPATIBILITY ONLY** then attest **RETIRE** as primary |
| CreateLoanModal alternate Deal create | 4 | **RETIRE** or **MERGE** under Deal create |
| Loan Workspace chrome as Deal business name | 1–3 | **REPURPOSE** to Deal Workspace |
| LoanFile DTO / localStorage | 6 / Phase C | **COMPATIBILITY ONLY** → later **RETIRE** SoR |
| Hub-on-loan-files remnants | 6 | **RETIRE** |

**Expected technical debt reduction:** Baseline TD-01 (Critical), TD-03 (High), portions of TD-02/TD-10; BAT identity clarity; Single Implementation compliance for Deal desk.

---

## 5. Enterprise Risk Assessment (programme-level)

| Risk | Waves | Mitigation | Rollback | Business impact |
|------|-------|------------|----------|-----------------|
| Dual path persists past Wave 4 | 4–5 | Hard BAT entry-point matrix; Replacement Cert blocked if dual | Hold Freeze | High — defeats ADR-019 |
| Deal hydrate / empty pipeline | 2 | Reuse FS-01 sync lessons; DAL cache | Compat open with PO | High — execution blocked |
| ADR-018 regression | All | Explicit Health Check + BAT Start Journey every wave | Revert wave | Critical — Opportunity journey |
| CAD-2026-001 invent via adapters | 1–2 | Code review; no OW display from Deal seeds | Revert mapping | High — data trust |
| Bookmark / deep-link breakage | 4 | Redirect layer; communicate | Keep redirect longer | Medium |
| Scope creep (Lender Pipeline redesign) | All | Wave scopes frozen; Health Check stop | Reject out-of-scope | Medium |
| FS-02 fork vs this programme | 0–2 | Align companions under this programme | Single backlog owner | Medium |

---

## 6. Implementation Readiness — Prerequisites before Wave 1

Wave 1 **shall not commence** until all of the following are true:

### 6.1 Governance

- [ ] This **ADR-019 Implementation Programme** is **APPROVED · Roadmap CERTIFIED · FROZEN**  
- [ ] Wave 1 receives **separate Product Owner authorisation** + Architecture Approval + Sprint Approval  
- [ ] Constitutional Health Check for Wave 1 recorded with result **GREEN**  
- [ ] ADR-018 remains frozen (confirmed)  
- [ ] ADR-019 architecture remains frozen (confirmed)  
- [ ] Enterprise Health Check template available for wave close  

### 6.2 Technical prerequisites

- [ ] Enterprise Deal Registry can load a Deal by **`dealId`** in the target environment  
- [ ] Known BAT Deal fixtures / numbers available  
- [ ] Mapping strategy documented: legacy `file` id → `dealId` (for later waves; design note in Wave 1)  
- [ ] Auth / protected-route plan for `/deals/*` documented  
- [ ] No conflicting open implementation on Deal desk without this programme  

### 6.3 Coordination

- [ ] FS-02 companion items either **in-scope** as named companions or **explicitly deferred** (no silent fork)  
- [ ] BAT script outline for Waves 1–2 prepared  
- [ ] Replacement Certification owner identified  
- [ ] Business Milestone **Deal Identity** acknowledged as Wave 1 outcome  

### 6.4 Explicitly not required before Wave 1

- LoanFile Phase C deletion  
- MFA / Break Glass  
- Credit Bench rename  
- Engine Prisma cutover  

---

## 7. Per-wave freeze protocol (mandatory)

For **each** implementation wave (Waves 1–6), and for **all future Catalyst One implementation programmes until Go-Live**:

```text
1. Architecture Approval
2. Sprint Approval
3. Constitutional Health Check (GREEN)
      · GREEN → proceed
      · AMBER / RED → STOP → Architecture Impact Report → wait for PO
4. Implementation (only after CHC = GREEN)
5. Business Acceptance Testing (BAT) Complete
6. Product Owner Certification Complete
7. Replacement Certification Complete (where applicable; mandatory Wave 5)
8. Enterprise Health Check (GREEN)
      · GREEN → eligible to Freeze
      · AMBER / RED → do NOT certify / do NOT Freeze → remediate
9. Freeze
```

### Freeze gate checklist (all required)

A wave shall **not** be marked **Frozen** until:

- [ ] Constitutional Health Check = **GREEN**  
- [ ] BAT Complete  
- [ ] Product Owner Certification Complete  
- [ ] Replacement Certification Complete (**where applicable**)  
- [ ] Enterprise Health Check = **GREEN**  

No subsequent wave starts until the prior wave is **Frozen** (or Product Owner grants a documented exception).

**Wave 1 special note:** Treat as an independent implementation authorisation. Requires its own Architecture Approval · Sprint Approval · CHC GREEN before any production code — even though this programme is Approved/Frozen.

---

## 8. Deliverable attestation

| Statement | |
|-----------|--|
| Planning phase complete | **Yes** |
| Implementation Programme | **APPROVED · Roadmap CERTIFIED · FROZEN** |
| Production code modified under this certification | **No** |
| Wave 1 implementation authorised | **No** — requires separate Product Owner authorisation |

---

## 9. Next step

1. Implementation Programme planning is **complete and frozen**.  
2. Await **separate Product Owner authorisation** for Wave 1 (Deal Identity).  
3. Do **not** write production code until Wave 1 Architecture Approval · Sprint Approval · CHC = GREEN.  

---

## 10. Document control

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-07-25 | Initial Implementation Programme for review |
| 0.2 | 2026-07-25 | Governance enhancements (Milestones, CHC, EHC, Freeze gates) |
| 1.0 | 2026-07-25 | Product Owner **APPROVED** · Roadmap **CERTIFIED** · Programme **FROZEN** · Implementation not authorised · Standard lifecycle until Go-Live |

---

## Appendix A — Traceability

| Requirement | Section |
|-------------|---------|
| Programme objective | §1 |
| End-state architecture | §2 |
| Business Milestones | §0A |
| Constitutional Health Check protocol | §0B |
| Enterprise Health Check protocol | §0C |
| Wave plans | §3 |
| Legacy retirement | §3 per wave + §4 |
| Risk / rollback | §3 per wave + §5 |
| Readiness | §6 |
| Freeze gates | §7 |

## Appendix B — Templates

| Template | Path |
|----------|------|
| Architecture Impact Report | `docs/governance/ARCHITECTURE-IMPACT-REPORT-TEMPLATE.md` |
| Enterprise Health Check | `docs/governance/ENTERPRISE-HEALTH-CHECK-TEMPLATE.md` |
| Replacement Certification | `docs/governance/REPLACEMENT-CERTIFICATION-TEMPLATE.md` |

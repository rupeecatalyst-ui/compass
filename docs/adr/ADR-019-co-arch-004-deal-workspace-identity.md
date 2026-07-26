# ADR-019 / CO-ARCH-004 — Deal Workspace Identity

**Status:** **APPROVED** · **Architecture CERTIFIED** · **Architecture FROZEN**  
**Implementation:** **NOT YET AUTHORISED** by this ADR alone.  
**Implementation Programme:** [`CO-ARCH-ADR-019-IMPLEMENTATION-PROGRAMME.md`](../co-arch-003/CO-ARCH-ADR-019-IMPLEMENTATION-PROGRAMME.md) — **APPROVED · Roadmap CERTIFIED · FROZEN** · Wave 1 **not** authorised until separate Product Owner authorisation.
**Date:** 2026-07-25  
**Programme:** **CO-ARCH-004 — Deal Workspace Identity**  
**ADR ID:** ADR-019  
**Directive class:** Product Architecture Decision  
**Classification:** ARCH / DOMAIN IDENTITY / PRE-LAUNCH REPLACE  

**Foundation (approved):**  
[`CO-ARCH-DEAL-WORKSPACE-IDENTITY-ASSESSMENT.md`](../co-arch-003/CO-ARCH-DEAL-WORKSPACE-IDENTITY-ASSESSMENT.md) — **Approved**

**Related (do not reopen):**  
- ADR-018 — Start Loan Journey / Hub / Lead Information (**FROZEN**)  
- Pre-Launch Single Implementation Rule — `.cursor/rules/pre-launch-single-implementation.mdc`  
- Business Capability Ownership — §3A of this ADR · `.cursor/rules/business-capability-ownership.mdc`  
- ADR-016 / CO-ARCH-002 / CO-ARCH-003 — Deal Registry & Opportunity–Deal grain (historical + F0′)  
- CAD-2026-001 / ADR-017 — Business data provenance  

**Programme ID disambiguation:**  
Within CO-ARCH-001, a historical document is also labelled `CO-ARCH-004-ENTERPRISE-LENDER-REGISTRY-MASTER`. That artefact belongs to the **Lender Registry Master** programme.  
**This ADR’s programme “CO-ARCH-004 — Deal Workspace Identity” is a separate Product Architecture programme.** Operational references should prefer **ADR-019** or **CO-ARCH-004-DWI** when speaking across programmes to avoid collision.

---

## 1. Status of authorisation

| Item | Decision |
|------|----------|
| Architecture Assessment | **Approved** |
| Pre-Launch Single Implementation Rule | **Default policy until official production Go-Live** |
| ADR-018 | **Completely frozen** — no reopen, modify, or extend |
| This ADR (architecture) | **APPROVED · CERTIFIED · FROZEN** |
| Implementation under this certification | **NOT authorised** |
| Implementation programme | Requires **separate** roadmap + Wave 1 plan review and Product Owner approval |

### Product Owner certification record

| Field | Value |
|-------|--------|
| Decision | **APPROVED** |
| Architecture | **CERTIFIED** |
| Implementation | **NOT YET AUTHORISED** |
| Date | 2026-07-25 |

---

## 2. Context

ADR-018 established first-class identity for:

| Capability | Canonical identity | Canonical route |
|------------|-------------------|-----------------|
| Execution Hub | Loan Journey | `/loan-journey` |
| Requirement capture | Lead Information | `/lead-information` |
| Opportunity execution | Opportunity Workspace | Opportunity stage routes |

BAT then observed that **Move to Deal** opens:

`/loan-files?file=…` → **Loan Workspace** chrome  

while product language calls the destination **Deal Workspace**.

That co-location was **correct under ADR-018 Wave 3** (Deal host preserved on `/loan-files`). It is **not** an ADR-018 defect.

It is the next identity evolution: the **Deal domain** must become a first-class business capability with its own canonical identity — under the Pre-Launch Single Implementation Rule.

---

## 3. Decision

### 3.1 Primary decision

The **Deal Workspace** shall be the sole user-facing business identity for post–Move to Deal lender execution.

**Canonical long-term route:**

```text
/deals/:dealId
```

This route is the **canonical business identity** of Deal Workspace.

### 3.2 Loan Files posture

`/loan-files` and the historical **Loan Workspace / Loan Files** identity shall **gradually** become:

- an **implementation detail**, and/or  
- a **compatibility alias during migration only**  

— **not** the primary business identity of Deal execution.

**Loan File is no longer considered the business workspace.**  
Loan File is an **implementation artefact** used by Deal Workspace where required.

After Replace certification, Loan Files must **not** remain an alternate active Deal journey (nav, routing, user journey, workflow, or business logic).

### 3.3 Approved architectural principles (Product Owner)

1. The Deal domain is a **first-class business capability**. It is **not** an extension of Opportunity. It is **not** synonymous with Loan File.  
2. Canonical business identity of the Deal domain: **`/deals/:dealId`**.  
3. Loan File is an implementation/runtime artefact — not the business workspace.  
4. ADR-018 separation is preserved:

```text
Opportunity
  → Move to Deal
  → Deal Workspace
  → Loan File (implementation / runtime)
```

5. The Single Implementation Rule remains the governing engineering policy until official Catalyst One production Go-Live.

### 3.4 Non-decisions (explicit)

This Product Owner certification does **not** authorise:

- Code, routing, UI, database, navigation, workflow, or business-logic changes  
- Redirects or migrations  
- Any change to ADR-018  

Implementation requires a **separate implementation programme** (roadmap + Wave 1 plan) reviewed and approved by the Product Owner.

---

## 3A. Business Capability Ownership

**Governance amendment (Product Owner · 2026-07-25).**  
This principle is part of this ADR’s frozen architecture and of **future Product Architecture Reviews**.

Every major business capability within Catalyst One shall have:

| Pillar | Requirement |
|--------|-------------|
| **Canonical business identity** | One named capability (e.g. Deal Workspace, Lead Information) |
| **Canonical route** | One primary URL identity (e.g. `/deals/:dealId`) |
| **Primary workspace** | One user-facing desk for that capability |
| **Authoritative data owner** | One SSOT / registry / domain owner |
| **Active implementation** | Exactly **one** until official production Go-Live (Pre-Launch Single Implementation Rule) |

### Application to Deal Workspace (this ADR)

| Pillar | Deal Workspace |
|--------|----------------|
| Canonical business identity | Deal Workspace (Deal domain) |
| Canonical route | `/deals/:dealId` |
| Primary workspace | Deal Workspace |
| Authoritative data owner | Enterprise Deal Registry |
| Active implementation (target after Replace) | Deal Workspace only — Loan File is not a second capability |

Agent enforcement: `.cursor/rules/business-capability-ownership.mdc`

---

## 4. Business boundaries of the Deal domain

### 4.1 In scope (Deal domain)

| Boundary | Description |
|----------|-------------|
| Enterprise Deal entity | Registry identity: `dealId`, `dealNumber`, lender/counterparty, Opportunity parent link |
| Deal Workspace | User-facing desk for executing one Deal |
| My Deals | Work queue of Deals (not Opportunity queue) |
| Move to Deal | Transition that **creates** Deal authority from Opportunity Execution Queue |
| Lender Pipeline (Deal-scoped) | Lender case stages for the Deal |
| Deal-scoped tasks, timeline, communications | Operational work attached to the Deal |
| Deal documents tab | **Consumer** of Document Center — not a second repository |

### 4.2 Out of scope (not Deal domain)

| Boundary | Owner |
|----------|--------|
| Draft / Requirement Captured Opportunity | Opportunity Registry + Lead Information |
| Opportunity enrichment / Documents / Credit / LIFE (pre–Move to Deal) | Opportunity Workspace stages |
| Execution Hub orchestration | `/loan-journey` |
| Contact master | ECM / Contacts |
| Fabricating Opportunity business fields from Deal adapters | Forbidden (CAD-2026-001) |

### 4.3 Creation rule

- **No Deal** before **Move to Deal** (or an explicitly certified Deal-create policy).  
- **No LoanFile business authority** before Move to Deal.  
- Opportunity remains SSOT for requirement until conversion/transition rules say otherwise.

---

## 5. Canonical responsibilities of Deal Workspace

Deal Workspace **shall**:

1. Present **Deal identity** (Deal number, parent Opportunity, Contact, lender/program).  
2. Host **Lender Pipeline** execution for that Deal.  
3. Surface Deal-scoped documents via Document Center consumption.  
4. Host Deal-scoped tasks, timeline, and relationship-aware communication.  
5. Persist execution state through **Enterprise Deal** authority (DAL / Registry).  
6. Preserve Opportunity linkage for journey continuity (Continue / Back / context).  

Deal Workspace **shall not**:

1. Capture initial Product + Required Amount (Lead Information).  
2. Act as Execution Hub.  
3. Re-implement Opportunity Registry as SSOT.  
4. Present itself primarily as “Loan Files” or “Loan Workspace” after Replace certification.  
5. Mint Opportunity business defaults for display (CAD-2026-001).

---

## 6. Relationship: Opportunity · Deal · Loan File

```text
Contact
  → Draft Opportunity → Lead Information → Requirement Captured
  → Opportunity Workspace → … → LIFE
  → Move to Deal
  → Enterprise Deal  (business SSOT for lender execution)
  → Deal Workspace   (/deals/:dealId — canonical UI identity)
```

| Concept | Role | Authority |
|---------|------|-----------|
| **Opportunity** | Customer requirement & pre-lender planning | Opportunity Registry |
| **Deal** | Lender execution transactional unit (per certified grain) | Enterprise Deal Registry |
| **Loan File** | Historical runtime / UI shape / compatibility carrier | **Not** business SSOT; implementation detail or migration alias |

### 6.1 Loan File after this ADR

| Phase | Loan File role |
|-------|----------------|
| Today (pre-implementation) | Attachment + UI shape behind `/loan-files?file=` acting as Deal Workspace |
| During migration | May remain internal DTO / cache / alias target |
| After Replacement Certification | Must not be the **primary business identity** or alternate Deal journey |

Enterprise Deal identity (`dealId`) is the **canonical business key** for Deal Workspace URLs and user language.

---

## 7. Canonical routing strategy

### 7.1 Target (canonical)

| Surface | Canonical route | Notes |
|---------|-----------------|-------|
| Deal Workspace | **`/deals/:dealId`** | Sole primary Deal execution identity |
| My Deals | `/my-deals` | Queue → opens `/deals/:dealId` |
| Move to Deal success | Navigate to **`/deals/:dealId`** | Not `/loan-files?file=` as primary |
| Lender Pipeline stage (journey) | Resolves to Deal Workspace | Via `dealId`, not `file` as primary |

### 7.2 Compatibility (migration only)

| Legacy | Allowed during migration | After Replace certification |
|--------|--------------------------|-----------------------------|
| `/loan-files?file=…` | Temporary alias / redirect **to** `/deals/:dealId` | Retired from active journey (redirect-only or removed) |
| `/loan-files` browse book | Temporary Deal book host or folded into My Deals | Retired as primary Deal identity |
| Query `file=` | Internal resolution only | Not user-facing primary key |

### 7.3 ADR-018 interaction

ADR-018 Wave 3 lock (“preserve `/loan-files` for Deal”) remains historically correct for that wave.  
**This ADR supersedes that host as long-term primary identity** for future Deal Workspace implementation waves — **without modifying ADR-018 text**. ADR-018 stays frozen; this ADR is the successor identity decision for the Deal desk.

---

## 8. Interaction between Deal Workspace and Loan File

| Concern | Rule |
|---------|------|
| User language | Prefer **Deal** / **Deal Workspace** |
| URL identity | Prefer **`dealId`** |
| Persistence | Enterprise Deal Registry is transactional authority |
| LoanFile mapping | Allowed as adapter (`mapEnterpriseDealToLoanFileStub`, DAL cache) until a later runtime purge |
| Dual open paths | Forbidden as **two active journeys** after Replace (Single Implementation Rule) |
| Create Loan Modal on Loan Files | Must not remain an alternate Deal-create journey after Replace unless re-certified as Deal create under Deal identity |

---

## 9. Migration philosophy

Aligned with Pre-Launch Single Implementation Rule:

1. **Replace**, do not dual-run.  
2. Canonical path becomes the **only** active path in navigation, routing, journey, workflow, and business logic.  
3. Legacy Loan Workspace / Loan Files identity is retired from those surfaces.  
4. Compatibility aliases are temporary and must appear in Replacement Certification as retired or redirect-only.  
5. Optimise for BAT clarity over long-lived dual identity.  
6. Controlled code retirement follows certification — not silent dual-path retention.

---

## 10. Future implementation roadmap

*Planning only — no wave may start without Product Owner approval of this ADR and of that wave.*

| Wave | Name | Intent | Implementation authorised by ADR alone? |
|------|------|--------|----------------------------------------|
| **0** | Assessment + ADR | Assessment approved; this ADR in review | N/A (docs) |
| **1** | Route skeleton | Introduce `/deals/:dealId` host; shell may compose existing desk | No — needs wave approval |
| **2** | Move to Deal cutover | Success navigation → `/deals/:dealId` only | No |
| **3** | Journey & navigation | Canonical stages, My Deals, deep links → Deal Workspace | No |
| **4** | Loan Files demotion | `/loan-files` → alias/redirect or book retirement | No |
| **5** | Replacement Certification | Product Owner accepts single active Deal Workspace | Required gate |
| **6** | Controlled retirement | Remove dead Loan Workspace journey participation; adapter cleanup backlog | After Wave 5 |

**Companion (may align under same programme or FS-02):** Enterprise Move to Deal confirmation UX, messaging, Lender Pipeline sync hardening — must not reintroduce a second Deal desk identity.

---

## 11. Legacy Retirement Impact

*Mandatory under Pre-Launch Single Implementation Rule. Required in future Product Architecture Assessments and ADRs.*

### 11.1 Replacement summary

| Field | Value |
|-------|--------|
| **Business capability being replaced** | Post–Move to Deal **lender execution desk** (Deal Workspace) |
| **Current canonical implementation** | `/loan-files?file=…` + `LoanWorkspaceModal` (Loan Workspace / Loan Files identity), often with `dealId` query appended |
| **Proposed canonical implementation** | **Deal Workspace** at **`/deals/:dealId`**, Enterprise Deal as business SSOT, My Deals as queue |
| **Confirmation (post-implementation)** | After Replace certification, **only ONE** active implementation of the Deal execution desk capability shall remain |

### 11.2 Legacy routes to be retired

| Legacy route / pattern | Disposition after Replace |
|------------------------|---------------------------|
| `/loan-files?file=` as **primary** Deal open | Retired as primary; redirect-only or removed from journey |
| `/loan-files?entry=dashboard` as Hub | Already non-Hub (ADR-018); ensure no Deal-desk dual meaning remains |
| `/loan-files` browse as **primary** “Loan Files” Deal identity | Retire or fold into My Deals / Deal book under Deal naming |
| Any deep link that opens Loan Workspace **as an alternate** to `/deals/:dealId` | Must not remain active alternate |

### 11.3 Legacy navigation to be retired

| Navigation entry / label | Disposition |
|--------------------------|-------------|
| Primary nav framing Deal execution as **Loan Workspace** / **Loan Files** | Retarget or rename to **Deal Workspace** / **My Deals** only |
| Secondary links “Open Loan Workspace” for Deal cases | Retire; use “Open Deal Workspace” → `/deals/:dealId` |
| Journey CTAs that advertise Loan Files as Deal destination | Update to Deal Workspace |

### 11.4 Legacy components / services to be retired (from *active capability* participation)

| Component / service | Retirement posture |
|---------------------|--------------------|
| User-facing **Loan Workspace** identity for Deal execution | Retire from nav/journey/workflow language |
| **Loan Files** as primary business identity of Deal desk | Demote to alias / implementation detail |
| Parallel Move to Deal success href builders targeting `/loan-files?file=` as primary | Replace with `/deals/:dealId` builders |
| Create-loan / LoanFile mint paths that act as alternate Deal create | Retire or re-home under certified Deal create only |
| Docs/toasts that say “Deal Workspace” while routing to Loan Files as if distinct | Unify under Deal Workspace |

**May remain as adapters (not second capability):** Deal DAL, `LoanFile` DTO mapping, local cache sync — until a later runtime purge programme.

### 11.5 Expected Replacement Certification deliverables

Using `docs/governance/REPLACEMENT-CERTIFICATION-TEMPLATE.md`, the implementation programme must certify:

1. Canonical implementation = Deal Workspace `@ /deals/:dealId`  
2. Legacy Loan Workspace / Loan Files Deal-desk journey **retired**  
3. Routes removed or redirected (table completed)  
4. Navigation entries removed or retargeted (table completed)  
5. Workflow / Move to Deal / journey references updated  
6. Attestation: **only one** active Deal execution desk remains  
7. Product Owner acceptance recorded  

**No Deal Workspace Identity implementation wave is complete without this certification.**

### 11.6 Single-implementation attestation (target state)

After certified implementation of this ADR’s Replace waves:

> There shall be exactly one active user-facing implementation of the post–Move to Deal lender execution desk: **Deal Workspace** at **`/deals/:dealId`**. Loan Files / Loan Workspace shall not participate as an alternate active implementation of that capability.

---

## 12. Consequences

### Positive

- BAT and operators can name Deal Workspace without Loan Files ambiguity.  
- Parity with ADR-018 identity pattern (Hub, Lead Information, Opportunity).  
- Aligns with Pre-Launch Single Implementation Rule.  
- Matches CO-ARCH-003 blueprint direction (`/deals/:dealId`).

### Risks / costs

- Migration of deep links and bookmarks.  
- Temporary alias/redirect period.  
- LoanFile adapter cleanup remains follow-on work.  
- Programme ID collision risk with historical CO-ARCH-001 “CO-ARCH-004” lender doc — mitigate via ADR-019 / CO-ARCH-004-DWI naming in ops.

### What remains frozen

- ADR-018 in full.  
- **This ADR’s architecture** (APPROVED · CERTIFIED · FROZEN).  
- Implementation remains **not authorised** until a separate implementation programme (roadmap + Wave 1) is Product Owner–approved.

---

## 13. Compliance with Pre-Launch Single Implementation Rule

This ADR is a **Replace** decision for the Deal execution desk capability.

When implementation is later approved via a separate programme:

- Replacement becomes the **only** active implementation.  
- Superseded Loan Workspace / Loan Files Deal journey must stop participating in navigation, routing, user journey, workflow, and business logic.  
- Replacement Certification is mandatory before programme completion.

---

## 14. Review & certification gate

| Gate | Owner | Status |
|------|-------|--------|
| Product Architecture Review of this ADR | Product Architecture | **Complete** |
| Product Owner architecture certification | Product Owner | **Complete (2026-07-25)** — Architecture APPROVED · CERTIFIED · FROZEN |
| Separate implementation programme (roadmap + Wave 1 plan) | Product Owner / Architecture | **Required before any code** |
| Per-wave: Architecture approval · Sprint approval · BAT · Product Owner certification · Replacement Certification | Product Owner / Architecture | **Required before each wave freeze** |

**Implementation status:** NOT YET AUTHORISED.

---

## 15. Document control

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-07-25 | Initial ADR from approved assessment |
| 1.0 | 2026-07-25 | Product Owner APPROVED · Architecture CERTIFIED · FROZEN · §3A Business Capability Ownership · Implementation not authorised |

---

## Appendix A — Decision checklist (Architecture Review)

- [x] Canonical route `/deals/:dealId` accepted  
- [x] Loan Files demoted to implementation artefact / alias accepted  
- [x] Opportunity / Deal / Loan File relationship accepted  
- [x] Legacy Retirement Impact section accepted  
- [x] ADR-018 remains frozen (confirmed)  
- [x] Implementation not authorised by architecture certification alone (confirmed)  
- [x] Programme naming disambiguation vs CO-ARCH-001 Lender CO-ARCH-004 noted  
- [x] Business Capability Ownership governance amendment included before Architecture Freeze  

## Appendix B — References

- Assessment: `docs/co-arch-003/CO-ARCH-DEAL-WORKSPACE-IDENTITY-ASSESSMENT.md`  
- Policy: `docs/governance/PRE-LAUNCH-ENGINEERING-POLICY.md`  
- Replacement template: `docs/governance/REPLACEMENT-CERTIFICATION-TEMPLATE.md`  
- Business Capability Ownership: `.cursor/rules/business-capability-ownership.mdc`  
- ADR-018: `docs/adr/ADR-018-start-loan-journey-draft-lead-information.md`  
- Blueprint (historical target): `docs/co-arch-003/CO-ARCH-003-IMPLEMENTATION-BLUEPRINT.md` §4.1  

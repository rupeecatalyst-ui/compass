# ADR-018: Start Loan Journey — Draft Opportunity → Lead Information → Requirement Capture

**Status:** **ACCEPTED — PRODUCT ARCHITECTURE APPROVED**  
**Date:** 2026-07-25  
**Directive class:** Product Architecture Decision  
**Supersedes:** Frozen Start Loan Journey shortcut (Contact → Create Opportunity → Opportunity Workspace / `/credit-bench`)  
**Related:** CAD-2026-001 · ADR-017 · CO-ARCH-003 · FS-01  

## Decision

The Start Loan Journey rule that opened Opportunity Workspace immediately after Opportunity create is **superseded**.

### Approved business flow

```
Contact
  → Start Loan Journey
  → Draft Opportunity (identity only)
  → Loan Journey (Execution Hub) — orchestration, not Deal workspace
  → Lead Information Workspace (Opportunity Registry capture)
  → Save → Requirement Captured (when Product + Required Amount saved)
  → Opportunity Workspace (execution / enrichment only)
  → Documents → Credit → LIFE → Pipeline
```

## Approved resolutions (locked)

### 1. Create timing — Option A

Start Loan Journey creates a **Draft Opportunity**.

- Draft contains **identity only** (Contact linkage, Opportunity number, lifecycle = draft).
- **No business values shall be fabricated** (no default Home Loan as silent UI truth, no amount, no secured/fresh).
- Product may remain unset until Lead Information; uniqueness Contact+Product+Active applies when Product is set / on Requirement Capture.

### 2. Definition gate — Requirement Captured

An Opportunity becomes **Requirement Captured** only after both are saved on Opportunity Registry:

- Product  
- Required Amount  

Until then, Opportunity Workspace (execution) must not begin.

### 3. Execution Hub

Retain Execution Hub as the **orchestration layer** of the customer journey.

- Not a Deal workspace.  
- Must not mint Deals / LoanFiles from Start Loan Journey.  
- Guides RM: Lead Information → (after gate) Opportunity Workspace → Documents → …

#### Wave 3 route lock (2026-07-25)

| Decision | Value |
|----------|--------|
| Canonical Execution Hub route | **`/loan-journey`** |
| Legacy `/loan-files` Deal / file book | **Do not migrate or rename in Wave 3** |
| Compatibility | Introduce `/loan-journey` while preserving `/loan-files` for Deal workspace |
| Deal workspace path migration | **Future architectural programme** — out of Wave 3 |

Wave 3 shall wire Start Loan Journey → `/loan-journey` (Hub) → Lead Information. It shall **not** treat `/loan-files?entry=dashboard` as the long-term Hub SSOT, but may keep redirects/compat as needed without collapsing Deal desk into the Hub rename.

### 4. Lead Information Workspace

**New** Opportunity-native capture workspace.

- Writes **directly** to Opportunity Registry (create already done; **update** API required).  
- Must **not** use LoanFile or Deal models.  
- Must **not** reuse `LoanCreateFormDialog` / legacy `/loan-information` LoanFile create.

### 5. Opportunity Workspace

Begins **only after** Requirement Capture.

- Purpose: execution and enrichment.  
- Not initial customer requirement capture.

### 6. Lending type

Remain **Not Specified** until captured or derived by an approved business rule / Policy Engine.

### 7. Opportunity lifecycle (approved states)

```
Draft
  → Requirement Captured
  → Active Opportunity
```

(Exact enum mapping to `lifecycleStatus` / `requirementStage` is an implementation detail of Wave 1; must preserve this business meaning.)

## Consequences

| Area | Implication |
|------|-------------|
| Start Loan Journey | Redirect to Execution Hub (`/loan-journey`) with Draft Opportunity context — not `/credit-bench` OW |
| Opportunity API | PATCH/update required for Lead Information Save |
| Default product at Start | Must not fabricate business product on Draft create |
| CAD-2026-001 | Strengthened — capture is explicit Registry write |
| FS-01 / OW stages | OW entry gated on Requirement Captured |
| Active uniqueness | Enforce when Product is assigned / on Requirement Capture |

## Implementation waves (binding order)

0. **Governance** — this ADR + cursor rule ✅  
1. **Persistence** — Draft lifecycle + Opportunity update API + gate fields ✅ **CERTIFIED** (`docs/co-arch-003/CO-ARCH-ADR-018-WAVE1-CERTIFICATION.md`)  
2. **Lead Information Workspace** — Opportunity-native UI ✅ (`docs/co-arch-003/CO-ARCH-ADR-018-WAVE2-LEAD-INFORMATION.md`)  
3. **Entry routing** — Start → **`/loan-journey`** (Execution Hub) → Lead Information; preserve `/loan-files` Deal workspace (no rename in Wave 3)  
4. **OW gate** — block OW until Requirement Captured; BAT update  

Do not implement Deal/Pipeline redesign as part of this program.

## Non-goals

- UI chrome redesign  
- Reintroducing LoanFile as Lead capture  
- Fabricating lending type / amount / transaction type at Draft create  

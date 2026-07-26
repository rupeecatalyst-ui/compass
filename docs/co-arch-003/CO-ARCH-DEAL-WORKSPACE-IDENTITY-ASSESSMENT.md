# CO-ARCH — Deal Workspace Identity Architecture Assessment

**Programme ID:** CO-ARCH-004 — Deal Workspace Identity (see ADR-019)  
**Document type:** Product Architecture Assessment  
**Status:** **APPROVED** — Product Architecture / Product Owner (2026-07-25)  
**Date:** 2026-07-25  
**Authority:** Product Architecture Directive — Pre-Launch Engineering Policy  
**Successor ADR:** [`docs/adr/ADR-019-co-arch-004-deal-workspace-identity.md`](../adr/ADR-019-co-arch-004-deal-workspace-identity.md) — **APPROVED · Architecture CERTIFIED · FROZEN** · Implementation **not authorised**

**Explicit non-goals of this document**

- No implementation  
- No route changes  
- No redirects  
- No ADR-018 modifications (ADR-018 remains frozen as certified)

**Related**

- Pre-Launch Single Implementation Rule — `.cursor/rules/pre-launch-single-implementation.mdc`  
- ADR-018 (frozen) — Opportunity / Hub / Lead Information identity  
- CO-ARCH-002 — Enterprise Deal Registry · “Deal Workspace (today: Loan Workspace)”  
- CO-ARCH-003 blueprint — target `/deals/:dealId`  
- FS-02 backlog — Deal runtime separation (not opened)  
- BAT investigation — Move to Deal → `/loan-files?file=…` (identity co-location)

---

## 1. Executive summary

ADR-018 established **canonical business identity** for the Opportunity side of the journey:

| Capability | Canonical identity | Route |
|------------|-------------------|--------|
| Execution Hub | Loan Journey (orchestration) | `/loan-journey` |
| Requirement capture | Lead Information | `/lead-information` |
| Opportunity execution | Opportunity Workspace | OW stage routes |

BAT has shown that **Move to Deal** still lands in a surface that carries the historical **Loan Workspace / Loan Files** identity, while product language and toasts call it **Deal Workspace**.

This is **not** an ADR-018 defect. ADR-018 Wave 3 deliberately preserved `/loan-files` as the Deal execution host.

It is the **next architectural evolution**: give the Deal domain the same identity clarity Opportunity received — under the Pre-Launch **Single Implementation Rule**.

---

## 2. Current Deal Workspace architecture

### 2.1 Domain vs surface

| Layer | Current state |
|-------|----------------|
| **Enterprise Deal** (Registry) | Canonical business entity (`dealId`, `dealNumber`, lender, Opportunity link) |
| **Deal Data Access** | `src/lib/enterprise-deal/deal-data-access.ts` — Deal I/O; maps to `LoanFile` shape for UI |
| **Move to Deal** | `moveOpportunityToDeal` → ensure attachment → persist Deal(s) → navigate |
| **Open path** | `buildCanonicalJourneyStageHref("lender_pipeline")` → **`/loan-files?file=…&tab=lenders&dealId=…`** |
| **Execution UI** | `LoanWorkspaceModal` on `LoanFilesWorkspace` — chrome/docs still say **Loan Workspace** |
| **Queue** | **My Deals** (`/my-deals`) — lender Deal work queue |

### 2.2 Create / open chain (as implemented)

```
LIFE Execution Queue
  → Move to Deal
  → ensureLoanWorkspaceForOpportunityAsync
  → createDealAsync (LoanFile-shaped attachment + Enterprise Deal when primary write ON)
  → Lender Pipeline sync on that attachment
  → persist Enterprise Deal identity
  → /loan-files?file=<attachmentId>&opportunityId=…&tab=lenders&dealId=<dealId>
  → LoanWorkspaceModal (Lender Pipeline)
```

### 2.3 Architectural characterisation

- **One physical host** (`/loan-files` + modal)  
- **Two product names** (Deal Workspace vs Loan Workspace)  
- **Two identity keys** (`file` / LoanFile id vs `dealId` / Enterprise Deal id)  
- **One intended post–Move-to-Deal role:** lender execution desk  

This dual naming is the primary BAT investigation cost for the Deal domain.

---

## 3. Current responsibilities of Loan Workspace / Loan Files

### 3.1 Route family: `/loan-files`

| Mode | Responsibility today |
|------|----------------------|
| `?file=` (+ optional `tab`, `dealId`, `opportunityId`) | Open single-case execution desk (`LoanWorkspaceModal`) — **acts as Deal Workspace** after Move to Deal |
| Browse / Kanban / List / Timeline / Tasks | Operational **Deal book** / file list (legacy “Loan Files” framing) |
| Former Hub (`entry=dashboard` / no file) | Compat redirect to `/loan-journey` (ADR-018 Wave 3) — Hub no longer owned here |
| Create Loan Modal | Still available on Deal book surface — historical LoanFile/Deal mint path |

### 3.2 Component family: Loan Workspace

| Asset | Role |
|-------|------|
| `LoanFilesWorkspace` | Host shell for book + modal |
| `LoanWorkspaceModal` | Authoritative execution desk (tabs: overview, lenders/pipeline, documents, etc.) |
| `loan-files-storage` / DAL cache | Runtime list shaped as `LoanFile[]` |
| Canonical journey stages | Lender Pipeline / Disbursed / Complete → `ROUTES.LOAN_FILES` |

### 3.3 What Loan Workspace is *not* (post ADR-018)

- Not Execution Hub (that is `/loan-journey`)  
- Not Lead Information  
- Not Opportunity Workspace (pre–Move to Deal)  
- Not a second competing Hub  

It remains the **post–Move to Deal execution host**, under a legacy name.

---

## 4. Canonical business responsibilities of the Deal Workspace

### 4.1 Business definition (target identity)

**Deal Workspace** is the enterprise desk where an RM executes an **Enterprise Deal** after Opportunity → Move to Deal:

1. **Identity** — Deal number, parent Opportunity, Contact, primary lender/program  
2. **Lender Pipeline** — stage progression per lender case (SSOT for lender status)  
3. **Deal documents** — consume Document Center; no parallel repository  
4. **Tasks / timeline / communication** — Deal-scoped operational work  
5. **Commercial / accounting hooks** — as certified in later programmes  
6. **Never** — Opportunity requirement capture, Draft Opportunity create, or Execution Hub orchestration  

### 4.2 Authority rules (aligned with CAD / CO-ARCH)

| Concern | Authority |
|---------|-----------|
| Opportunity business fields | Opportunity Registry only |
| Deal / lender execution state | Enterprise Deal (+ Deal Workspace) |
| LoanFile shape | Compatibility/runtime adapter only — **not** business SSOT |
| Pre–Move to Deal | No Deal Workspace authority; no Deal mint |

### 4.3 Canonical identity outcomes (desired)

After a future Replace decision (not this assessment):

| Capability | Single active identity |
|------------|------------------------|
| Deal execution desk | **Deal Workspace** |
| Deal work queue | **My Deals** |
| Orchestration | **Loan Journey** (`/loan-journey`) |
| Requirement capture | **Lead Information** |
| Opportunity enrichment | **Opportunity Workspace** |

“Loan Workspace” / “Loan Files” as **user-facing journey identity** should cease for Deal execution once Replace is certified.

---

## 5. Migration strategy — Loan Workspace identity → Deal Workspace identity

Guided by **Pre-Launch Single Implementation Rule**: when Architecture says Replace, only the Deal Workspace identity remains active in nav/routing/journey/workflow/logic.

### Phase A — Architecture freeze (this assessment)

- Accept assessment  
- Lock ADR-018 unchanged  
- Open programme name + Replacement Certification expectation  
- **No code**

### Phase B — Identity & route decision (Architecture Decision Record)

Choose **one** canonical open path (illustrative options for decision, not implementation):

| Option | Canonical route | Compat |
|--------|-----------------|--------|
| **B1 — Dedicated Deal route** | `/deals/:dealId` (aligns CO-ARCH-003 blueprint) | Temporary redirect from `/loan-files?file=` then retire |
| **B2 — Rename-in-place** | Keep `/loan-files` host; rename chrome/nav/journey to Deal Workspace; deprecate “Loan” language | Faster; weaker identity clarity |
| **B3 — Hybrid** | Canonical `/deals/:dealId`; `/loan-files` book renamed “Deal Files” or folded into My Deals | Clear desk + queue separation |

**Assessment recommendation:** Prefer **B1 or B3** under Single Implementation Rule — mirrors ADR-018 Hub/Lead Information pattern (own identity + own route). B2 alone leaves BAT ambiguity (“is `/loan-files` Loan or Deal?”).

### Phase C — Replace wiring (implementation — future approval only)

1. Move to Deal navigates **only** to canonical Deal Workspace route.  
2. Canonical journey `lender_pipeline` / disbursed / complete point to Deal Workspace.  
3. Primary nav / deep links / My Deals open Deal Workspace.  
4. Legacy Loan Workspace journey participation **stops** (nav, routing, journey, workflow).  
5. Runtime may still map Deal → LoanFile-shaped DTO internally until a later runtime purge — but **must not** remain a second user-facing capability.

### Phase D — Replacement Certification

Use `docs/governance/REPLACEMENT-CERTIFICATION-TEMPLATE.md`. Sprint incomplete until Product Owner acceptance.

### Phase E — Controlled retirement

Remove or quarantine:

- User-facing “Loan Workspace” / “Loan Files” journey labels for Deal execution  
- Dual open paths (`file=` vs `dealId`) as **active** alternatives  
- Create-loan paths that mint Deal/LoanFile **outside** certified Move to Deal / Deal create policy  

---

## 6. Legacy components likely redundant after migration

*Redundant as **active journey/capability** — exact deletion timing is implementation-wave work.*

| Area | Candidate for retirement / quarantine |
|------|----------------------------------------|
| User-facing name “Loan Workspace” | Replaced by Deal Workspace in chrome, nav, journey |
| User-facing “Loan Files” as Deal book | Fold into My Deals + Deal Workspace, or rename under Deal identity |
| Hub-on-loan-files remnants | Already redirected; remove dead Hub hosts if any remain |
| Parallel create paths | Contact/Loan create that bypass Move to Deal / Deal policy (per CO-P0 lessons) |
| `?file=` as primary Deal identity | Superseded by `dealId` in URLs once B1/B3 chosen |
| Docs/toasts saying Deal Workspace while routes say Loan Files | Unify under Deal identity |
| FS-02 UX debt | `window.confirm` Move to Deal → Enterprise Confirmation Modal (companion, not identity itself) |

**Retain (not redundant):**

- Enterprise Deal Registry / DAL  
- Lender Pipeline business behaviour  
- My Deals queue  
- Document Center as document SSOT  
- LoanFile mapping adapters until a dedicated Deal runtime DTO programme  

---

## 7. Recommended implementation roadmap

| Wave | Name | Deliverable | Gate |
|------|------|-------------|------|
| **0** | Assessment & policy | This document + Single Implementation Rule (done as drafts) | Product Architecture review |
| **1** | ADR — Deal Workspace Identity | Lock option B1/B2/B3; freeze non-goals; Replacement Certification criteria | Product Owner “Assessment Approved” + ADR Accepted |
| **2** | Route & navigation identity | Canonical Deal Workspace route + nav; Move to Deal → single path | Build + BAT identity checks |
| **3** | Journey & workflow cutover | Canonical stages, deep links, My Deals → Deal Workspace only | Dual-path removed from journey |
| **4** | Replacement Certification | Template completed; legacy retired from nav/routing/journey/workflow | **Product Owner acceptance** |
| **5** | Controlled code retirement | Delete/quarantine unused Loan Workspace journey hosts; adapter cleanup backlog | Architecture Certification |

**Out of scope until later programmes**

- Changing Lender Pipeline business rules  
- Changing Deal Registry schema constitution  
- Reopening ADR-018  
- Full deletion of LoanFile type system (may follow Wave 5 as runtime cleanup)

**Dependency note:** FS-02 (Deal runtime separation backlog) should be **aligned or subsumed** under this programme so BAT does not see two parallel “Deal cleanup” tracks.

---

## 8. Relationship to ADR-018

| Topic | Position |
|-------|----------|
| ADR-018 content | **Frozen — no change** |
| Wave 3 `/loan-files` Deal host lock | Correct for ADR-018 scope; **superseded only by a future Deal Identity ADR** |
| Continu journey “Move to Deal → Deal Workspace” | Business intent unchanged; identity of the workspace is this programme’s subject |
| Single Implementation Rule | Applies to **this** Deal programme and future replacements; does not rewrite ADR-018 history |

---

## 9. Success criteria (for future certification — not claimed now)

A future Deal Workspace Identity programme is complete only when:

1. Users and BAT can name **one** Deal execution desk without Loan Workspace ambiguity.  
2. Move to Deal opens **only** that canonical Deal Workspace.  
3. Navigation and journey use Deal Workspace language and routes only.  
4. Replacement Certification is Product Owner–accepted.  
5. Legacy Loan Workspace / Loan Files no longer participate as an alternate Deal journey.

---

## 10. Decision request — CLOSED

| Item | Outcome (2026-07-25) |
|------|----------------------|
| Pre-Launch Single Implementation Rule | **Accepted** as default until Go-Live |
| This Assessment | **Approved** |
| Canonical route preference | **`/deals/:dealId`** (B1 / B3 direction) |
| Next artefact | **ADR-019 / CO-ARCH-004** — submitted for Architecture Review |
| Implementation | **Not authorised** until ADR Product Owner certification |

See: `docs/adr/ADR-019-co-arch-004-deal-workspace-identity.md`

---

## 11. Document control

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-07-25 | Initial assessment from Product Architecture Directive + BAT Move-to-Deal investigation |

# CO-DEAL-PIPELINE-TRANSITION-001 — Opportunity → Deal Initial Stage Fix

**Status:** Fixed · Verified locally · **NOT DEPLOYED**  
**Date:** 2026-08-10  
**Scope:** Targeted lifecycle transition correction only  

---

## A. Root cause

`Move to Deal` correctly built lender cases with `caseStage: "identified"`, but **Deal Registry create** hardcoded:

```ts
grossStage: "logged_in_wip"
```

Deal Pipeline runtime uses **`EnterpriseDeal.grossStage` as SSOT** and does **not** prefer `snapshot.lenders[].caseStage`:

```ts
// deal-pipeline-runtime.ts
const caseStage = grossStageToLenderCaseStage(deal.grossStage);
```

Therefore the Kanban showed **Logged In – WIP** immediately after Move to Deal, even though no login occurred.

---

## B. Exact code path

```
Opportunity → Execution Queue lenders
  → moveOpportunityToDeal (caseStage: "identified")
  → createDealFromOpportunity
  → buildDealCreateBodyFromOpportunity
       ❌ grossStage: "logged_in_wip"   ← defect
       ❌ snapshot.stage.grossStage: "logged_in_wip"
  → POST Deal Registry
  → deal-pipeline-runtime projects grossStage → Kanban
       → Logged In – WIP
```

Same create helper is used by **Identify Additional Lender** (`identifyLenderAsEnterpriseDeal`).

---

## C. Canonical initial pipeline state

From frozen `LENDER_CASE_STAGES` (`src/constants/lender-pipeline.ts`):

| Order | id | UI label |
|------:|----|----------|
| 1 | `identified` | **Identified** |
| 2 | `prelogin` | Pre Login |
| 3 | `logged_in_wip` | Logged In – WIP |
| … | … | … |

**Canonical initial state after Move to Deal = `identified` (Identified).**  
No new stage invented. Business “Identified / Prelogin” maps to existing `identified` (pre-login column family starts here; `prelogin` remains the next explicit step before login).

Login remains a separate transition: `identified` → `logged_in_wip` (still allowed by `deal-stage-rules.ts`).

---

## D. Files changed

| File | Change |
|------|--------|
| `src/lib/enterprise-deal/deal-create-from-opportunity.ts` | Derive `grossStage` from lender `caseStage` via `lenderCaseStageToGrossStage`; default **`identified`**; align snapshot |
| `scripts/co-deal-pipeline-transition-001-verify.mjs` | Static + create-body + transition regression + read-only impact |
| `package.json` | `verify:co-deal-pipeline-transition-001` |
| `docs/co-deal-pipeline-transition-001/CO-DEAL-PIPELINE-TRANSITION-001-COMPLETION-REPORT.md` | This report |

**Unchanged:** Opportunity architecture · Deal identity · Lender/Product masters · Partner Gateway · EPDE · Documents · pipeline stage enum · production Deal rows.

---

## E. New Deal transition test

`buildDealCreateBodyFromOpportunity` with Identified lender case:

- `grossStage` → **`identified`**
- `snapshot.stage.grossStage` → **`identified`**
- Must not be `logged_in_wip`

`verify:co-deal-pipeline-transition-001` → **PASS**

---

## F. Login transition regression

`assertLenderPipelineStageTransition({ from: identified, to: logged_in_wip, allowSkip: true })` → **PASS**

Also verified forward path Soft Approved → Final Approved → Closure WIP → Disbursed and Lost / Hold from Logged In – WIP → **PASS**

---

## G. Persistence verification

Create body persists Registry `grossStage` (not UI-only). Runtime reloads from `deal.grossStage`. After fix, new Deals persist **`identified`**; reload / reopen / Lender Pipeline must stay Identified until Login.

Live browser Move to Deal not executed here (no deploy; no production Deal create in this sprint).

---

## H. Existing Deal impact report (read-only · **no mutations**)

| Metric | Value |
|--------|------:|
| Deals currently `logged_in_wip` / `logged_in` | **4** |
| With stage-activity / timeline signals | **0** |
| Possibly incorrect init (heuristic: at Logged In – WIP, little/no activity, create≈update) | **1** |

Sample possibly incorrect (not modified):

| Deal ID | Deal # | Stage | Created (UTC) |
|---------|--------|-------|---------------|
| `cmsn5o74h0001if04ugyxy0h0` | DEAL-2026-000095 | `logged_in_wip` | 2026-08-10T11:36:04.625Z |

Opportunity: `cmsmzda0e0003jx04uydtrfvj` · Lender: `cms4cmkgh0003wen4racfsmj4`

**No existing production Deals were updated.** Remediation requires separate PO authorization.

---

## I–K. Build gates

| Gate | Result |
|------|--------|
| I. TypeScript | ✅ `tsc --noEmit` exit 0 |
| J. Lint | ✅ `next lint` exit 0 |
| K. Build | ✅ `next build` exit 0 |
| `verify:co-deal-pipeline-transition-001` | ✅ PASS |
| `scripts/co-p1-deal-stage-sync-verify.mjs` | ✅ PASS |

---

## L. Remaining ambiguity

1. UI may also show **Pre Login** as a distinct column after Identified; Move to Deal lands on **Identified**, not Pre Login — matching existing Move-to-Deal / Identify Lender case builders.  
2. Existing Deals already at `logged_in_wip` may or may not reflect real logins; heuristic impact is incomplete without full timeline audit.  
3. Wealth Partner consumes the same Deal `grossStage` — no Partner-specific stage mapping added.

**Deploy:** not performed.

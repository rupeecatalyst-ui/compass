# CO-ARCH-002 — Strategy Workbench Lender Shortlisting (Max Two)

**Status:** OPEN — Implementation shipped; BAT scenarios 1–4 pending live acceptance  
**Date:** 2026-07-27  
**Scope:** Opportunity Strategy Workbench shortlist only (workflow refinement)  
**Non-goals:** No schema, Registry, routing, or Deal Workspace caps

> Note: This ticket reuses the CO-ARCH-002 programme prefix for Strategy shortlisting. It is **distinct** from the earlier CO-ARCH-002 Loan File retirement / Deal Registry waves in this folder.

---

## Business rule

| Phase | Cap |
|-------|-----|
| Strategy Workbench (Opportunity) | **Max 2** — Primary Choice + Secondary Choice |
| Deal Workspace (after Move to Deal) | **Unlimited** — Identify Additional Lender unchanged |

Guidance copy (SSOT):

> Only two lenders can be shortlisted during Strategy. Additional lenders can be added after Deal creation from the Deal Workspace.

---

## Before vs After

| Step | Before | After |
|------|--------|-------|
| Strategy Select | Unlimited queue | Max 2; Select disabled at limit + guidance |
| Move to Deal | One Deal per queued lender (N) | At most **2** Deals (Primary + Secondary) |
| Deal Workspace Identify | Unlimited | Unlimited (unchanged) |

---

## Implementation

| Layer | Change |
|-------|--------|
| Constants | `src/constants/strategic-lender-shortlist.ts` |
| SSOT enforce | `upsertStrategicShortlistItem` throws `StrategicShortlistLimitError` |
| Legacy trim | `enforceStrategicShortlistMax` keeps first 2 |
| Move to Deal | `takeStrategyShortlistForMoveToDeal` slices to 2 |
| UI | Strategy board: disable Select, Primary/Secondary labels, guidance banner |
| Writers | LIFE panel, ELW `select-lender` catch limit |

**Unchanged:** Opportunity / Deal / Lender Registries, Prisma schema, APIs, Deal `identifyLenderAsEnterpriseDeal`.

---

## Files modified

- `src/constants/strategic-lender-shortlist.ts` (new)
- `src/lib/strategic-lender-pipeline/sync.ts`
- `src/lib/strategic-lender-pipeline/move-to-deal.ts`
- `src/lib/strategic-lender-pipeline/run-move-to-deal-transition.ts`
- `src/lib/strategic-lender-pipeline/index.ts`
- `src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx`
- `src/components/catalyst-one/opportunity-workspace/workspace-life-panel.tsx`
- `src/lib/enterprise-lender-workspace/select-lender.ts`
- `scripts/co-arch-002-strategy-shortlist-verify.mjs`
- This report

---

## Business Acceptance Test

| # | Scenario | Expected | Evidence |
|---|----------|----------|----------|
| 1 | Add A, B; attempt C | C blocked; guidance shown | Pending live BAT |
| 2 | Move to Deal | Only A + B Deals created | Pending live BAT |
| 3 | Deal Workspace add C, D, E | All succeed | Pending live BAT |
| 4 | Pipeline with extra lenders | Normal drag/save/remove | Pending live BAT |

Engineering gate: `node scripts/co-arch-002-strategy-shortlist-verify.mjs`

---

## Certification

**CO-ARCH-002 Strategy Shortlist remains OPEN** until BAT 1–4 pass on production.

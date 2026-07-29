# CO-INC-001A — Enterprise Kanban Stage Vocabulary Unification

**Status:** Implementation Complete · Verification pending BAT · **No migrate · No deploy**  
**Supersedes snap-back behaviour documented in** `CO-INC-001-KANBAN-DND-ROOT-CAUSE-REPORT.md`

## Decision

Canonical Deal / Lender Pipeline stage vocabulary = **`LenderCaseStage`**.

| Surface | Vocabulary |
|---------|------------|
| Kanban UI | LenderCaseStage |
| Transition rules | LenderCaseStage |
| Persist `toGrossStage` | LenderCaseStage (identity) |
| Registry `gross_stage` (going forward) | LenderCaseStage |
| Reload → Kanban | LenderCaseStage |
| My Deals / LoanFile projection | PipelineStage via one-way display map only |

## What changed

1. **`deal-lender-stage-map.ts`** — removed lossy write map (`prelogin`→`pre_login`, `disbursed`→`won`, etc.). Persist is identity after normalize.
2. **`deal-stage-rules.ts`** — canonicalize from/to via `tryCanonicalLenderCaseStage`; always return canonical ids; Hold re-open preserved.
3. **`lender-pipeline.ts`** — expanded legacy read aliases (`won`, `logged_in`, `credit_wip`, …); added `tryCanonicalLenderCaseStage`.
4. **`deal-stage-projection.ts`** — My Deals still gets PipelineStage via projection helper.
5. **`invoice-party.ts`** — aliases for LenderCaseStage ids.
6. **`deal-create-from-opportunity.ts`** — create uses `logged_in_wip` (not legacy `login`).
7. **`deal-workspace-host.tsx`** — comment only on fail-closed reload (behaviour unchanged).

## Transition chain verified (static)

Identified → Pre Login → Logged In – WIP → Soft Approved → Final Approved → Closure WIP → Disbursed  
Plus Hold, Lost, Hold→re-open to forward stage.

## Explicitly not done

- No Prisma migration  
- No live data rewrite (legacy `pre_login` / `logged_in` / `won` rows canonicalize on next successful transition)  
- No Vercel deploy  

## Verify

```bash
npm run verify:co-inc-001a
```

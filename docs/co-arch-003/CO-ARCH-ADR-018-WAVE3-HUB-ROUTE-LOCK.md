# ADR-018 Wave 3 — Execution Hub route lock

**Status:** Product Architecture **LOCKED** (awaiting Wave 3 implementation approval)  
**Date:** 2026-07-25  
**Parent:** [ADR-018](../adr/ADR-018-start-loan-journey-draft-lead-information.md)

## Decision (verbatim)

ADR-018 Wave 3 shall use **`/loan-journey`** as the canonical Execution Hub route.

- Do **not** migrate or rename the existing **`/loan-files`** Deal workspace during Wave 3.  
- Introduce the new route while preserving backward compatibility.  
- Any migration of the Deal workspace remains a **future architectural programme**.

**Wave 3 implementation:** see [CO-ARCH-ADR-018-WAVE3-EXECUTION-HUB.md](./CO-ARCH-ADR-018-WAVE3-EXECUTION-HUB.md).

## Implications

| Surface | Route after Wave 3 |
|---------|-------------------|
| Execution Hub (orchestration) | `/loan-journey` |
| Lead Information | `/lead-information` (Wave 2) |
| Deal / Loan Files book | `/loan-files` (unchanged in Wave 3) |

## Investigation baseline

See prior architectural investigation: Hub today is hosted at `/loan-files?entry=dashboard` via `LoanWorkspaceNavigator` inside `LoanFilesWorkspace`. Wave 3 extracts Hub ownership to `/loan-journey` without collapsing Deal desk.

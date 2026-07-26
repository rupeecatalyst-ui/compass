# CO-ARCH — Start Loan Journey

**Status:** **SUPERSEDED** by [ADR-018](../adr/ADR-018-start-loan-journey-draft-lead-information.md) (2026-07-25)  
**Date:** 2026-07-24 · **Superseded:** 2026-07-25

## Prior frozen flow (withdrawn)

```
Contact → Start Loan Journey → Create Opportunity → Open Opportunity Workspace
```

## Current approved flow

See **ADR-018**:

```
Contact → Start Loan Journey → Draft Opportunity (identity only)
  → Execution Hub → Lead Information Workspace
  → Requirement Captured (Product + Required Amount)
  → Opportunity Workspace → Documents → Credit → LIFE → Pipeline
```

## SSOT

- ADR: `docs/adr/ADR-018-start-loan-journey-draft-lead-information.md`
- Cursor rule: `.cursor/rules/start-loan-journey.mdc`

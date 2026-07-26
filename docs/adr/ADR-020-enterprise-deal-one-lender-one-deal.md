# ADR-020 / CO-ARCH-007 — Enterprise Deal Model Realignment (Option A)

**Status:** Approved · Constitutional  
**Date:** 2026-07-26

## Decision

One lender negotiation = one `EnterpriseDeal` row under one Opportunity.

```
Customer → Opportunity → EnterpriseDeal(s) → Loan Workspace (Opportunity execution desk)
```

## Rules

1. `EnterpriseDeal` is the ONLY SSOT for Deal existence, count, stage, lifecycle, accounting keys, Chanakya, and Radar.
2. `snapshot.lenders` is a **single-lender derived projection** only — never multi-lender SSOT.
3. Identify Additional Lender **creates/upserts** Deal on `(opportunityId + lenderId)`.
4. Loan Workspace loads `listDealsByOpportunity(opportunityId)`.
5. Deal Registry Deal Count = `COUNT(EnterpriseDeal)` for the Opportunity.
6. Opportunity metrics = aggregation of child Deals (`opportunity-deal-aggregation.ts`).

## Consequences

- Move to Deal / Identify Lender write one Deal per lender.
- Backfill: `scripts/co-arch-007-backfill-snapshot-lenders.cjs`
- Accounting, invoice, Chanakya, Radar must key by `dealId` and roll up by `opportunityId`.

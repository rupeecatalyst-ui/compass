# CO-ARCH-005 — Enterprise Lender Registry & Commercial Program Architecture

**Status:** Implemented — pause for ARB  
**Date:** 2026-07-22

## Principle

Four distinct layers — never collapse them.

1. **Enterprise Lender Registry** — who is the lender (identity SSOT)
2. **Supported Products** — capability only (`productsSupported`) — never auto-creates programs
3. **Enterprise Product Programs** — intentional commercial offerings
4. **Published Programs** — only layer visible to Comparison / Opportunity / Strategy / Recommendations

## Delivered

| Item | Status |
|------|--------|
| Comparison empty state (Supported vs Published) | ✅ |
| Product Program Creation Wizard | ✅ |
| Admin dashboard summary cards | ✅ |
| Enterprise Validation Report | ✅ |
| Comparison engine still published-only | ✅ unchanged |
| No dummy/auto program seed | ✅ |

## Admin

`/admin/lender-registry`

- **New Product Program** wizard (Supported Products only)
- Metrics: Total Lenders · Supported Products · Commercial / Published / Draft / Awaiting Approval
- Validation: capability without programs, drafts, missing ROI/LTV, unpublished, expired, disabled

## Comparison

`/lenders` — when published programs = 0, shows administrator empty state with CTA to Configure Product Programs.

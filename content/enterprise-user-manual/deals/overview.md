---
id: deals.overview
title: Deals and Loan Workspace
summary: Deal Registry, one-lender-one-deal model, and Loan Workspace execution desk.
categoryId: deals
status: available
audience: admin
updated: 2026-08-13
tags: deals, loan-workspace, lender-pipeline
related: opportunities.overview, lenders.lender-360, getting-started.overview
---

# Deals and Loan Workspace

## Canonical model

```text
Customer / Contact → Opportunity → Enterprise Deal (per lender) → Loan Workspace
```

- **My Deals** — Deal Registry (scan & select).
- **Loan Workspace** — Opportunity execution desk (Kanban-first Lender Pipeline).
- **Deal Workspace** — deal-scoped execution when opened by deal identity.

## One lender · one Deal

Uniqueness key: `(opportunityId + lenderId)`.

Identifying an additional lender must create or upsert an **Enterprise Deal**. Do not treat multi-lender snapshot arrays as Deal inventory.

## How to work a deal queue

1. Open **My Deals**.
2. Scan compact rows; expand only when you need operational detail.
3. Open the Deal / Loan Workspace for execution.
4. Use **Lender Pipeline** Kanban as the primary work surface (~75% of the desk).

## Loan Workspace chrome (intent)

- Compact identity header (context only).
- Workspace Intelligence Ribbon is **entity-scoped** (this opportunity/deal), not org-wide Mission Control.
- Pipeline bucket counts belong on the Kanban — not duplicated in the intelligence ribbon.

## Documents on Deal

Deal Documents tab is a **read-only projection** of Opportunity Document Center. Upload/replace/delete only from Document Center.

## FAQs

**Can I delete a lender from Kanban by filtering UI state alone?**  
No. Remove must soft-delete the corresponding Enterprise Deal via Deal Registry APIs.

## Related articles

- [Opportunities](/admin/user-manual/opportunities/overview)
- [Lenders / Lender 360°](/admin/user-manual/lenders/lender-360)

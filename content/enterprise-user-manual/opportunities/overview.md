---
id: opportunities.overview
title: Opportunities
summary: Opportunity Registry, requirement capture, and Opportunity Workspace stages.
categoryId: opportunities
status: available
audience: admin
updated: 2026-08-13
tags: opportunities, registry, lead-information, adr-018
related: getting-started.overview, contacts.contact-360, deals.overview
---

# Opportunities

The **Opportunity Registry** owns the Opportunity lifecycle. My Opportunities is a registry (scan & select), not a permanent KPI dashboard.

## Lifecycle (simplified)

`Draft` → `Requirement Captured` → `Active Opportunity` (and related planning-active statuses)

- **Draft** — identity only after Start Loan Journey; no fabricated product/amount.
- **Requirement Captured** — when Product and Required Amount are saved on the Opportunity Registry.
- **Active** — execution enrichment continues in Opportunity Workspace and beyond.

## How to start a loan journey

1. From a Contact, choose **Start Loan Journey** (canonical path).
2. A **Draft** Opportunity is created (identity only).
3. Use the **Loan Journey** Execution Hub and **Lead Information** to capture Product + Required Amount.
4. After Requirement Captured, continue into **Opportunity Workspace**.

Do not treat Contact → Credit Bench as the Start landing path.

## Opportunity Workspace stages

Continuous desk (certified order):

1. Opportunity Creation / enrichment
2. Document Center
3. Credit Workbench
4. Strategy Workbench

Then Loan Execution: Loan Workspace → Lender Pipeline → …

Preserve Opportunity context on Continue / Back. Never drop the user on an empty module dashboard mid-transaction.

## Active uniqueness

One Contact may have only **one planning-active Opportunity for the same Product**. Uniqueness is enforced at Requirement Capture (not Draft create without product).

## FAQs

**Is Loan File the Opportunity SSOT?**  
No. Opportunity Registry is SSOT. LoanFile-shaped projections may exist for compatibility; they must not invent business values.

**Where do Deals come from?**  
One lender negotiation = one Enterprise Deal under the Opportunity (`opportunityId + lenderId`).

## Related articles

- [Contacts / Contact 360°](/admin/user-manual/contacts/contact-360)
- [Deals / Loan Workspace](/admin/user-manual/deals/overview)

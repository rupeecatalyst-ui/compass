# CO-ARCH-003 — Business Invariants (Constitutional · Frozen)

**Status:** ENTERPRISE APPROVED  
**Date:** 2026-07-23  
**Authority:** CO-ARCH-003  
**Full constitution:** `docs/architecture/FOUNDATION-PRINCIPLE-DEAL-CENTRIC.md` (F0′)

These invariants bind schema, APIs, dual-write, UI, metrics, and migration design.

---

## BI-1 — Opportunity may have zero Deals

An Opportunity may exist with **zero** Deals.

| Allowed | Forbidden |
|---------|-----------|
| Contact + Opportunity, no lenders | Treating “no Deal” as invalid Opportunity |
| Requirement work without lender cases | Auto-creating a placeholder Deal on Opportunity create |

**Phase 1 implication:** Opportunity Registry create must succeed without any Deal row.

---

## BI-2 — Deal belongs to exactly one Opportunity

A Deal must always belong to **exactly one** valid Opportunity.

| Required | Forbidden |
|----------|-----------|
| Every Deal has one parent Opportunity | Orphan Deals |
| Many Deals under one Opportunity | One Deal spanning multiple Opportunities |

**Phase 2 implication:** `enterprise_deals.opportunity_id` NOT NULL (lending) + FK to `enterprise_opportunities`.

---

## BI-3 — Deal create prerequisites

A Deal cannot exist until **both** are true:

1. A **valid Opportunity** exists.  
2. A **lender** has been identified and assigned.

| Creates | Does not create |
|---------|-----------------|
| Home Loan ₹25L for Contact → **Opportunity** | A Deal |
| Assign HDFC to that Opportunity → **Deal** | A second Opportunity |

**Phase 2 implication:** Deal create API rejects missing `opportunityId` or missing lender/program identity.

---

## BI-4 — Independent lifecycles

Opportunity lifecycle and Deal lifecycle are **independent business models**.

| | Opportunity | Deal |
|--|-------------|------|
| Meaning | Customer **requirement readiness** | **Lender execution** |
| Examples | Raw Lead, Qualified, Documents Received, Ready for Market | Pre Login, Logged In, Soft Approved, Final Approved, Disbursed, Declined, Cancelled, Withdrawn |
| Storage | `requirement_stage` (Opportunity) | Deal pipeline / gross_stage (Deal) |

**Must never:**

- Store lender pipeline statuses on Opportunity  
- Store requirement readiness stages on Deal as if they were the same enum  
- Use one badge/metric for both funnels  
- “Promote” an Opportunity into a Deal by renaming stages  

---

## Traceability

| Invariant | Constitution | Schema review | Blueprint |
|-----------|--------------|---------------|-----------|
| BI-1 … BI-4 | F0′ | Phase 1 schema § Invariants | Blueprint constitutional + DB sections |

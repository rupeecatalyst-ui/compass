# FOUNDATION PRINCIPLE F0′ — OPPORTUNITY-CENTRIC LENDING

**Status:** ENTERPRISE APPROVED · Constitutional · Highest-level domain rule (lending)  
**Effective:** 2026-07-23  
**Authority:** Architecture Review Board · CO-ARCH-003  
**Supersedes:** CO-ARCH-002 / ADR-016 / prior F0 interpretation that treated Opportunity and Deal as the same transactional entity; LoanFile-as-everything spine  

**Related:** `docs/co-arch-003/CO-ARCH-003-IMPLEMENTATION-BLUEPRINT.md` · `docs/co-arch-003/CO-ARCH-003-BUSINESS-INVARIANTS.md` · ADR-016 amendment · `.cursor/rules/deal-centric-enterprise.mdc`

---

## F0′ — Opportunity-Centric Lending Domain

Catalyst One lending is modelled as:

```text
Contact → Opportunity (Lead) → Deal (per lender)
```

### Opportunity (Lead)

An **Opportunity** is one **financial requirement** for a Contact (product + amount + requirement lifecycle).

- Exists **before** any lender is identified.  
- **Lead = Opportunity** (preferred term: Opportunity).  
- Owns: product, amount, requirement stage (Raw Lead → Ready for Market), strategic qualification, readiness.  
- Does **not** own lender pipeline statuses.

Creating a Home Loan requirement creates an **Opportunity**. It does **not** create a Deal.

### Deal (lender execution)

A **Deal** exists **only after** a lender (or lender program) is identified.

- One Opportunity may have many Deals (HDFC, SBI, ICICI, …).  
- Each Deal has its own lender pipeline (Pre Login → Disbursed / Declined / Cancelled / Withdrawn).  
- Deal is the atomic unit of **lender execution**, commission, and bank-specific work.

### Contact

Contact (ECM) remains the party root. One Contact may have many Opportunities.

---

## Business invariants (constitutional — frozen)

These invariants are **non-negotiable** for all CO-ARCH-003 design, schema, APIs, and UI.

### BI-1 — Opportunity may have zero Deals

An Opportunity may exist with **zero** Deals.

A valid Opportunity does not require any lender assignment. Pre-lender work (qualification, documents, readiness) lives entirely on the Opportunity.

### BI-2 — Deal belongs to exactly one Opportunity

A Deal must always belong to **exactly one** valid Opportunity.

No orphan Deals. No Deal shared across Opportunities. Deal → Opportunity cardinality is **N : 1** (many Deals per Opportunity; each Deal has one parent).

### BI-3 — Deal create prerequisites

A Deal cannot exist until **both** of the following are true:

1. A **valid Opportunity** exists.  
2. A **lender has been identified and assigned**.

Creating a financial requirement creates an Opportunity only. Identifying/assigning a lender creates a Deal under that Opportunity.

### BI-4 — Independent lifecycles (no overlap)

Opportunity lifecycle and Deal lifecycle are **independent business models**.

| Model | Owns | Examples | Must not |
|-------|------|----------|----------|
| **Opportunity stages** | Customer **requirement readiness** | Raw Lead, Qualified, Documents Received, Ready for Market | Lender pipeline statuses |
| **Deal stages** | **Lender execution** | Pre Login, Logged In, Soft/Final Approved, Disbursed, Declined, Cancelled, Withdrawn | Requirement readiness stages |

These two status models must **never** overlap or be used interchangeably. Metrics, UI badges, APIs, and CHANAKYA messages must keep them separate.

---

## Core principles

1. Contact is the party root.  
2. Opportunity is the financial-requirement root.  
3. Deal is the lender-execution root.  
4. One Contact → many Opportunities → many Deals per Opportunity (including **zero** Deals — BI-1).  
5. Requirement lifecycle ≠ lender pipeline (BI-4).  
6. Creating a requirement creates an Opportunity, never a Deal (BI-3).  
7. Identifying/assigning a lender creates a Deal under a valid Opportunity (BI-2, BI-3).  
8. Master registries (Contacts, Products, Lenders, Documents) support Opportunities and Deals.  
9. Enterprise intelligence must distinguish **requirement funnel** metrics from **lender funnel** metrics.

---

## Design constraints for agents

1. Do **not** treat Opportunity and Deal as the same entity or alias.  
2. Do **not** create a Deal when creating a Home Loan / product requirement (BI-3).  
3. Do **not** put lender pipeline statuses on Opportunity, or requirement stages on Deal (BI-4).  
4. Do **not** require a Deal for an Opportunity to be valid (BI-1).  
5. Do **not** create a Deal without `opportunity_id` + lender identity (BI-2, BI-3) — enforced in Phase 2+.  
6. Prefer Postgres Opportunity Registry and Deal Registry as SoR — not browser LoanFile.  
7. Align new lending work with **CO-ARCH-003**; CO-ARCH-002 Deal grain is superseded for lending.  
8. Phase gates: Opportunity Registry (Phase 1) before Deal redefinition (Phase 2) before workspace cutover.

---

## Historical note

Prior F0 (“Deal-Centric” with Opportunity as a view of Deal) remains in git history and CO-ARCH-002 wave reports for audit. **Runtime and future design follow F0′ / CO-ARCH-003.**

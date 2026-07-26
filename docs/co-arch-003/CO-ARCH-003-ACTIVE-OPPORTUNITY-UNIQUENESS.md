# CO-ARCH-003 — Active Opportunity Uniqueness (FROZEN)

**Status:** ENTERPRISE FROZEN · **Amended ADR-018 Wave 1 (2026-07-25)**  
**Date:** 2026-07-24  
**Program:** Catalyst One constitutional architecture  
**BAT:** Start Loan Journey conflict prompt + service/DB enforcement certified for review  

---

## Business principle

An Opportunity represents an **ACTIVE customer requirement for a SPECIFIC product**.

Uniqueness is **not** Contact alone.

Uniqueness key:

**Contact + Product + Active Status**

---

## Constitutional rule

At any point in time, one Contact may have **only one ACTIVE Opportunity** for the **same Product**.

### Valid

| Contact | Products (each allowed concurrently) |
|---------|--------------------------------------|
| Neeru Kapoor | Home Loan · Personal Loan · LAP · Mutual Fund |

### Invalid

Two ACTIVE Home Loan Opportunities for the same Contact.

---

## Active status (ADR-018)

Uniqueness applies when `lifecycleStatus ∈ { requirement_captured, active, on_hold }` and not archived/deleted/`closedAt`, and `product_uniqueness_key IS NOT NULL`.

**Draft** Opportunities (identity only) do **not** participate in uniqueness.

Uniqueness is enforced at **Requirement Capture** (Product + Required Amount saved), not at Draft creation.

No longer blocks creation when:

- Converted to Deal (`lifecycleStatus = won` / convert-to-deal API)
- Lost / Cancelled / Closed / archived / soft-deleted
- Still **Draft** (no product key)

---

## Start Loan Journey

**Legacy path (UX until Wave 3):** create with product → uniqueness at create.  
**ADR-018 path:** `createAsDraft: true` → no product → uniqueness deferred to PATCH Requirement Capture.

1. Identify Product (legacy default lending: **Home Loan**; Draft path: none).  
2. Find ACTIVE / Requirement Captured Opportunity for Contact + Product.  
3. **If found** — do not silently create; prompt:
   - **Open Existing Opportunity** (default)
   - **Create New Opportunity (Override)** — Admin/Super Admin + confirmation + reason  
4. **If not found** — create.

---

## Service-layer enforcement

Single validation in `enterpriseOpportunityService.createOpportunity`.

Every path must use this service:

- Start Loan Journey / Contact Workspace  
- `POST /api/enterprise-opportunities`  
- LoanFile dual-write / primary-write  
- Future imports / integrations / jobs  

API conflict code: `ACTIVE_OPPORTUNITY_EXISTS` (HTTP 409) with existing Opportunity payload.

Override body: `allowActiveDuplicateOverride: true` + `overrideReason` (≥ 8 chars).

---

## Database safeguard

Column: `product_uniqueness_key` (normalized).

Partial unique index `eopp_active_contact_product_uidx` on  
`(organization_id, primary_contact_id, product_uniqueness_key)`  
WHERE `lifecycle_status IN ('requirement_captured','active','on_hold')` and key is not null.

Historical Opportunities remain allowed after the previous row leaves the active set.

Migrations:
- `prisma/migrations/20260724200000_co_arch_003_active_opportunity_uniqueness`
- `prisma/migrations/20260725010000_adr_018_w1_opportunity_lifecycle` (ADR-018 Wave 1)

---

## Related

- Cursor rule: `.cursor/rules/opportunity-active-uniqueness.mdc`
- Constants: `src/constants/opportunity-active-uniqueness.ts`, `src/constants/opportunity-lifecycle.ts`
- Wave 1 report: `docs/co-arch-003/CO-ARCH-ADR-018-WAVE1-PERSISTENCE.md`
- Start Loan Journey: `src/lib/enterprise-opportunity/start-opportunity-from-contact.ts`

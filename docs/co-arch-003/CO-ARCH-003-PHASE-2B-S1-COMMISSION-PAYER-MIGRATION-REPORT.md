# CO-ARCH-003 Phase 2B Sprint 1 — Commission Payer Migration Report

**Date:** 2026-07-24  
**Migration:** `20260724020000_co_arch_003_p2b_s1_deal_commission_payee`  
**Status:** APPLIED — Database schema up to date  
**Scope:** Schema only (Accounting Payee Master + Deal Commission Payer relationship)  
**Stopped:** No further Phase 2B feature work in this cut — awaiting Business Review

---

## Migration summary

Non-destructive additive migration. No tables dropped, no columns dropped, no truncates, no row deletes. Phase 2A Opportunity–Deal–Contact architecture unchanged (cardinalities and existing FKs preserved).

Invoice generation, accounting postings, and payout calculations were **not** included.

---

## New tables created

| Table | Purpose |
|-------|---------|
| `enterprise_accounting_payees` | **Accounting Payee Master** — commercial invoice / commission payee party registry |

### Master columns

| Column | Notes |
|--------|-------|
| `id` | PK |
| `organization_id` | FK → `organizations` |
| `payee_type` | customer / lender / builder / channel_partner / chartered_accountant / direct_corporate / other |
| `display_name` | Operator-facing name |
| `specify` | Free text when type = other |
| `contact_id` | Optional FK → `ecm_contacts` (Enterprise Contact Registry) |
| `notes`, `enabled`, audit / soft-delete | Standard enterprise pattern |

---

## Existing tables modified

| Table | Columns added |
|-------|----------------|
| `enterprise_deals` | `commission_payee_type` |
| | `commission_payee_specify` |
| | `commission_payee_contact_id` (direct ECM link) |
| | `commission_accounting_payee_id` (link to Accounting Payee Master) |

---

## Foreign keys added

| Constraint | From → To |
|------------|-----------|
| `enterprise_accounting_payees_organization_id_fkey` | Payee Master → `organizations` |
| `enterprise_accounting_payees_contact_id_fkey` | Payee Master → `ecm_contacts` |
| `enterprise_deals_commission_payee_contact_id_fkey` | Deal → `ecm_contacts` |
| `enterprise_deals_commission_accounting_payee_id_fkey` | Deal → `enterprise_accounting_payees` |

All `ON DELETE RESTRICT`.

---

## Indexes and constraints added

| Name | Definition |
|------|------------|
| `eapayee_org_type_idx` | `(organization_id, is_deleted, payee_type)` |
| `eapayee_org_contact_idx` | `(organization_id, contact_id)` |
| `eapayee_org_updated_idx` | `(organization_id, updated_at DESC)` |
| `edeal_org_commission_payee_contact_idx` | `(organization_id, commission_payee_contact_id)` |
| `edeal_org_commission_accounting_payee_idx` | `(organization_id, commission_accounting_payee_id)` |
| PK | `enterprise_accounting_payees_pkey` |

---

## Validation report

| Check | Result |
|-------|--------|
| Destructive SQL (`DROP TABLE` / `TRUNCATE` / `DELETE` / `DROP COLUMN`) | None |
| `prisma migrate deploy` | Success |
| `prisma migrate status` | Database schema is up to date |
| Phase 2A Opp/Deal/Contact FKs | Untouched |
| Invoice / posting / payout schema | Not created (by design) |

---

## Warnings encountered

- Prisma deprecation warning for `package.json#prisma` (unrelated to this migration).

---

## Relationship diagram (this cut)

```text
ecm_contacts
    ↑ optional
enterprise_accounting_payees   ← Accounting Payee Master
    ↑ optional
enterprise_deals.commission_accounting_payee_id

enterprise_deals.commission_payee_contact_id → ecm_contacts  (direct optional link)
```

---

## Next step

Await **Business Review** before continuing Phase 2B Sprint 1 application/API/UI work or Sprint 2.

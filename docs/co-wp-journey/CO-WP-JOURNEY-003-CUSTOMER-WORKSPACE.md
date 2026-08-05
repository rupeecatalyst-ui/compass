# CO-WP-JOURNEY-003 — Enterprise Customer Workspace

**Status:** Implementation complete (local) · Await Product Owner BAT  
**Date:** 2026-08-02  
**Deploy:** **None**

## Freeze notice

- **CO-WP-JOURNEY-001** (Opportunity Creation) — CERTIFIED · FROZEN — not modified  
- **CO-WP-JOURNEY-002** (Opportunity Workspace) — CERTIFIED · FROZEN — not modified  

---

## Objective

Customer Workspace = permanent mobile view of the Enterprise Customer Registry relationship (multiple opportunities / products / relationships).

Companion renders Partner Customer DTOs only.

---

## Delivered

### Catalyst One

- `GET /api/partner/customers` — directory  
- `GET /api/partner/customers/:customerId` — workspace aggregate  
- Types: `src/types/enterprise-partner-customer-workspace.ts`  
- Placeholder projection from Partner Business store (Registry cutover later)

### Wealth Partner (0.7.0)

- `/app/customers` — directory  
- `/app/customers/:customerId` — workspace shell + tabs  
  Overview · Opportunities · Participants · Documents · Activities · Communication · Notes · History  
- Sticky Customer Workspace header  
- Opportunity rows open certified Opportunity Workspace  
- Business Home entry card to Customers  
- Communication reserved (no messaging logic)

---

## Non-negotiable held

- No edits to frozen Creation / Opportunity Workspace screens  
- No Document Workspace / Activity Workspace programmes  
- No companion business logic  
- **No deployment**

Await Product Owner BAT.

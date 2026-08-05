# CO-BUG-TASK-ENTITY-LINK — Task “Link To” Registry Lookups

**Module:** Enterprise Tasks  
**Priority:** CRITICAL  
**Date:** 2026-08-04  
**Data protection:** No enterprise data modified / recreated / destroyed

---

## Problem

Create Task showed Contact / Opportunity / Deal options, but after selection there was no working registry lookup (Deal search also lacked API `q` wiring). Tasks could not be linked to Enterprise entity IDs.

---

## Fix

| Link To | SSOT | Search |
|---------|------|--------|
| Contact | Enterprise Contact Registry via `LiveEntityMasterSearch` | Name, mobile, email, ID |
| Opportunity | Enterprise Opportunity Registry API | Customer, OPP number, mobile, product, RM |
| Deal | Enterprise Deal Registry API (`q` param) | Deal number, customer, product, lender, RM |

Selection stores **Entity ID** plus snapshot fields (customer, product, lender, RM). Free-text linking is blocked when the picker is shown.

New component: `src/components/catalyst-one/tasks/task-entity-link-picker.tsx`

---

## Confirmation

All three lookups consume their Enterprise Registry SSOTs. No duplicate entity creation.

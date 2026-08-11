# CO-CONTACT-REGION-001 — Validation Report

**Date:** 2026-08-07  
**Verify:** `npm run verify:co-contact-region-001`  
**Deploy:** ❌ Deferred — Product Owner approval required  

---

## Screens / surfaces updated

| Surface | Change |
|---------|--------|
| Contact Role Workspace (Banker) | Region restored after Institution; cascade reconnected |
| Banker shared selects | Region/City gates; coverage cities region-filtered |
| ELD employee slide-over | Institution change also clears Region (cascade parity) |
| Banker role template | Field order + mandatory Region + correct parents/copy |

**Not redesigned:** Contact module shell, navigation, ECM identity model.  
**Not changed:** Enterprise Lender Registry schema / APIs / SSOT ownership.

---

## Hierarchy validation matrix

| Check | Result |
|-------|--------|
| Institution → Region → City → Branch order in MIR | ✅ |
| Region mandatory | ✅ |
| City parent = Region | ✅ |
| Branch parent = City | ✅ |
| `regionId` passed to City/Branch in Contact Workspace | ✅ |
| Cascade clear Institution → Region/City/Branch | ✅ |
| Cascade clear Region → City/Branch | ✅ |
| Cascade clear City → Branch | ✅ |
| City blocked until Region | ✅ (`Select Region first`) |
| Branch blocked until City | ✅ (`Select City first`) |
| ELD employee Region wiring | ✅ (pre-existing + region clear on institution) |
| Enterprise Lender Registry integration (Institution UUID) | ✅ unchanged CO-BUG-005 path |
| Opportunity Workspace banker org editor | N/A — OW LIFE selects institutions for product fit; does **not** author Banker org placement. Banker hierarchy remains Contact / ELD. |
| Contact Module (non-Banker roles) | ✅ untouched (Customer/Partner city remain independent) |

---

## Related verifies

| Script | Purpose |
|--------|---------|
| `verify:co-contact-region-001` | This fix |
| `verify:co-master-region-001` | Region Master + Contact wiring gate (extended) |
| `verify:co-bug-005` | Institution ↔ Lender Registry + hierarchy copy |

---

## Residual / out of scope

- Opportunity Workspace LIFE “Select Institution” is a strategy matching surface, not Contact Banker org placement — do not conflate.  
- Live BAT of Contact create/edit Banker MIR remains for Product Owner.  
- No production deployment until PO approval.

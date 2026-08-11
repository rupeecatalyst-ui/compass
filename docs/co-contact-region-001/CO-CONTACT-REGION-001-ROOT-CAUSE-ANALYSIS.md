# CO-CONTACT-REGION-001 — Root Cause Analysis

**Date:** 2026-08-07  
**Severity:** P0 — breaks frozen Enterprise Lender hierarchy  
**Scope:** Contact Role Workspace (Banker / `lender_employee`)  
**Non-goals:** No Contact module redesign · no Enterprise Lender Registry schema/API change · no deploy  

---

## Expected (frozen)

```text
Institution → Region → City → Branch
```

- Region is **mandatory** in the lender organizational hierarchy.  
- City is always filtered by Region.  
- Branch is always filtered by City (and Region / Institution).  

SSOT references:

- `src/lib/enterprise-contact-master/banker-hierarchy.ts`  
- CO-MASTER-REGION-001 (Enterprise Region Master)  
- ELD employee slide-over (already correctly wired)

---

## Observed

Contact Role Workspace rendered:

```text
Institution → City → Branch
```

Region selector appeared missing from the MIR path (or effectively unusable).

---

## Root cause (two defects, same surface)

### 1. Role template demoted Region

In `src/constants/enterprise-contact-master/role-templates.ts` (`lender_employee`):

| Field | Before fix |
|-------|------------|
| Institution | sortOrder 1 · mandatory |
| City | sortOrder 2 · parent = institution |
| Branch | sortOrder 3 · parent = institution |
| … | designation / products / mobile / RM / email |
| Region | sortOrder **11** · **optional** |

Help copy incorrectly advertised: `Institution → City → Branch`.

Region was therefore not in the MIR field order immediately after Institution, and was not required for MIR complete.

### 2. Contact Role Workspace never passed `regionId`

`RoleFieldControl` in `contact-workspace-modal.tsx` wired:

- `BankerCitySelect` with `institutionId` only  
- `BankerBranchSelect` with `institutionId` + `cityId` only  

Shared selects already gated City/Branch on Region (`Select Region first`), so even if Region existed late in optional fields, City/Branch did not receive the selected Region — cascade was disconnected.

### Contributing behaviour

- Institution change cleared Region/City/Branch, but Region/City changes did not fully cascade Branch.  
- Banker defaults could auto-fill City from Contact geo, bypassing Region.  
- Lender `coverageCities` path did not filter by Region when master metadata allowed.

---

## Why ELD looked correct

`eld-employee-slide-over.tsx` already rendered Region after Institution and passed `regionId` into City/Branch. Defect was **Contact Role Workspace wiring + template order**, not Enterprise Lender Registry itself.

---

## Fix summary

1. Restore Region as mandatory MIR field immediately after Institution.  
2. Parent keys: Region ← Institution · City ← Region · Branch ← City.  
3. Pass `institutionId` + `regionId` into Banker City/Branch controls.  
4. Explicit cascade clears on Institution / Region / City change.  
5. Stop auto-filling Banker City from Contact geo.  
6. Filter coverage cities by Region when master metadata allows.  
7. Gate Branch UI until City is selected.  
8. Align ELD institution transfer to clear Region as well.  

**No** Lender Registry model change. **No** Contact module redesign.

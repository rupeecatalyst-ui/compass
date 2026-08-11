# CO-LENDER-WORKSPACE-001 — Final Operational Fix Report

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Scope:** Functional repair only — no redesign, no new registries, no scoring/routing changes  
**Date:** 2026-08-08

---

## Root cause

Handlers for **Create Employee**, **Assign Existing Employee**, and **Close** were already wired to ECM persistence and `useWorkspaceClose`.

Production failure was a **nested Radix stacking / modal-lock defect**:

| Layer | z-index |
|-------|---------|
| Lender Workspace `SheetContent` | `z-[95]` |
| Default `Dialog` overlay + content | `z-50` |

Clicking Create / Assign set `panelOpen = true` and mounted a Dialog **behind** the Sheet. Radix modal Dialog then applied pointer/focus lock outside the Dialog — which included the visible Sheet. Result:

- Buttons looked clickable but “did nothing”
- Dialog state was open but invisible
- Close / sheet interactions could feel frozen after a Hierarchy action click
- `UnsavedChangesDialog` (also `z-50`) could open behind the Sheet when employee edit was dirty

This was **not** missing `onClick`, RBAC disablement, or mock persistence.

---

## Fix (surgical)

1. **Elevate Hierarchy dialogs** to `z-[110]` (content + overlay paired) above the Lender Sheet.
2. **`DialogContent.overlayClassName`** so nested dialogs can raise the overlay with the content.
3. **Elevate `UnsavedChangesDialog`** when opened from Lender Workspace.
4. **Sheet overlay** raised to `z-[94]` (content remains `z-[95]`); Employee nested sheet to `z-[100]` / overlay `z-[99]`.
5. **Assign** uses canonical **`LiveEntityMasterSearch`** (Enterprise Contact Registry live search) instead of an ad-hoc list.
6. **Escape** disabled on parent workspace while Hierarchy Create/Assign/RM dialogs are open.
7. **Duplicate association guard** in `assignExistingContactToInstitution`.
8. Close remains single hit-target: `hideCloseButton` + header X / Save & Exit → `useWorkspaceClose.requestClose` (with stopPropagation).

---

## Persistence path (unchanged SSOT)

```
Create Employee
  → createLenderEmployeeForInstitution
  → persistRegisterEcmContact (/api/ecm/contacts)
  → role lender_employee + roleProfiles.lender_employee.institution = lenderId
  → optional setBankerReportingManager (reports_to)
  → onChanged → reloadToken → loadEldLenderEmployeeContacts → filterEmployeesForInstitution
  → composeEldLenderHierarchyForest (no page reload)

Assign Existing Employee
  → LiveEntityMasterSearch (liveSearchOperationalContacts → session cache sync)
  → assignExistingContactToInstitution
  → persistUpdateEcmContact (roles + institution mapping)
  → duplicate blocked if already lender_employee at same institution
  → same refresh path

Close / X
  → useWorkspaceClose.requestClose
  → dismissWorkspace → onOpenChange(false)
  → Directory remains mounted; no reload
```

---

## Files changed

| File | Change |
|------|--------|
| `src/components/ui/dialog.tsx` | `overlayClassName` on `DialogContent` |
| `src/components/catalyst-one/shared/unsaved-changes-dialog.tsx` | Forward elevation classes |
| `src/components/catalyst-one/enterprise-lender-workspace/eld-hierarchy-chart.tsx` | z-[110] dialogs · LiveEntityMasterSearch · nested-open notify |
| `src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx` | Escape gate · overlay z · Unsaved elevate · wire nested notify · Close stopPropagation |
| `src/components/catalyst-one/enterprise-lender-directory/eld-employee-slide-over.tsx` | Nested sheet stacking above lender sheet |
| `src/lib/enterprise-lender-directory/hierarchy-actions.ts` | Duplicate lender-employee association guard |
| `scripts/co-lender-workspace-001-verify.mjs` | Static wiring verification |

---

## Verification performed

| Check | Result |
|-------|--------|
| `node scripts/co-lender-workspace-001-verify.mjs` | **PASS** |
| TypeScript (`tsc --noEmit`) | **PASS** (exit 0) |
| Lint on touched files | **PASS** (no diagnostics) |
| Architecture | No new employee registry · no localStorage SSOT · no routing change · no UI redesign |

### Manual BAT (Product Owner)

From Lender Directory:

1. Open a lender → Hierarchy  
2. **Assign Existing Employee** → search/select ECM contact → Save → appears in hierarchy  
3. Close (X) → reopen same lender → employee still present  
4. **Create Employee** → name/mobile (+ designation/region/city/branch as applicable) → Save → appears  
5. Close → reopen → still persisted  
6. Confirm X / Escape / unsaved guard (when employee edit dirty)  

Do **not** treat “button renders” or “modal opens” alone as pass — persisted reopen is required.

---

## Deployment

| Field | Value |
|-------|--------|
| Status | Ready (Production) |
| Deployment ID | `dpl_GVKHVcsWFGxC3YFucgP73M7cMvm9` |
| Unique URL | https://catalyst-avvh1psrp-rupee-catalyst.vercel.app |
| Production alias | https://catalyst-one-two.vercel.app |
| Lenders desk | https://catalyst-one-two.vercel.app/lenders |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/GVKHVcsWFGxC3YFucgP73M7cMvm9 |

---

## STOP

Await Product Owner confirmation after live BAT.

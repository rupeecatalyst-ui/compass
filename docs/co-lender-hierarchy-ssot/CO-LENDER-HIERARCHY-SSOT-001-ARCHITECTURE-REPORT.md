# CO-LENDER-HIERARCHY-SSOT-001 — Architecture Verification Report

**Status:** Investigation Complete · Awaiting Product Owner BAT  
**Priority:** P0 (Enterprise Functional Gap)  
**Date:** 2026-08-05  
**Scope:** Architecture & persistence verification only — **no code changes · no data migration · no deploy**

---

## Executive verdict

Creating lender employees for **Piramal Finance** is designed to persist into the **Enterprise Contact Registry (ECM)** as contacts with role `lender_employee`.

The **Lender Workspace → Hierarchy** tab does **not** read that registry. It renders a **hardcoded rank ladder** filled from **browser localStorage** (plus optional demo seed). Under prisma mode, demo seed is off → ranks appear **Vacant** even when ECM employees exist.

Card actions fail by design: **Open Contact** is an empty stub; **Assign Contact** writes localStorage only; ELD wires `onChanged={() => undefined}` so Assign cannot refresh the panel.

**Root cause:** Hierarchy is a parallel placeholder implementation — not a projection of the Enterprise Lender Employee (ECM) registry.

---

## Registry owner

| Concern | Canonical owner | Notes |
|---------|-----------------|-------|
| Institution | **Enterprise Lender Registry** | `EnterpriseLender` / `enterprise_lenders` |
| Lender employee (person + employment) | **Enterprise Contact Registry (ECM)** | Role `lender_employee` on `EcmContact` |
| Reporting manager chain | **ECM Contact Relationships** | Type `reports_to` |
| Org placement (branch / region / city / designation) | ECM `roleProfiles.lender_employee` | Not a separate employee table |
| ELR institution CRM contacts | `EnterpriseLenderContact` | **Parallel** list — not the employee desk SSOT |

There is **no** separate Prisma table named “Enterprise Lender Employee Registry.”  
**ECM Contact + role `lender_employee` + institution FK is the employee registry.**

---

## Database entity

| Entity | Table | Role |
|--------|-------|------|
| `EcmContact` | `ecm_contacts` | Employee identity + `roleProfiles.lender_employee` |
| `EcmContactRelationship` | (relationships table) | `reports_to` reporting SSOT |
| `EnterpriseLender` | `enterprise_lenders` | Institution link target (`profile.institution` = lender `id`) |
| `EnterpriseLenderContact` | `enterprise_lender_contacts` | Lender-registry contacts (not Hierarchy SSOT) |

Local hierarchy store (non-enterprise):

| Store | Key |
|-------|-----|
| Browser localStorage | `catalyst.elw.hierarchy-assignments.v1` (`ELW_HIERARCHY_STORAGE_KEY`) |

---

## Direct answers (1–11)

| # | Question | Answer |
|---|----------|--------|
| **1** | Which registry owns lender employees? | **ECM Contact Registry** (role `lender_employee`); institution → ELR |
| **2** | Which DB entity/table? | `EcmContact` / `ecm_contacts` (+ `EcmContactRelationship` for RM) |
| **3** | Does employee creation persist? | **Yes** via Contact create / `saveEldLenderEmployeeEmployment` → `/api/ecm/contacts` when prisma mode |
| **4** | Save transaction committed? | Contact PATCH is one API write; reporting manager + field audits are **separate** calls — not one atomic DB transaction |
| **5** | Which API returns lender employees? | `GET /api/ecm/contacts?roles=lender_employee` (via `ecmApiClient.queryContacts` / `loadEldLenderEmployeeContacts`) |
| **6** | Which API does Hierarchy tab use? | **None** — `deriveElwHierarchy(lenderId)` reads localStorage only |
| **7** | Does Hierarchy read Employee Registry? | **No** |
| **8** | Placeholder data still used? | **Yes** — hardcoded `ELW_HIERARCHY_RANKS` + localStorage + demo seed (off under prisma) |
| **9** | Duplicate implementations? | **Yes** — ECM employees, ELR contacts, ELW localStorage hierarchy, employee-desk ECM chain |
| **10** | Orphaned employees? | Possible if `institution` blank/mismatched — Hierarchy still would not show them even when linked correctly |
| **11** | Links (lender / contact / RM / designation / branch / region)? | Designed on ECM profile + `reports_to`; Hierarchy tab **ignores** all of these |

---

## Two different “Hierarchy” surfaces (critical)

| Surface | Location | Data source | Shows Piramal employees? |
|---------|----------|-------------|--------------------------|
| **Lender Workspace → Hierarchy** | `eld-slide-over.tsx` | `deriveElwHierarchy` → localStorage + hardcoded ranks | **No** (Vacant) |
| **Lender Employee Workspace → Hierarchy** | `eld-employee-slide-over.tsx` | `buildEcmBankerReportingChain` / `reports_to` | Chain only if RM links exist; **not** the vacant rank chart |

PO observation matches **Lender Workspace Hierarchy tab**, not the employee-desk reporting chain.

---

## API / save / read flows

### Save flow (employee)

```
Contact Workspace / ELD Employee Slide-Over / Lender Sales Contact
  → persistRegisterEcmContact / persistUpdateEcmContact
     or saveEldLenderEmployeeEmployment
  → POST/PATCH /api/ecm/contacts
  → ecmContactService → Prisma EcmContact
  → roleProfiles.lender_employee.institution = EnterpriseLender.id
  → optional setBankerReportingManager → reports_to relationship
```

### Read flow (Lender Employees registry tab) — correct SSOT

```
EldLenderEmployeesPanel
  → loadEldLenderEmployeeContacts()  // GET /api/ecm/contacts roles=lender_employee
  → composeEldLenderEmployeeRows(+ ELR + Deal metrics)
```

### Read flow (Lender Workspace Hierarchy) — wrong SSOT

```
eld-slide-over.tsx (tab=hierarchy)
  → deriveElwHierarchy(lenderId)
       · localStorage assignments for lenderId
       · merge demo seed (empty when prisma)
       · map fixed ELW_HIERARCHY_RANKS → person | null
  → ElwHierarchyChart
       · null → "Vacant"
       · Open Contact → empty stub
       · Assign Contact → write localStorage (not ECM)
  → onChanged={() => undefined}  // no refresh
```

---

## Tab-by-tab SSOT audit

### A) Lender Workspace slide-over (`ELD_WORKSPACE_TABS`)

| Tab | Consumes | Same employee registry? |
|-----|----------|-------------------------|
| Executive Summary | Directory row metrics (Deal/program projections) | N/A (lender-level) |
| Product Programmes | ELR programs API | N/A |
| **Hierarchy** | **localStorage placeholder** | **No** |
| Contacts | **Mixed:** ELR `listContacts` + in-memory `listEcmBankersForInstitution` after hydrate | Partial / fragile (not the same load path as Employees panel) |
| Performance | Placeholder copy | No live compose |
| Opportunities | Placeholder + directory count | Partial |
| Documents | ELR documents API | N/A |
| Chanakya Insights | Placeholder / advisory | N/A |

### B) Lender Employee Workspace sections (`ELD_EMPLOYEE_WORKSPACE_SECTIONS`)

| Section | Consumes | Same registry? |
|---------|----------|----------------|
| Profile | ECM contact + banker profile | **Yes** |
| Products | ECM `productsHandled` + Product Master | **Yes** |
| Performance | Deal Registry projection by sales contact id | Compose layer (not separate store) |
| Hierarchy | ECM `reports_to` chain | **Yes** (different UX than vacant ranks) |
| Current Pipeline | Deal Registry linked to contact | Compose layer |
| Communication | Contact phone/email/WhatsApp; Meeting History = Future | ECM fields only |

**Conclusion:** Tabs do **not** all share one projection. Hierarchy on the **lender** desk is a second store. Performance / Opportunities / Communication still have placeholder gaps.

---

## Expected vs actual architecture

**Expected (PO):**

```
Enterprise Lender Registry
        │
        ▼
Enterprise Lender Employee Registry (ECM lender_employee)
        │
        ├── Profile · Products · Performance
        ├── Hierarchy · Pipeline · Communication
```

**Actual:**

```
ELR ─────────────────────────────────────────────► Products / Documents / ELR Contacts
        │
        ▼
ECM lender_employee ──► Employees tab · Employee Profile/Products/Pipeline/RM chain
        │
        ✗
ELW localStorage ranks ──► Lender Workspace Hierarchy tab (Vacant)
```

---

## Why Hierarchy shows Vacant / clicks do nothing

1. **Vacant:** Hierarchy never queries ECM by `institution`; prisma demo seed off → empty ranks.  
2. **Open Contact:** Explicit stub — `/* Phase 1 — contact desk wiring */`.  
3. **Assign Contact:** Creates a **synthetic** `contactId` in localStorage — does not create ECM.  
4. **onChanged noop** in ELD slide-over: even local Assign would not re-render Hierarchy.  
5. Employees may still appear on **Lender Employees** / **Contacts** (if hydrate/API succeeds) while Hierarchy stays vacant — confirms disconnect, not failed save.

---

## Registry relationships (designed)

| Link | Mechanism | Hierarchy tab uses it? |
|------|-----------|------------------------|
| Employee → Enterprise Lender | `roleProfiles.lender_employee.institution` = ELR `id` | No |
| Employee → Contact identity | `EcmContact` itself | No |
| Reporting Manager | `EcmContactRelationship` `reports_to` (+ profile cache) | No (employee desk Hierarchy yes) |
| Designation / Branch / Region / City | ECM master IDs on banker profile | No |

---

## Placeholder / duplicate implementations

| Implementation | Production SSOT? |
|----------------|------------------|
| ECM `lender_employee` | **Yes** — employee SSOT |
| ECM `reports_to` | **Yes** — reporting SSOT |
| ELR `EnterpriseLenderContact` | Parallel CRM contacts |
| ELW localStorage hierarchy | **No** — placeholder |
| Hardcoded `ELW_HIERARCHY_RANKS` (VP→NH→RH→SH→CH→RM) | Placeholder model (contradicts ECM “levels never hardcoded”) |
| Demo seed people (Meera, Sanjay, …) | Dev-only; off under prisma |
| Performance / Opportunities / Meeting History placeholders | Incomplete |

---

## Root cause

**Single sentence:** Lender Workspace Hierarchy is a Soft Go-Live / UI architecture chart backed by localStorage and fixed ranks; it is disconnected from the ECM Lender Employee registry that actually persists saved employees.

Employee save is not the primary failure mode for this symptom. Consumption is.

---

## Recommended remediation (do **not** implement until PO authorises)

1. **Retire** `deriveElwHierarchy` / localStorage assignments for production Lender Workspace Hierarchy.  
2. **Project Hierarchy from ECM** for open `lenderId`: `listEcmBankersForInstitution` (API-backed, same as `loadEldLenderEmployeeContacts`) + `reports_to` / designation.  
3. Align model with ECM constitution: **emerging** reporting chain — do not hardcode mandatory vacant ranks unless PO explicitly certifies a fixed ladder as UX-only vacancies.  
4. Wire occupied actions: Open Employee Workspace · View Profile · Edit Assignment · Change RM · Performance · Pipeline · Communication.  
5. Wire vacant actions: Assign / Create Employee → **ECM** create/link (not localStorage).  
6. Replace `onChanged={() => undefined}` with recompose from ECM.  
7. Unify Contacts tab load path with Employees panel (API-first ECM), stop dual Soft Go-Live reliance.  
8. Complete Performance / Pipeline / Communication as **projections** of Deal + ECM — no new stores.  
9. Do **not** dual-write employees into `EnterpriseLenderContact` unless PO merges registries.

### BAT confirmation (no code)

1. Open **Lender Employees** for Piramal — expect the two saved bankers (ECM).  
2. Open lender **Hierarchy** — expect Vacant under current architecture (proves disconnect).  
3. Optional DB: `ecm_contacts` with `lender_employee` and `institution` = Piramal’s `enterprise_lenders.id`.  
4. Confirm Local Storage key `catalyst.elw.hierarchy-assignments.v1` is unrelated to ECM.

---

## Report package

| Field | Value |
|-------|-------|
| Registry Owner | ECM Contact Registry (`lender_employee`) + ELR for institution |
| Database Entity | `EcmContact` / `ecm_contacts` (+ `EcmContactRelationship`) |
| API Flow | Employees: `/api/ecm/contacts` · Hierarchy tab: **none** |
| Save Flow | ECM persist APIs (committed per contact write) |
| Read Flow | Employees panel = ECM API · Hierarchy = localStorage |
| Relationships | Designed on ECM; Hierarchy ignores them |
| Placeholders | Hardcoded ranks + localStorage + stub actions |
| Root Cause | Hierarchy not consuming Employee Registry |
| Recommended Remediation | Make Hierarchy an ECM projection; retire localStorage |

---

## Stop

Investigation only. **No code modified. No data migrated. No deploy.**  
Await Product Owner BAT / remediation approval.

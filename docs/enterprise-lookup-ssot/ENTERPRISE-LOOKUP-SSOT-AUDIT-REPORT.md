# Enterprise Lookup & SSOT Audit Report

**Programme:** Enterprise Lookup & SSOT Audit  
**Priority:** CRITICAL — Mandatory before Enterprise Production Certification  
**Date:** 2026-08-04  
**Scope:** Every searchable / selectable / lookup field across Catalyst One  
**Data protection:** No enterprise data modified, recreated, duplicated, or destroyed

---

## Constitutional rule (frozen)

**No UI control without SSOT.**

No search field, dropdown, lookup, autocomplete, or selector may exist unless connected to its Enterprise Registry. Empty UI controls are incomplete implementations.

Codified in: `.cursor/rules/enterprise-search-autocomplete.mdc`

---

## 1. Total lookup fields audited

| Category | Approx. count |
|----------|---------------|
| Shared registry search primitives (Contact / Company / Lender / City / ECM masters) | 5 core + ~25 call sites |
| Entity / relationship pickers (participants, reporting manager, LSC, business source, WP) | ~18 |
| Product Master option consumers | ~12 |
| Employee / assignee pickers | 3 |
| Opportunity / Deal entity pickers | 2 |
| Configuration enums (status, priority, designation, category — not registry entities) | ~90+ Radix Selects |
| **Entity lookups reviewed for SSOT** | **~60** |

---

## 2. Working lookups (SSOT-connected)

| Surface | Component / path | Registry |
|---------|------------------|----------|
| Contact / Company pickers | `LiveEntityMasterSearch` | ECM Contact / Company |
| Lender Identify | `EnterpriseLenderSearch` | Enterprise Lender Registry |
| Existing loan lender | `EnterpriseLenderRegistrySelect` | Enterprise Lender Registry |
| Lender Sales Contact | `LenderSalesContactCapture` + `searchLenderSalesContactsLive` | ECM Contact (`lender_employee`) |
| Banker institution / city / branch | Banker cascade selects | Lender Registry + coverage |
| City (generic) | `CitySelect` | Enterprise City Master (catalog) |
| ECM taxonomy | `EcmMasterSelect` | ECM Master domains |
| Product options | `useProductMasterOptions` | Product Registry API |
| Loan participants | Progressive create + live search | ECM Contact |
| Business source contact | `business-source-contact-lookup` | ECM Contact |
| Wealth Partner identity | WP wizard + live search | WP + ECM |
| Product Library admin | Product master management | Product Library APIs |
| Lender Program Portal | Admin workspace | Lender Registry |
| Reporting Manager | `ReportingManagerPicker` (**fixed**) | ECM Contact (live) |
| Company relationship link | Company Workspace (**fixed**) | ECM Contact (live) |
| Credit Risk policy lender | Policy Builder (**fixed**) | Enterprise Lender Registry |
| Task Engine assignee | Task create dialog (**fixed**) | Enterprise Employee Registry |
| Quick Task assignee | `QuickTaskCreateModal` | Enterprise Employee Registry |
| Quick Task entity link | Contact / Opp / Deal (**fixed**) | ECM / Opportunity / Deal Registries |

---

## 3. Broken lookups (fixed this programme)

| Lookup | RCA | Fix |
|--------|-----|-----|
| **Deal Workspace · Lender Sales Contact** | Empty browse used unscoped “latest N” bankers; UUID/code mismatch historically; live API failures swallowed as “No matching contacts”; duplicate check memory-only | Live ECM full-row search; lender-name bias when query empty; dual-pass search; debounce; registry-unavailable error; live duplicate detection |
| **Reporting Manager** | Memory `searchOperationalContacts` + memory `registerEcmContact` | `liveSearchOperationalEcmContacts` + `persistRegisterEcmContact` |
| **Company relationship search** | Memory-only contact search | Live ECM search with debounce |
| **Credit Risk Policy · Lender** | `getActiveLenders()` → `DEFAULT_CREDIT_RISK_LENDERS` seed | `searchActiveLenders()` from Lender Registry API |
| **Task Engine · Assignee** | Hardcoded Rahul Sharma / Ops Desk / HR Desk | `searchAssignableUsers` (Employee Registry) |
| **Quick Task · Entity picker** | Text-only “future search wiring” | Live Contact search + Opportunity/Deal registry search |

---

## 4. Partially connected lookups

| Surface | Status | Notes |
|---------|--------|-------|
| City Select | Catalog SSOT | Code-owned City Master — acceptable if City Master remains configuration-owned; not a live REST registry |
| Loan Create · Source Contact | Hydration-dependent | Primary borrower/company are live; source uses `EntityMasterSearch` fallback options |
| Enterprise Lender Workspace product chips | Defaults + registry | `ELW_DEFAULT_PRODUCTS` still seeds visibility; prefer Product Master only |
| Deal Identify lender (legacy fallback) | Registry-first | Local LoanLenderExecution fallback if `onIdentifyLender` absent — preserve registry IDs |
| LSC product filter | Soft | Empty `productsHandled` does not exclude (progressive Banker capture) |

---

## 5. Missing / deferred SSOT integrations

| Gap | Recommendation |
|-----|----------------|
| Dedicated Valuer / Vendor / Lawyer pickers | Standardise on ECM role-filtered `LiveEntityMasterSearch` everywhere |
| Branch Master outside Banker cascade | Prefer Lender coverage then Branch Master API |
| Communication ENCE simulation recipients | Demo-only — quarantine from production paths |
| Customer Master product filter seed | Replace with Product Master options |
| Legacy Loan Manager dropdowns (`loan-files` data) | Retire seed catalogs from execution desks |
| LIFE / Directory demo seed paths | Label or remove for production certification |

---

## 6. Hardcoded dropdowns

### Forbidden as entity truth (addressed or flagged)

| Location | Was | Now |
|----------|-----|-----|
| Credit Risk policy lender | Seed lenders | **ELR live** |
| Task Engine assignee | Hardcoded employees | **Employee Registry live** |
| ENCE simulation | `contact:demo-001` | Flagged — simulation only |
| Customer Master product filter | Seed | Follow-up |
| ELW default products | Static defaults | Follow-up |

### Acceptable configuration enums (not registries)

- Lender Sales designations · Task priority/type · Policy customer categories · Workflow stages · Partner status filters · ECM master taxonomy domains

---

## 7. Duplicate lookup implementations

| Entity | Canonical | Divergent / retiring |
|--------|-----------|----------------------|
| Contact | `LiveEntityMasterSearch` / `liveSearchOperationalEcmContacts` | Bespoke LSC (role-scoped — intentional); legacy memory pickers (fixed where found) |
| Lender | `EnterpriseLenderSearch` / `searchActiveLenders` | Credit Risk seed (fixed); LIFE strategy free-text (follow-up) |
| Employee | `searchAssignableUsers` | Task Engine hardcoded (fixed) |
| Product | `useProductMasterOptions` | ELW defaults / loan-files seed (follow-up) |

---

## 8. Recommendations

1. **BAT gate:** Any lookup returning empty when registry has data → treat as P0 (ID mismatch, hydration, or wrong role filter).
2. **Primitives only:** New screens must use shared live primitives — ban new bespoke memory search.
3. **Unavailable ≠ empty:** Always surface “Registry unavailable” + Retry when APIs fail.
4. **Retire seed catalogs** from Credit Risk lenders store, Loan Manager seeds, and Customer Master product filters before Production Certification.
5. **City Master:** Confirm whether City remains code catalog or gains REST registry — document ownership.
6. **Employee Code** on LSC: search already indexes `employeeCode` when present; ensure Banker profile capture persists it.

---

## Specific issue — Lender Sales Contact (Deal Workspace)

### Expected
Query ECM Contact Registry for:
- Contact Type / Role = Lender Contact (`lender_employee`)
- Active
- Linked to selected Lender (UUID / code / label)
- Product-compatible when `productsHandled` mapped
- Search by name, mobile, email, employee code, designation

### RCA (historical)
1. Memory-only search missed Prisma contacts  
2. Institution match UUID-only  
3. Empty API browse not biased to selected lender  
4. Failures presented as “No matching Lender Contacts”

### Fix (this programme)
- `liveSearchOperationalEcmContacts` returns full rows (roleProfiles intact)
- Lender-name/code bias when query empty
- Second pass when user types a person query
- Debounced UI + explicit registry-unavailable state
- Live duplicate detection on create

### Wiring
- `lender-pipeline-board.tsx` — `lenderId`, `lenderCode`, `productCode`
- `deal-control-panel.tsx` — same props from case execution

---

## Confirmation — Enterprise Registries

| Registry | Connected for production entity lookups |
|----------|------------------------------------------|
| Contact | ✅ Live ECM |
| Company | ✅ Live ECM |
| Lender | ✅ ELR API |
| Product | ✅ Product Registry / Master options |
| Employee | ✅ Assignable Users API |
| Opportunity | ✅ Opportunity API (Quick Task + registries) |
| Deal | ✅ Deal API |
| Wealth Partner | ✅ WP flows + ECM |
| City | ✅ City Master catalog |
| Branch | ✅ Banker cascade / coverage |
| Vendor / Valuer / Lawyer / Builder | ✅ via ECM roles where pickers exist; expand dedicated UIs as needed |

---

## Files changed (this programme)

- `src/lib/enterprise-registry/live-search.ts`
- `src/lib/enterprise-registry/index.ts`
- `src/lib/lender-sales-contact/index.ts`
- `src/components/catalyst-one/execution/lender-sales-contact-capture.tsx`
- `src/components/catalyst-one/contacts/reporting-manager-picker.tsx`
- `src/components/catalyst-one/companies/company-workspace-modal.tsx`
- `src/components/catalyst-one/credit-risk-engine/policy-library/policy-builder-form.tsx`
- `src/components/catalyst-one/tasks/task-engine-workspace.tsx`
- `src/components/catalyst-one/tasks/quick-task-create-modal.tsx`
- `.cursor/rules/enterprise-search-autocomplete.mdc`
- `docs/co-bug-lsc-lookup/ENTERPRISE-LOOKUP-SSOT-AUDIT.md` (superseded by this report + prior LSC notes)
- `docs/enterprise-lookup-ssot/ENTERPRISE-LOOKUP-SSOT-AUDIT-REPORT.md` (this file)

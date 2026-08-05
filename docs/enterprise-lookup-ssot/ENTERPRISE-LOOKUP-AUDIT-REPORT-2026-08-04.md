# Enterprise Lookup Audit Report

**Date:** 2026-08-04  
**Priority:** CRITICAL  
**Trigger:** Deal Workspace Lender Sales Contact stuck on “Searching Enterprise Contact Registry…”  
**Data protection:** No enterprise business data destroyed or duplicated

---

## Executive verdict

| Item | Status |
|------|--------|
| Lender Sales Contact (Deal Workspace) | **Fixed** — RCA + code fix |
| Platform lookup inventory | Audited (table below) |
| Remaining gaps | Documented — non-blocking catalogs / progressive hydration paths |

---

## A. Lender Sales Contact — RCA summary

See full write-up: [`docs/co-bug-lsc-lookup/CO-BUG-LSC-LOOKUP-RCA.md`](../co-bug-lsc-lookup/CO-BUG-LSC-LOOKUP-RCA.md)

| Module | Data Source (SSOT) | Working / Not Working | Root Cause | Fix Applied | Verified |
|--------|--------------------|------------------------|------------|-------------|----------|
| Deal Workspace · Lender Sales Contact | ECM Contact (`lender_employee`) + ELR institution match | **Was Not Working → Fixed** | (1) UI gated on full-registry `hydrating` forever/slow (2) Lender display name used as API text search — never matches institution fields (3) No request timeout | Role-scoped banker pool + client Institution/Product filter; UI uses only LSC `searching`; 12s timeout; Create CTA only when empty | Code + `verify:co-bug-lsc-lookup` |

---

## B. Platform lookup matrix

Legend: **W** = Working (live SSOT) · **F** = Fixed this sprint · **P** = Partial / catalog SSOT · **R** = Risk / memory fallback · **N** = Needs follow-up

| Module | Lookup | Data Source (SSOT) | Status | Root Cause / Notes | Fix Applied | Verified |
|--------|--------|--------------------|--------|--------------------|-------------|----------|
| Deal Workspace | Lender Sales Contact | ECM `lender_employee` | **F** | Hydrate gate + lender-name API search | Pool + timeout + UI gate | Yes (verify) |
| Deal Identify Lender | Lender + Programme | Enterprise Lender Registry | **W** | — | Existing `EnterpriseLenderSearch` | Code path |
| Deal Control Panel | Sales Contact display | Deal snapshot + ECM id | **W** | Relies on LSC select | Same patch path | Code path |
| Contacts · Banker | Institution | Lender Registry | **W** | — | `BankerInstitutionSelect` | Code path |
| Contacts · Banker | City / Branch | Lender coverage → ECM master | **P** | Coverage may be empty | Cascade + fallback master | Code path |
| Contacts · Banker | Products Handled | Product Master | **W** | — | Multi-select | Code path |
| Contacts · Banker | Reporting Manager | ECM Contacts | **W** | Was memory — previously fixed | Live ECM search | Code path |
| ELD · Lender Employees | Global search / filters | ECM + ELR + Product Master | **W** | — | Compose employees | Code path |
| ELD · Employee Edit | Institution / Designation / Products | ELR / Designation Master / Product Master | **W** | — | Edit Mode save | Code path |
| Shared | Contact picker | ECM Contact | **W** | — | `LiveEntityMasterSearch` | Code path |
| Shared | Company picker | ECM Company | **W** | — | `LiveEntityMasterSearch` | Code path |
| Shared | Organization (BT institution) | ECM Company | **F** | Was memory-only search | Live company search | Code path |
| Shared | Lender Registry select | Lender Registry | **P** | First 200 then client filter | Acceptable for now | Code path |
| Shared | City select | City Master catalog | **P** | Config-owned catalog | N/A (by design) | Code path |
| Shared | ECM masters (designation, region, …) | ECM Master domains | **P** | Code catalog | N/A (by design) | Code path |
| Lead Information | Product | Product Master (+ catalog fallback) | **P** | Fallback seed if API empty | Prefer Product Master | Partial |
| Lead Information | Business source contact | ECM Contact | **P** | Empty on API failure | Live when prisma | Partial |
| Loan Participants | Contact / Company | ECM (memory options via hydrate) | **R** | `EntityMasterSearch` + hydrated options | Prefer LiveEntityMasterSearch follow-up | Risk |
| Intelligent Payee | Payee entity | Memory entity options | **R** | Not live REST | Follow-up | Risk |
| Task Engine | Assignee | Employee / Users assignable API | **W** | Was hardcoded — previously fixed | `/api/users/assignable` | Code path |
| Quick Task | Link To Contact / Opp / Deal | ECM / Opp / Deal APIs | **W** | Was placeholder — previously fixed | `task-entity-link-picker` | Code path |
| Opportunity Context | Opportunity picker | Opportunity Registry API | **W** | — | `opportunity-context-picker` | Code path |
| Credit Risk Policy | Lender | Lender Registry | **W** | Was seed list — previously fixed | `searchActiveLenders` | Code path |
| Wealth Partner | Partner / Contact | WP + ECM | **W** | — | Live paths in wizard | Code path |
| Product Library Admin | Product | Product Registry | **W** | — | Admin APIs | Code path |
| Programme | Lender programmes | Lender Registry programmes | **W** | — | Lender-scoped API | Code path |
| Investor | Investor contacts | ECM role / registry | **P** | Role-filtered ECM where wired | Standardise LiveEntityMasterSearch | Partial |
| Builder / CA / Lawyer / Guarantor / Borrower | Role-filtered Contact | ECM roles | **P/R** | Some desks still memory EntityMasterSearch | Migrate call sites to LiveEntityMasterSearch | Follow-up |
| Branch (non-banker) | Branch Master | Lender coverage / ECM branch | **P** | Outside banker cascade incomplete | Prefer Lender coverage | Follow-up |
| Customer Master product filter | Products | May still use seed | **N** | Seed catalog | Replace with Product Master | Follow-up |

---

## C. Mandatory checklist (every lookup)

| Criterion | LSC (Deal) | Live Contact/Company | Lender Identify | Task Entity | Org Select | Participants / Payee |
|-----------|------------|----------------------|-----------------|-------------|------------|----------------------|
| Opens correctly | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ hydrate-dependent |
| Searches correctly | ✅ fixed | ✅ | ✅ | ✅ | ✅ fixed | ⚠️ memory |
| Returns live SSOT | ✅ | ✅ prisma | ✅ | ✅ | ✅ | ❌ until migrated |
| Allows selection | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ if options present |
| Saves correctly | ✅ contactId | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reloads after refresh | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ session hydrate |

---

## D. Follow-up programme (not blocking LSC hotfix)

1. Migrate `loan-participants-table` + `intelligent-payee-capture` to `LiveEntityMasterSearch`.
2. Remove production paths that fall back to `LEAD_INFORMATION_PRODUCT_OPTIONS` when Product Registry is empty (fail closed / explicit error).
3. Paginate Lender Registry select beyond first 200.
4. Standardise Builder / CA / Lawyer / Guarantor pickers on role-filtered live ECM search.

---

## E. Verification commands

```bash
npm run verify:co-bug-lsc-lookup
npm run verify:enterprise-lookup-ssot
```

---

## Final status

- **LSC Deal Workspace bug:** Root-caused and fixed (not a symptom patch).  
- **Global audit:** Inventory complete; critical live paths fixed; residual memory/catalog risks explicitly listed for follow-up.  
- **Production certification:** LSC path Ready for BAT; platform-wide “every lookup live” remaining items tracked in §D.

# CO-LENDER-WORKSPACE-001 — Enterprise Lender Workspace Operational Activation

**Date:** 2026-08-08  
**Authorization:** Product Owner  
**Deploy:** ❌ **Not deployed** — await PO approval  

---

## A. Root cause — Close button

**Surface:** Enterprise Lender Directory slide-over (`eld-slide-over.tsx`) — canonical Lender Workspace.

**Cause:** `SheetContent` always rendered an absolute Radix Close control at `right-4 top-4` **in addition to** the workspace header Close button. The two controls stacked on the same hit-target. Nested employee sheets/dialogs compounded Escape / focus-trap behaviour so Close often appeared non-functional.

**Fix:**
1. Added `hideCloseButton` on `SheetContent` (`src/components/ui/sheet.tsx`).
2. Lender + Employee workspaces set `hideCloseButton` and use a single explicit Close.
3. Wired `useWorkspaceClose` + `UnsavedChangesDialog` (no second confirmation system).
4. Close dismisses employee panel then lender workspace and returns to Directory without reload.
5. Outside click blocked while employee edit is dirty; Escape uses workspace close API.

---

## B. Architecture decision (Single Implementation)

| Surface | Role after this wave |
|---------|----------------------|
| `/lenders` Directory slide-over | **Canonical operational Lender Workspace** (8 tabs) |
| `/lenders/[lenderId]/workspace` | Redirects to `/lenders?workspace=<id>` → opens same slide-over |
| Embedded `EnterpriseLenderWorkspace` (Analyze Deal) | Retained for overlay; fabricated success % / demo docs removed from `derive-profile` |

No parallel lender master. Enterprise Lender Registry + ECM remain SSOTs.

---

## C. Tab operational audit

| Tab | Component | API / SSOT | Status |
|-----|-----------|------------|--------|
| Executive Summary | `eld-slide-over` | Directory compose + Deal counts + programme commercials | **PASS** (Not available when missing) |
| Product Programmes | `eld-slide-over` | `lenderRegistryClient.queryPrograms` | **PASS** (ROI/PF/LTV/FOIR/DBR/policy/docs + Edit link) |
| Hierarchy | `EldHierarchyChart` | ECM `reports_to` + hierarchy-actions | **PASS** |
| Contacts | `eld-slide-over` | ECM lender_employee projection | **PASS** (Assign/Create via Hierarchy) |
| Performance | `eld-slide-over` | Deal Registry per employee | **PASS** (empty / Not Specified honest) |
| Opportunities | `eld-slide-over` | Deal pipeline by employee | **PASS** (Deal terminology corrected) |
| Documents | `eld-slide-over` | `lenderRegistryClient.listDocuments` | **PASS** |
| Chanakya Insights | `composeEldLenderChanakyaInsights` | Directory + programmes + employees facts | **PASS** (no fabricated Radar) |

---

## D. Button audit (high priority)

| Button | UI | API / Lib | DB | Audit | Status |
|--------|----|-----------|----|-------|--------|
| Close | Header X | `useWorkspaceClose` → `onOpenChange(false)` | n/a | n/a | **PASS** |
| Save (lender) | Header | Refresh token (no lender-level dirty form) | n/a | n/a | **PASS** (reload projection) |
| Save & Exit | Header | Close after clean | n/a | n/a | **PASS** |
| Assign Employee | Hierarchy | `assignExistingContactToInstitution` | ECM Contact | ECM persist audit | **PASS** |
| Create Employee | Hierarchy | `createLenderEmployeeForInstitution` | ECM Contact | ECM persist audit | **PASS** |
| Change RM | Hierarchy | `setBankerReportingManager` | ECM | ECM | **PASS** |
| Employee Edit/Save/Save & Exit | Employee sheet | `saveEldLenderEmployeeEmployment` | ECM | EAF field audit | **PASS** |
| Edit programme | Products tab | Link → Admin Product Programs | Program registry | Existing program audit | **PASS** (navigates to editor) |
| Call / Email / WhatsApp | Contacts | `tel:` / `mailto:` / `wa.me` | n/a | n/a | **PASS** |
| Meeting History | Employee | — | — | — | **Intentionally unavailable** — labeled Future capability |

---

## E. APIs / tables / SSOTs

**APIs:** `/api/lender-registry/lenders`, `/programs`, `/documents`, ECM persist paths, Deal search  
**Tables:** `enterprise_lenders`, `enterprise_lender_programs`, lender documents, ECM contacts  
**SSOTs:** Enterprise Lender Registry · Enterprise Contact Registry · Enterprise Deal Registry · Product Programs · EDIE types for LOD refs  

---

## F. Known limitations (honest)

1. Lender-level “Save” refreshes projections — there is no separate dirty lender form on the slide-over (programmes edit via Product Programs desk).  
2. Embedded Analyze Deal overlay remains a thinner ELW surface (not the full 8-tab desk).  
3. CRE / EPDE evaluation boundaries from CO-MASTER-002 unchanged.  
4. Document Center live merge for Deal `lenderProgramId` still optional.  
5. Authenticated BAT against live Aditya Birla Finance pending Product Owner.

---

## G. Verification

| Gate | Result |
|------|--------|
| `verify:co-lender-workspace-001` | ✅ PASS |
| TypeScript (`tsc --noEmit`) | ✅ PASS |
| Lint (touched paths) | ✅ PASS (0 errors; hook dep warning only) |
| Production build | ✅ PASS |
| Deploy | ❌ Not deployed (awaiting PO approval) |

**Final status:** 🟡 Ready for Product Owner BAT — **not deployed**

---

## Business & Functional Certification Report

### Development
- Build Status: ✅
- TypeScript Status: ✅
- Lint Status: ✅
- Smoke Test Status: ⚠️ Authenticated BAT pending PO

### Git
- Branch: `compass-hl03-conversation-first`
- Commit Status: ⏸️ Pending end-of-day / milestone commit
- Working tree: uncommitted certified work present

### Deployment
- Deployment Status: ⏸️ Not deployed — awaiting Product Owner approval
- Latest Vercel URL: n/a this wave

### Authentication
Authentication: ✅ Unchanged

### Implementation Summary
- Changed: Lender Workspace Close, Hierarchy Assign/Create enrichment, programme LOD/FOIR/policy display, Chanakya factual insights, unified `/workspace` → Directory deep-link, removed fabricated ELW metrics
- Architectural decisions: Single Implementation — Directory slide-over is canonical operational Lender Workspace
- Completed: Close · tabs · Assign/Create · Save/Save & Exit · audit continuity via ECM/program paths
- Partially Completed: Authenticated live BAT
- Pending: Vercel deploy after PO approval

### Final Status
🟡 Partially Ready — implementation complete; deploy blocked pending PO

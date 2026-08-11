# CO-CONTACT-REGION-001 — Business & Functional Certification Report

**Programme:** Restore Region in Contact Role Workspace lender hierarchy  
**Date:** 2026-08-07  
**Authorization:** Product Owner bug report — implement fix · **no deploy until PO approval**  

---

## Development

| Check | Status |
|-------|--------|
| Build Status | ⏸️ Not run for deploy (deploy blocked) |
| TypeScript Status | ⏸️ Local verify gates preferred for this bugfix |
| Lint Status | ⏸️ N/A for template/wiring-only change unless CI requires |
| Smoke / Verification Status | ✅ `verify:co-contact-region-001` (run in session) |
| Live E2E BAT | ☐ Pending Product Owner |

---

## Git

| Field | Value |
|-------|--------|
| Branch | Working tree (no milestone commit required for this bug) |
| Commit Status | ⏸️ Uncommitted until PO / session commit request |
| Deployment | ❌ **Not deployed** — awaiting Product Owner approval |

---

## Authentication

Authentication: ✅ Unchanged

---

## Implementation Summary

### Root cause
Region was optional and ordered last in the Banker role template; Contact Role Workspace did not pass `regionId` into City/Branch selects — UI presented Institution → City → Branch and broke the frozen hierarchy.

### Changed
- Restored mandatory **Region** immediately after **Institution** in Banker MIR  
- Reconnected cascade: Institution → Region → City → Branch  
- Region-filter City (including coverage cities when metadata allows)  
- Branch gated on City  
- ELD institution transfer clears Region  

### Files modified
- `src/constants/enterprise-contact-master/role-templates.ts`
- `src/components/catalyst-one/contacts/contact-workspace-modal.tsx`
- `src/components/catalyst-one/contacts/banker-lender-registry-fields.tsx`
- `src/components/catalyst-one/enterprise-lender-directory/eld-employee-slide-over.tsx`
- `scripts/co-contact-region-001-verify.mjs` (new)
- `scripts/co-master-region-001-verify.mjs`
- `scripts/co-bug-005-verify.mjs`
- `package.json` (`verify:co-contact-region-001`)
- `docs/co-contact-region-001/*`

### Architectural decisions
- Reuse existing Enterprise Region Master + Banker select components — **no** new registry  
- Do **not** change Enterprise Lender Registry  
- Do **not** redesign Contact module  

### Completed
- Template order / mandatory Region  
- Contact Workspace cascade wiring  
- Shared select gates  
- Static verification + RCA / validation docs  

### Partially Completed
- Live BAT in browser  

### Pending
- Product Owner approval to deploy  
- PO BAT on Contact Banker Role Workspace  

---

## Business certification — hierarchy

| Item | Status |
|------|--------|
| Institution | ✅ Lender Registry select |
| Region | ✅ Restored · mandatory · Enterprise Region Master |
| City | ✅ After Region · filtered by Region |
| Branch | ✅ After City · filtered |
| Contact Module | ✅ Banker role only touched |
| Banker Role | ✅ Fixed |
| Enterprise Lender Registry | ✅ Unchanged (consumed only) |
| Opportunity Workspace | ✅ No bypass of Banker org editor; LIFE institution pick is separate capability |

---

## Final Status

🟡 **Ready for Product Owner review / BAT** — **not deployed**  
Do **not** claim production certified until PO approves deployment and live BAT of Banker MIR cascade.

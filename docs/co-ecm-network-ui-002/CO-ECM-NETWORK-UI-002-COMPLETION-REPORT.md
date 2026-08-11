# CO-ECM-NETWORK-UI-002 — Wealth Partner Business Network Scroll Fix

**Status:** Fixed · Verified locally · **NOT DEPLOYED** (PO: do not deploy)  
**Date:** 2026-08-11  
**Scope:** UI / layout / scroll-container only  

---

## A. Root cause

CO-ECM-NETWORK-UI-001 correctly moved Partner Workspace onto the **document-scroll** allowlist (`main` → `overflow-y-auto`, no `h-full` lock).

A residual fill-layout trap remained on the workspace root:

`ENTERPRISE_REGISTRY_DOCUMENT_CONTENT_PAD_CLASS` still applied **`flex-1` + `min-h-0`** (registry fill contracts).

On the Network tab (tall Business Network + Add Network Member form), that combination can prevent the page content from growing to its full natural height, so lower controls (relationship type, member type, Save) stay unreachable even though `main` is scrollable.

No relationship model / API / permission change was involved.

---

## B. Correction

| Layer | Fix |
|-------|-----|
| Constants | New `WEALTH_PARTNER_WORKSPACE_PAGE_CLASS` — natural column, `overflow-visible`, bottom padding; **no** `flex-1` / `min-h-0` / `overflow-hidden` |
| Workspace root | Uses that page class; tags `CO-ECM-NETWORK-UI-002` / `data-layout-mode="document"` |
| Network tab | `overflow-visible` + add-form marker; retained Contact/Company search + Save |
| Dashboard layout | Document-scroll registry motion wrapper → `min-h-min overflow-visible` (never `h-full`) |

List `/wealth-partners` remains locked-fill registry grid (unchanged).

---

## C. Files changed

| File | Change |
|------|--------|
| `src/constants/enterprise-registry-workspace.ts` | `WEALTH_PARTNER_WORKSPACE_PAGE_CLASS`; document pad notes |
| `src/layouts/dashboard-layout.tsx` | Document-scroll wrapper `min-h-min overflow-visible` |
| `src/components/catalyst-one/wealth-partner-registry/wealth-partner-workspace.tsx` | Page class + Network scroll-safe wrappers |
| `src/components/catalyst-one/wealth-partner-registry/wealth-partner-network-intelligence.tsx` | Tree panel `overflow-visible` |
| `scripts/co-ecm-network-ui-002-verify.mjs` | Structural verify |
| `package.json` | `verify:co-ecm-network-ui-002` |

**Unchanged:** ECM / Company / Network relationship model · APIs · auth · ownership · Partner identity · Business Network redesign · migrations · production data.

---

## D. Functional test contract (PO BAT)

Contact / Company relationship:

1. Open Network  
2. Scroll top → bottom (Add form fully reachable)  
3. Select Contact or Company → search → select  
4. Complete relationship fields → Save  
5. Refresh → relationship persists  
6. Do not create unnecessary duplicates  

Live add not executed in this agent run (no production mutation). Wiring unchanged from prior sprint.

---

## E. Verification

| Gate | Result |
|------|--------|
| `verify:co-ecm-network-ui-001` | ✅ (path classification retained) |
| `verify:co-ecm-network-ui-002` | ✅ |
| TypeScript | ✅ |
| Lint (touched) | ✅ |
| Build | ✅ |
| Vercel | ❌ not performed |

**Deploy:** not performed.

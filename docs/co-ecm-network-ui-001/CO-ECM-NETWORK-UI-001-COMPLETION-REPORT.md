# CO-ECM-NETWORK-UI-001 — Wealth Partner Business Network Scroll Fix

**Status:** Fixed · Verified locally · **NOT DEPLOYED** (PO: do not deploy)  
**Date:** 2026-08-10  
**Scope:** UI / layout / scroll-container only  

---

## A. Root cause

`/wealth-partners/:partnerId/workspace` is classified as an **Enterprise Registry full-width** route (`ENTERPRISE_REGISTRY_FULL_WIDTH_PATH_PREFIXES` includes `/wealth-partners`).

It was **not** on the document-scroll allowlist.

In `dashboard-layout.tsx`:

```ts
isLockedFillDesk =
  (isRegistryFullWidth && !isRegistryDocumentScroll) || …
```

Therefore Partner Workspace set:

| Layer | Behaviour before |
|-------|------------------|
| `main` | `overflow-hidden` (locked fill) |
| Page motion wrapper | `h-full` |
| Network tab | Tall Business Network + Add Member form |

The Add Network Member controls below the fold (Relationship Type, Member Type, Save) were **clipped** with no page-level scroll — same failure mode as CO-DOCS-BAT-001 for Document Center.

Business Network APIs / relationship model were not involved.

---

## B. Files changed

| File | Change |
|------|--------|
| `src/constants/enterprise-registry-workspace.ts` | Workspace path regex → document-scroll; list `/wealth-partners` stays locked-fill |
| `src/components/catalyst-one/wealth-partner-registry/wealth-partner-workspace.tsx` | Document content pad + bottom padding; Network tab `pb-6` |
| `scripts/co-ecm-network-ui-001-verify.mjs` | Path classification / lock-rule verify |
| `package.json` | `verify:co-ecm-network-ui-001` |
| `docs/co-ecm-network-ui-001/CO-ECM-NETWORK-UI-001-COMPLETION-REPORT.md` | This report |

**Unchanged:** ECM / Company / Network relationship model · APIs · auth · ownership · Opportunity / Deal · Partner architecture · migrations · production data.

---

## C. Scroll-container correction

For `/wealth-partners/:id/workspace`:

1. `isEnterpriseRegistryDocumentScrollPath` → **true**
2. `isLockedFillDesk` → **false**
3. `main` → `overflow-y-auto` (single reliable vertical scroll surface)
4. Motion wrapper → **no** `h-full` lock
5. Exact `/wealth-partners` list → still locked-fill registry grid (unchanged)

No arbitrary `min-height` / fake viewport heights.

---

## D–G. Verification notes

| Check | Result |
|-------|--------|
| D. Desktop scroll contract (path helpers) | ✅ `verify:co-ecm-network-ui-001` — workspace `lockedFill=false`, `main` → `overflow-y-auto` |
| E. Responsive / list isolation | ✅ Exact `/wealth-partners` remains locked-fill; workspace regex only |
| F. Contact relationship flow | ✅ Form/API wiring unchanged (`identityKind=contact` → `addNetworkMember`); **live add not run** (no production data writes) |
| G. Company relationship flow | ✅ Same for `identityKind=company`; **live add not run** |

PO browser BAT (no deploy required for local): Network → scroll → Contact/Company → save → refresh. Avoid duplicate relationships.

---

## H–J. Build gates

| Gate | Result |
|------|--------|
| H. TypeScript (`tsc --noEmit`) | ✅ exit 0 |
| I. Lint (`next lint`) | ✅ exit 0 (pre-existing unused-var warnings elsewhere) |
| J. Build (`next build`) | ✅ exit 0 |
| `verify:co-ecm-network-ui-001` | ✅ PASS |
| `verify:co-docs-bat-001` | ✅ PASS (no regression) |

---

## K. Remaining UI limitations

1. Sticky app topbar remains; content scrolls under `main` (existing shell behaviour).  
2. Search autocomplete dropdown uses existing enterprise overlay (`max-h-40`) — unchanged.  
3. Live add/refresh BAT deferred until PO allows non-destructive browser check (or staging).

**Deploy:** not performed.

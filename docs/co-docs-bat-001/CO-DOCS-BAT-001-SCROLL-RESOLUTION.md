# CO-DOCS-BAT-001 — Document Workspace Scroll Resolution

**Status:** Fixed · Awaiting Product Owner BAT (no deploy until approval)  
**Priority:** P0  
**Scope:** Scroll behaviour only — no feature / UI redesign

---

## 1. Root cause

`/document-center` was classified as an **Enterprise Registry full-width** route (`ENTERPRISE_REGISTRY_FULL_WIDTH_PATH_PREFIXES`) but was **not** on the document-scroll allowlist.

In `dashboard-layout.tsx`:

```ts
isLockedFillDesk =
  (isRegistryFullWidth && !isRegistryDocumentScroll) || …
```

Therefore Document Center set `main` to `overflow-hidden` and the page shell to `h-full`.

The Document Center is a tall multi-panel operational desk (categories, packages, other docs, readiness). Content grew past the viewport, but the parent layout **clipped** it with no page-level scroll. Nested table `max-h` regions could scroll internally, which made the page feel “locked” before lower sections.

This matches the frozen UX rule: operational desks must use natural document scroll — not locked-fill registry viewport traps.

---

## 2. Why scrolling was blocked

| Layer | Behaviour before fix |
|-------|----------------------|
| `main` | `overflow-hidden` (locked fill desk) |
| Page motion wrapper | `h-full` (viewport lock) |
| Document Center body | Content taller than viewport, no outer scroll |
| Category tables | Optional internal `max-h` scroll only |

Sticky chrome was not the primary blocker; the **layout contract** was.

---

## 3. Files changed

| File | Change |
|------|--------|
| `src/constants/enterprise-registry-workspace.ts` | Add `/document-center` to `ENTERPRISE_REGISTRY_DOCUMENT_SCROLL_PATH_PREFIXES` |
| `src/layouts/dashboard-layout.tsx` | Document-scroll registries keep full width but **do not** apply `h-full` |
| `src/components/catalyst-one/document-center/document-center-workspace.tsx` | Remove leftover negative-margin wrapper; keep natural column flow |

---

## 4. Confirmation

After fix, for `/document-center`:

- `isRegistryDocumentScroll === true`
- `isLockedFillDesk === false`
- `main` uses `overflow-y-auto` (natural page scroll)
- Wrapper is not height-locked with `h-full`

Sticky journey chrome may remain sticky; it no longer traps the page.

**Deploy:** deferred until Product Owner approval.

# CO-UX-016 — Enterprise Registry Workspace Optimisation

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-31  
**Scope:** Presentation layer only

---

## 1. Shared layout SSOT

| Artefact | Path |
|---|---|
| Registry shell | `src/components/catalyst-one/shared/enterprise-registry-workspace-shell.tsx` |
| Layout tokens + counter helper | `src/constants/enterprise-registry-workspace.ts` |
| Grid fill / sticky toolbar | `src/components/catalyst-one/enterprise-grid/enterprise-data-grid.tsx` (`fillViewport`) |
| Compact PageHeader density | `src/components/design-system/page-header.tsx` (`density="registry"`) |
| Verify | `npm run verify:co-ux-016` |

---

## 2. Optimised Registry pages

| Page | Route / surface | Change |
|---|---|---|
| Contacts (+ Companies tabs) | `/contacts` | Shared shell · concise counter · fillViewport grid |
| My Opportunities | `/my-opportunities` | Shared shell · compact More Filters · fillViewport |
| My Deals | `/my-deals` | Shared shell · compact header / tabs |
| Lenders (directory) | `/lenders` | Shared shell · dense fillViewport programs grid |
| Wealth Partners | `/wealth-partners` | Shared shell · dense sticky filters + table |
| Wealth Partners (Admin) | `/admin/wealth-partner-registry` | Same view + shell |
| Lender Registry (Admin) | `/admin/lender-registry` | Compact header · denser metrics · viewport fill |
| Builders / Investors / Employees / CAs | Contact Registry role tabs | Inherit Contacts densification |

Loan Files remain Deal Workspace hosts (not a list registry desk) — unchanged architecture.

---

## 3. UX Improvement Summary

- **Header:** Single compact title line + optional inline subtitle; reduced padding.
- **Actions:** `h-7` / `text-[11px]` Reload · Add · Export · Reset · Columns · Create Task.
- **Filters:** Search + primary filters + expandable **More Filters**; secondary filters stay collapsed by default.
- **Counters:** `Contacts (29)` style via `formatEnterpriseRegistryCounter`.
- **Table:** `fillViewport` consumes remaining height; denser header cells; sticky column toolbar.
- **Sticky chrome:** Filter / grid toolbar stays visible while rows scroll.
- **Consistency:** All major registries mount `EnterpriseRegistryWorkspaceShell`.

---

## 4. Before / After

Illustrative before/after comparison was generated for this sprint (compact header · sticky filters · denser rows).

**BAT live capture (recommended):** open `/contacts` and `/my-opportunities` — confirm more rows above the fold, counters like `Contacts (N)`, sticky search strip while scrolling.
---

## 5. Verification Report

| Check | Result |
|---|---|
| More rows visible | ✅ denser chrome + fillViewport |
| Reduced header height | ✅ |
| Reduced filter height | ✅ compact controls + More Filters |
| Sticky toolbar | ✅ shell + grid toolbar |
| No loss of functionality | ✅ same actions / filters / exports |
| Responsive layout | ✅ flex fill, not fixed row count |
| No business logic / API / schema changes | ✅ presentation only |
| Static verify | `npm run verify:co-ux-016` → PASS |

### Production data protection

- Did **not** modify production data  
- Did **not** change database schema  
- Did **not** change APIs  
- Did **not** change permissions or registry ownership  

---

## 6. Confirmation

**No data, APIs, or business logic were modified.**  
This sprint only densifies shared registry presentation chrome.

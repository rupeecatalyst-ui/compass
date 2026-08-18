# CO-C1-ACCOUNTING-LAYOUT-001 — Accounting Workspace Layout Fix

**Status:** Engineering complete · Product Owner visual validation pending  
**Date:** 2026-08-14  
**Scope:** Shared dashboard-shell width allocation and Accounting workspace containment only.

## Root cause

The global desktop navigation already participates in the dashboard flex layout as a docked, non-shrinking column:

- Expanded primary sidebar: 260px
- Collapsed primary sidebar: 64px
- Context panel: separate docked flex column when active
- Mobile navigation: Sheet pattern

Accounting was incorrectly listed as an Enterprise Registry full-width route. That gave it the locked registry host (`p-0`, `h-full`, `overflow-hidden`) even though Accounting uses a natural document-scroll workspace. At the same time, `AccountingWorkspace` applied negative horizontal margins intended for a padded host. With no host padding to cancel, those margins extended Accounting outside its assigned content boundary and under adjacent navigation.

## Fix

### Shared dashboard shell

`src/layouts/dashboard-layout.tsx`

- Classifies `/accounting` as a full-width workspace.
- Gives the main region and page-transition wrapper explicit `w-full min-w-0`.
- Adds shared `overflow-x-hidden` containment to the application main region.
- Keeps the existing docked Sidebar → Context Panel → Application Content flex architecture.

`src/constants/enterprise-registry-workspace.ts`

- Removes `/accounting` from `ENTERPRISE_REGISTRY_FULL_WIDTH_PATH_PREFIXES`.
- Accounting is a multi-panel document-scroll workspace, not a locked registry datagrid.
- This restores natural `overflow-y-auto` host scrolling and padded full-width workspace margins instead of registry `p-0` + locked fill.

### Accounting workspace

`src/components/catalyst-one/accounting/accounting-workspace.tsx`

- Removes the negative responsive horizontal margins.
- Uses `w-full min-w-0` and remains entirely inside the width allocated by the shared shell.

No Accounting business logic, workbenches, tabs, calculations, routes, permissions, persistence, colors, or terminology changed.

## Responsive behavior

| Viewport | Result |
|---|---|
| Desktop expanded nav | Sidebar reserves 260px; Accounting uses remaining width |
| Desktop collapsed nav | Sidebar animates to 64px; flex main expands automatically |
| Context panel active | Context panel remains a separate shrink-0 column |
| Laptop | Main and page wrapper may shrink (`min-w-0`); no page-level horizontal escape |
| Tablet/mobile | Desktop sidebar remains hidden below `md`; existing MobileNav Sheet retained |

Wide tables/workbenches retain their existing local overflow behavior. The application shell no longer allows the full page to create an unexpected horizontal scrollbar.

## Shared-module regression

Dashboard, Loan Journey, Tasks, Documents, Lenders, Wealth Partners, Mission Control, Horizon, Administration, and Settings still render through the same `DashboardLayout`. The shared additions (`w-full`, `min-w-0`, horizontal containment) are additive and do not alter route logic, navigation items, or business behavior.

## Files

### Modified

- `src/layouts/dashboard-layout.tsx`
- `src/constants/enterprise-registry-workspace.ts`
- `src/components/catalyst-one/accounting/accounting-workspace.tsx`
- `package.json`

### Added

- `scripts/co-c1-accounting-layout-001-verify.mjs`
- `docs/co-c1-accounting-layout-001/CO-C1-ACCOUNTING-LAYOUT-001-REPORT.md`

## Validation

| Gate | Result |
|---|---|
| Shared Accounting layout gate | PASS |
| Existing Accounting activation regression | PASS |
| TypeScript (`tsc --noEmit`, 8GB heap) | PASS |
| Production build | PASS |
| Touched-file lints | PASS |
| Source-level responsive/sidebar checks | PASS |

## Outstanding validation

A live visual BAT at desktop expanded/collapsed, laptop, tablet, and mobile viewports remains required after the next Product Owner-authorized deployment. No deployment was performed in this task.

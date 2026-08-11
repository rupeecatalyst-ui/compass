# CO-MASTER-003 — Product–Lender Matrix Scroll / Viewport Fix

**Status:** Implementation Complete · Local verification only · **Not deployed**  
**Date:** 2026-08-09  
**Scope:** Presentation / viewport only — no master data, mapping, API, or schema changes

---

## A. Root cause

`/admin/product-lender-matrix` is an **Enterprise Registry full-width path**. Dashboard layout therefore:

1. Sets `main` to `overflow-hidden` (`isLockedFillDesk`)
2. Sets the page wrapper to `h-full`

The matrix UI used:

```text
<div> (unconstrained growth)
  <Card className="overflow-auto">  ← overflow-auto with NO max/flex height
    <table>…all lenders…</table>
  </Card>
</div>
```

`overflow-auto` only scrolls when the element’s height is constrained. With no constraint, the Card grew to full table height; the locked `main` clipped the excess. Result: first rows visible, **vertical scroll frozen / unreachable**, remaining lenders inaccessible.

Horizontal scroll was similarly unreliable because the only scrollport was not a bounded viewport.

---

## B. Files changed

| File | Change |
|------|--------|
| `src/components/catalyst-one/admin/product-lender-matrix-workspace.tsx` | Fill-height flex column + constrained matrix scrollport; sticky header/lender |
| `scripts/co-master-003-verify.mjs` | Static scroll-architecture verify |
| `package.json` | `verify:co-master-003` |
| `docs/co-master-003/CO-MASTER-003-SCROLL-FIX-REPORT.md` | This report |

**Not changed:** API · Prisma · Product Master · Lender Registry · mappings · priorities · permissions

---

## C. Scroll architecture

### Before

```text
h-screen overflow-hidden
└─ main overflow-hidden (locked registry desk)
   └─ motion h-full
      └─ workspace (grows with content)
         └─ Card overflow-auto (no height limit) → CLIPPED, no scroll
```

### After

```text
h-screen overflow-hidden
└─ main overflow-hidden
   └─ motion h-full
      └─ workspace: h-full min-h-0 flex-col overflow-hidden
         ├─ chrome (PageHeader / error / counts) shrink-0
         └─ Card: min-h-0 flex-1 overflow-auto  ← single V+H scrollport
            └─ table
               ├─ thead th sticky top-0 (product headers)
               ├─ first th sticky left-0 top-0 (Lender corner)
               └─ body td sticky left-0 (lender column)
```

Both axes use the **same** matrix body scrollport (independent scroll directions). No pagination, no row/product hiding.

---

## D–F. Scroll / sticky (local)

| Check | Result |
|-------|--------|
| Vertical scroll through lender rows | Architecture supports — Card is height-bounded `overflow-auto` |
| Horizontal scroll through product columns | Architecture supports — same scrollport; table `w-max min-w-full` |
| Sticky product header | `sticky top-0` on header cells |
| Sticky lender column | `sticky left-0` on lender cells + corner |

Manual BAT on a running local/prod desk remains for Product Owner (items 7A–J).

---

## G. Mapping interaction

Toggle path **unchanged**:

`Checkbox` → `toggle` → `PUT /api/admin/product-lender-matrix` → `productCodesShareSelectionFamily` → local `setLenders` refresh.

No mapping logic edits.

---

## H. Data integrity

| Check | Result |
|-------|--------|
| Migrations / seed / DB reset | **Not run** |
| API / Prisma / schema | **Unchanged** |
| `co-admin-005-verify` | **PASS** (Product Master + Matrix UI + seed + schema extensions present) |
| `co-master-003-verify` | **PASS** (scroll wiring; no pagination) |

Lender count / product count / mapping count are runtime SSOT values — presentation fix does not mutate them.

---

## I. Verification results

| Gate | Result |
|------|--------|
| `npm run verify:co-master-003` | ✅ PASS |
| `node scripts/co-admin-005-verify.mjs` | ✅ PASS |
| TypeScript (`tsc --noEmit`) | ✅ PASS |
| Production build (`npm run build`) | ✅ PASS |
| Lint (workspace file) | No blocking diagnostics from edit |
| Vercel deploy | **Skipped per PO instruction** |

---

## STOP

Await Product Owner approval before any Vercel deployment.

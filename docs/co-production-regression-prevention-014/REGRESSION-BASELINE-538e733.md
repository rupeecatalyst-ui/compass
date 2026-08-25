# Regression Baseline — Shell Behaviour Reference

**Baseline commit:** `538e7333dee2a5d246a729ced8796804def880cb`  
**Short SHA:** `538e733`  
**Message:** `fix(production): stabilize notification and Chanakya chrome`  
**Sprint:** CO-PRODUCTION-UX-STABILIZATION-013  
**Verified on:** `https://catalyst-one.rupeecatalyst.com` (post-deploy PO visual sign-off)

---

## Purpose

This baseline documents the **known-good global shell behaviour** after resolving CO-CHANAKYA-PRODUCTION-REGRESSION-012. Future production smoke runs compare against these expectations — not by changing UI, but by detecting deviation.

---

## Expected shell geometry (desktop 1440×900)

| Element | Expected |
|---------|----------|
| Sidebar (`aside`) | Visible · `x≈0` · `width≈260` · `position: static` |
| Main content (`main`) | `x >= sidebar.right` (typically ~260) |
| Primary headings | Left edge **right of** sidebar (no clip under nav) |
| Header | Single row · sticky · no expansion beyond viewport |
| Horizontal overflow | `body.scrollWidth <= clientWidth` |

---

## Notification presentation contract

| Rule | Expected |
|------|----------|
| Visible toasts | **Maximum 1** (`data-ene-visible-toasts="1"`) |
| Queue | Additional notifications internal; "+N queued" label when backlog exists |
| Position | Bottom-right · does not cover sidebar or primary desk controls |
| Data | Unread count / history / fan-out architecture unchanged |

---

## CHANAKYA Live Intelligence bar

| Rule | Expected |
|------|----------|
| Container | Inside header flex row · `overflow: hidden` |
| Ticker | Does not overlap notification bell / profile / CHANAKYA AI cluster |
| Long messages | Truncated / marquee-scrolled within container |
| Viewports | Contained at 1280px, 1440px, and wider desktop |

Selector fallbacks used by smoke:

- `[aria-label="CHANAKYA live operational intelligence"]`
- `[data-sprint="CO-PRODUCTION-UX-STABILIZATION-013"][role="status"]`

---

## Critical routes (must load authenticated shell)

- `/dashboard` — User Home Dashboard
- `/my-deals` — Deal Registry
- `/documents` → may redirect to `/document-center` when no active opportunity
- `/document-center` — Opportunity picker or document workspace
- `/credit-workbench` — Credit bench entry

Client navigation between sidebar entries must work without full page failure.

---

## What this baseline is NOT

- Not a UI redesign target
- Not a substitute for feature-level E2E scenario packs (CO-QA-001)
- Not proof of Credit Workbench / OAuth / STORAGE-009 behaviour

---

## When smoke fails against baseline

1. STOP deployment recommendation
2. Compare failing commit to `538e733` for shell / notification / ticker file changes
3. Run asset probe + authenticated geometry scripts from REGRESSION-012 pattern
4. Do not apply speculative global CSS fixes until root cause is proven

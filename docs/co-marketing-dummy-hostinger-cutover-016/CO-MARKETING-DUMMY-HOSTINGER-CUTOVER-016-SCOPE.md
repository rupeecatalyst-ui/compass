# CO-MARKETING-DUMMY-HOSTINGER-CUTOVER-016 — Pre-Deploy Scope Report

**Date:** 2026-08-26  
**Authority:** Explicit PO exception to CO-CHANAKYA-RELEASE-FREEZE-015 (Marketing Dummy Campaign only)

## Identified SHAs

| Item | SHA | Notes |
|------|-----|--------|
| Local / origin HEAD | `b6292c5` | `chore(release): add production regression prevention framework (014)` |
| Production shell baseline (014 docs) | `538e733` | Verified on Hostinger after UX stabilization 013 |
| Committed Marketing Campaign Builder redesign | `c779a14` | `feat(marketing): redesign campaign builder` — **already ancestor of `538e733`** |
| Uncommitted Marketing refinements (this cutover) | working tree only | Builder UX + `{{first_name}}` alias — **not yet committed** |

## What is already in production ancestry (`538e733` / later)

- Marketing Campaign Builder redesign (`c779a14`) and MKT-01…13 / ACTIVATION-002 engine (in-memory / dry-run)
- Prior Chanakya credit / document / ChatGPT commits that landed **before** `538e733` (already production baseline — not part of this delta)

## Marketing-only delta to deploy (this cutover)

| File | Change |
|------|--------|
| `src/components/catalyst-one/admin/marketing/marketing-campaigns-panel.tsx` | Campaign Builder step validation, audience linking UX, auto-preview |
| `src/constants/enterprise-marketing-engine/content.ts` | `first_name` → `firstName` alias map |
| `src/lib/enterprise-marketing-engine/personalization.ts` | Alias resolution for personalization |
| `scripts/co-marketing-mkt-04-verify.mjs` | Alias verification assertion |

## Explicitly excluded (remain uncommitted / not staged)

- All CHANAKYA enterprise-read-context-002 / OAuth refresh / credit gather-context dirty work  
- Accounting / invoice / GST / PDF / signature  
- SMTP / operational email dirty work  
- Dashboard / Chanakya intelligence mode dirty UI  
- Prisma schema + `20260826120000_co_accounting_invoice_operations_015`  
- Dirty `package.json` (extra verify scripts)  
- Freeze docs / tmp scripts / regression tmp artefacts  

## Isolation verdict

**PASS — isolatable.** Staging only the four Marketing files on top of clean `b6292c5` produces a controlled SHA without Chanakya/Accounting dirty work.

## Database / migrations

**No Prisma migration required** for this Marketing delta (EME remains in-memory / fixture; no marketing prospect tables).

## Environment variables

**None** required for this Marketing Dummy Campaign cutover.

## Deploy method

Commit Marketing-only SHA → `git push origin compass-hl03-conversation-first` (Hostinger historically rebuilds from this branch). No dirty-tree deploy. No prod migrate. No env change.

## Freeze reminder

After this cutover: return to **BUILD → VERIFY → COMMIT/PUSH → STOP**. No further Hostinger deploy without explicit PO approval (CO-CHANAKYA-RELEASE-FREEZE-015).

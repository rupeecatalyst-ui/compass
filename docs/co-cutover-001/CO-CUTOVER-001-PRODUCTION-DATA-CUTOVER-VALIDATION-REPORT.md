# CO-CUTOVER-001 — Production Data Cutover Validation Report

**Programme:** CO-CUTOVER-001  
**Status:** AWAITING ADMINISTRATOR REVIEW  
**deletionPerformed:** false  
**Date:** 2026-07-27  
**Authority:** Super Administrator must approve before any execute  

---

## Executive summary

Catalyst One is prepared for a **controlled production data cutover** that removes demo/development transactional data while preserving all enterprise masters and all genuine live business records.

This report is **analysis-only**. **No deletion has been performed.**

Cutover execution (when approved) uses the existing Super Admin **Production Reset** engine (CO-ADMIN-004) with preset **`demo_data_only`**, strengthened demo heuristics, and mandatory dry-run → password + typed confirmation.

---

## Constitutional Health Check

| Principle | Result |
|-----------|--------|
| Single Implementation (Production Reset engine) | GREEN — no parallel wipe tooling |
| Master / Identity preservation | GREEN — preserved category list expanded |
| Live transaction preservation | GREEN — demo heuristics only (not full truncate) |
| SSOT (Opportunity / Deal / ECM registries) | GREEN — soft-delete via existing models |
| No auto-delete on deploy | GREEN — flag default OFF |

**Verdict: GREEN** — analysis and tooling may proceed; **execute blocked until Super Admin review**.

---

## Phase 1 — Preserve master data

The following categories are **never** deleted by Production Reset / Cutover:

| Preserved category |
|--------------------|
| Users |
| Roles |
| Permissions |
| Organization |
| Products |
| Product Categories |
| Lenders |
| Lender Programs |
| Product-Lender Matrix |
| Workflow Definitions |
| Policy Engine |
| Rules Engine |
| Identity Registry |
| Enterprise Registry Metadata |
| Lookup Masters |
| Reference Masters |
| Source Master |
| Templates |
| Settings |
| Document Type / Definition masters |
| Audit configuration |
| Enterprise Decision Ledger history |
| Soft-delete Recovery ledger |
| Production Reset run history |

---

## Phase 2 — Preserve live data

Unmarked production records remain, including:

- Live Contacts · Live Companies  
- Live Opportunities · Live Deals  
- Live Tasks · Live Documents · Live Notes  
- Live Activities · Live Timelines  

Heuristic matching is intentionally **narrow**. Records without DEMO/TEST/UAT/`demo-seed`/`.demo` markers are treated as **live** and retained.

---

## Phase 3 — Remove demo data (planned — not executed)

When the administrator approves execute (flag ON), soft-delete (timeline hard-delete when selected) may remove:

| Family | Demo targeting signals |
|--------|------------------------|
| Contacts | Name Demo/Test/UAT/Sample · `demo@` / `.demo` email · `createdBy=demo-seed` |
| Companies | Company name Demo/Test/Sample/UAT · `createdBy=demo-seed` · `.demo` website |
| Opportunities | Number DEMO/TEST/UAT/SAMPLE · demo names/emails · `createdBy=demo-seed` |
| Deals | Number DEMO/TEST/UAT · import batch · demo names · `createdBy=demo-seed` |
| Deal children | Tasks, documents, notes, notifications, activities, timeline linked to matched deals |
| Client-local demo | Already gated by `CATALYST_DEMO_SEEDS_ENABLED=false` on production builds |

**Not removed as transactional wipe:** EME metric snapshots — they are **rebuilt** in Phase 4 from remaining live entities.

---

## Phase 4 — Rebuild derived data (after execute only)

After a successful demo cleanup:

1. Administration → **Enterprise Metrics** → **Force Recalculate** (EME)  
2. Confirm User Home / **RM Workspace** metrics refresh from live Opportunities / Deals / ETE  
3. Confirm Mission Control / EBI surfaces consume EME / EBI compose (no parallel formulas)  
4. Confirm dashboard Visual Analytics prefers EME snapshots  
5. Confirm production builds keep `CATALYST_DEMO_SEEDS_ENABLED` false  

Regenerated values must reflect **only remaining live production data**.

---

## Phase 5 — Validation checklist (post-execute)

Administrator must verify after cleanup + rebuild:

- [ ] Dashboards display only live business  
- [ ] Contact Strategy / Contacts show only live contacts  
- [ ] KPI totals reconcile with live Opportunities  
- [ ] My Deals counts reconcile with live Deals  
- [ ] No orphan Deal children for soft-deleted parents  
- [ ] Masters unchanged (spot-check users, products, lenders, product-lender matrix)  

---

## How to obtain live inventory counts

Super Admin → Administration → **Production Reset** → Analyse  

Or API (authenticated SUPER_ADMIN):

```http
GET /api/admin/production-reset?view=cutover
```

Response includes:

- `deletionPerformed: false`  
- `awaitingAdministratorReview: true`  
- `demoVsLive[]` — total vs demo candidates vs live retained estimate  
- `demoImpactPreview` — dry-run matched counts by entity  
- `rebuildPlan` · `validationChecklist` · `warnings`  

Static verify (no DB mutation):

```bash
node scripts/co-cutover-001-verify.mjs
```

---

## Recommended execute sequence (only after this report is approved)

1. Review this report + on-screen cutover analyse (`view=cutover`).  
2. Prefer preset **Remove Demo Data Only** — do **not** use full Production Cutover if live deals/opportunities must remain.  
3. Set `PRODUCTION_RESET_ENABLED=true` and `NEXT_PUBLIC_PRODUCTION_RESET_ENABLED=true` for the cutover window only.  
4. Dry-run → review impact → Execute with password + typed `RESET PRODUCTION DATA`.  
5. EME Force Recalculate.  
6. Complete Phase 5 checklist.  
7. Set flags back to `false`.  

---

## Current run state

| Item | Value |
|------|--------|
| Deletion performed | **false** |
| Administrator review | **Required** |
| Safe to execute | **No** — pending review |
| Engine readiness | Production Reset (CO-ADMIN-004) + cutover analyse (CO-CUTOVER-001) |

---

## Gaps / residual risk

1. **False negatives:** Demo rows without DEMO/TEST prefixes or `demo-seed` creator may remain — sample review recommended.  
2. **False positives:** A live contact legally named “Test …” could match heuristics — review demo candidate samples before execute.  
3. **ETE local/client tasks** outside Prisma Deal tasks are out of Postgres reset scope.  
4. **Companies** are inventoried for demo heuristics; soft-delete of companies is not yet in the execute path (contacts/opportunities/deals are). Company demo soft-delete can be added in a follow-up after admin approval of scope.  
5. Messages / ECE portal sessions remain N/A (not durable wipe tables).

---

## Verdict

**Analysis complete. Ready for Super Administrator review.**  

**Do not execute deletion until this report is explicitly approved.**

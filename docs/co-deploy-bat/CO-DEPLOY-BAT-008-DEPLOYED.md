# CO-DEPLOY-BAT-008 — Dual App Deployment Report

**Status:** DEPLOYED · **DEVELOPMENT STOPPED — AWAITING PRODUCT OWNER BAT**  
**Date:** 2026-08-05  
**Priority:** CRITICAL  
**PO Approval:** Deploy latest approved build — Catalyst One then Wealth Partner App

---

## CATALYST ONE

| Field | Value |
|-------|--------|
| **Live URL** | https://catalyst-one-two.vercel.app |
| **Deployment URL** | https://catalyst-kdee6b9xw-rupee-catalyst.vercel.app |
| **Inspect** | https://vercel.com/rupee-catalyst/catalyst-one/DufDkYmh1C2R5Q94pVQZzG347r2F |
| **Version** | `0.9.0-internal` |
| **Build Number** | `dpl_DufDkYmh1C2R5Q94pVQZzG347r2F` |
| **Deployment Time (IST)** | 2026-08-05 16:14:20 IST |
| **Git Commit Hash** | `c8829a0819dbe15f3a609b2140e53f4a6f5943db` (workspace HEAD; deploy includes approved local working-tree work) |
| **Ready State** | READY (production alias) |

---

## WEALTH PARTNER APP

| Field | Value |
|-------|--------|
| **Live URL** | https://wealth-partner-app.vercel.app |
| **Deployment URL** | https://wealth-partner-kg1d5998a-rupee-catalyst.vercel.app |
| **Inspect** | https://vercel.com/rupee-catalyst/wealth-partner-app/CRbD9gdVMdpJaR7Y5FCRFRey33Ya |
| **Version** | `0.9.3` |
| **Build Number** | `dpl_CRbD9gdVMdpJaR7Y5FCRFRey33Ya` |
| **Deployment Time (IST)** | 2026-08-05 16:15:38 IST |
| **Git Commit Hash** | *No git history in WP workspace — use deployment ID* |
| **Ready State** | READY (production alias) |

---

## Pre-deployment validation

| Check | Result |
|-------|--------|
| TypeScript (frontend `tsc --noEmit`) | ✅ |
| TypeScript (server `tsc -p tsconfig.server.json`) | ✅ |
| Production build (local `npm run build`) | ✅ |
| Prisma schema validate (via `.env.local`) | ✅ |
| Additive migrate deploy (indexes + enum only) | ✅ Applied — **no row deletes / truncates / reseeds** |
| Wealth Partner `npm run build` | ✅ |
| Deploy order | ✅ Catalyst One → Wealth Partner App |

### Schema ops (data-safe)

Applied only:

1. `20260805120000_co_bug_lsc_institution_lookup` — `CREATE INDEX IF NOT EXISTS` on ECM contacts  
2. `20260805140000_co_lender_ecosystem_001_contact_departments` — `ALTER TYPE … ADD VALUE IF NOT EXISTS` for `sales` / `regional_head`

**Confirmation: no live Enterprise business rows were deleted, truncated, reset, re-seeded, or overwritten.**

### Deploy engineering note

First two C1 remote builds OOM’d on Vercel 8GB builders (`SIGKILL`). Mitigations shipped with this deploy (build-only):

- `max-old-space-size=4096`  
- `experimental.cpus: 1`  
- `vercel.json` `NODE_OPTIONS`

---

## Smoke testing (automated, unauthenticated)

### Catalyst One

| Check | Result |
|-------|--------|
| `/login` | ✅ HTTP 200 |
| Contacts / Customers / My Opportunities / My Deals / Documents / Tasks / Lenders / Mission Control / Admin / Dashboard / Loan Files / Lender Registry / Product Master | ✅ HTTP 307 → auth (healthy) |
| Partner Gateway `/api/partner/health` | ✅ `ok` · `persistence: prisma` |
| Auth-gated admin metrics without session | ⚠️ HTTP 500 (expected gate is typically 401 — flag for BAT; not a route break) |
| Authenticated deep BAT (login → desks) | ⚠️ Manual — Product Owner BAT credentials |

### Wealth Partner App

| Check | Result |
|-------|--------|
| `/` Home | ✅ HTTP 200 |
| `/login` | ✅ HTTP 200 |

---

## Release summary

### Features included (working tree → production)

- Lender Sales Contact lookup performance + institution indexes  
- Lender Pipeline Kanban density + Deal Workspace chrome compression (CO-UX-022)  
- CO-LENDER-ECOSYSTEM-001 activation wiring (Prisma lender contacts/documents APIs; additive departments)  
- Prior certified / BAT work already in the working tree (Product Master, EME, RM Workspace, Opportunity runtime, Partner Gateway, etc.)

### BAT fixes included

- LSC registry lookup timeouts / unavailable errors  
- Deal Workspace Kanban-first viewport  
- Lender contact/document persistence cutover (API-first)

### Known issues

1. Unauthenticated `/api/admin/enterprise-metrics` returned HTTP 500 (should prefer 401) — confirm during BAT.  
2. Authenticated end-to-end smoke deferred to Product Owner BAT (credentials not exercised in this automated pass).  
3. WP app has no local git commit hash — track by Vercel deployment ID.  
4. Lender-owned Policy Library + Program Document LOD matrix remain gaps (documented in CO-LENDER-ECOSYSTEM-001).

### Data protection

**Confirmed: deploy was code (+ additive schema indexes/enum) only. No live Enterprise data was modified, deleted, or corrupted.**

---

## Stop condition

**STOP DEVELOPMENT.**  
Do not begin any new implementation.  
Await Product Owner BAT and certification.

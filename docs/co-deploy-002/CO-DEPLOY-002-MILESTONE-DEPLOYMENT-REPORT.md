# CO-DEPLOY-002 — Milestone Deployment Report

**Date:** 2026-08-07  
**Authorization:** Product Owner milestone deployment for review  
**Scope:** Certified working-tree implementation (Organization, CCC, Documents, EAR, Radar, nav, readiness fixes)  
**Architecture:** No redesign · no new features · no frozen terminology changes  

---

## Pre-deployment validation

| Gate | Result |
|------|--------|
| Clean production build (`npm run build`, 8GB heap) | ✅ PASS |
| TypeScript (`tsc --noEmit`) | ✅ PASS (0 errors) |
| Lint (`next lint`) | ✅ PASS (warnings only; 0 errors) |
| Milestone verifies | ✅ See below |
| Auth (frozen admin credentials) | ✅ Unchanged |
| Routing (primary + org + admin pages in build output) | ✅ Present in build route table |
| Migrations | ⚠️ Present in repo — **apply on production DB if not yet applied** (see Manual ops) |
| Deploy-scope blockers from CO-ORG-008 | Soft Pilot review deploy authorized by PO; full OS blockers remain labeled |

### Verification scripts (milestone)

| Script | Result |
|--------|--------|
| `verify:co-org-001` | PASS |
| `verify:co-org-002` | PASS |
| `verify:co-org-003` | PASS |
| `verify:co-org-004` | PASS |
| `verify:co-org-006` | PASS |
| `verify:co-org-007` | PASS (PARTIAL nav warnings) |
| `verify:co-org-008` | PASS |
| `verify:co-ux-021` | PASS |
| `verify:co-ccc-001` | PASS |
| `verify:co-radar-003` | PASS |
| `verify:co-chanakya-radar-003` | PASS |
| `verify:co-doc-003` | PASS (label asserts aligned to Package UI) |
| `verify:co-doc-005` | PASS |

### Build note

Local build required Node heap **8192** (`package.json` build script updated from 4096) after OOM at 4GB.

---

## Deployment status

| Field | Value |
|-------|--------|
| Git Branch | `compass-hl03-conversation-first` |
| Latest Commit Hash (HEAD) | `95973c596c9b370f957f9a137c1e42878d6454c5` |
| Working tree | **Dirty** — milestone work deployed from local tree (not yet committed) |
| Build Status | ✅ Local production build PASS |
| TypeScript Status | ✅ PASS |
| Lint Status | ✅ PASS (0 errors) |
| Verification Status | ✅ Milestone gates PASS |
| Deployment Status | ✅ **Ready** (Production) |

### Vercel production result (current alias)

| Field | Value |
|-------|--------|
| Deployment ID | `dpl_7WJU8KfurrP8Vm6ptGfFDjAbh5xL` |
| Deployment URL | https://catalyst-mj2445xad-rupee-catalyst.vercel.app |
| Production URL | https://catalyst-one-rupee-catalyst.vercel.app |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/7WJU8KfurrP8Vm6ptGfFDjAbh5xL |
| Status | ● Ready |
| Aliases | `catalyst-one-rupee-catalyst.vercel.app` · `catalyst-one-two.vercel.app` · `catalyst-one-rupeecatalyst-7712-rupee-catalyst.vercel.app` |

Prior Ready in same session: `dpl_AiG6g9ZJUw6zi2CT5TTq42pX93m8` (https://catalyst-3vn22rmkg-rupee-catalyst.vercel.app). Earlier Error: `dpl_HnQcUvzGg2EJpwpxWST87SbKwkxJ` (~47m).

**Production alias (Ready):** https://catalyst-one-rupee-catalyst.vercel.app

---

## Manual ops (required for full prisma features)

Apply pending migrations on production Postgres if not already applied:

- `20260807130000_co_org_001_organization_workspace`
- `20260807150000_co_ccc_001_corporate_compliance_center`
- `20260807180000_co_org_003_enterprise_activity_registry`
- `20260807190000_co_ux_021_enterprise_business_notes`
- Document package migrations (prepared / prior)

Confirm env:

- `ENTERPRISE_PERSISTENCE_MODE=prisma`
- `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma`
- Demo seeds **off** for honest BAT

---

## Business certification summary (milestone)

| Module | Status |
|--------|--------|
| Organization Workspace | Activated — pages under `/organization/*` |
| Corporate Compliance Center | Activated — `/organization/compliance-center` · verify PASS |
| Enterprise Document Repository | Operational authoring (Document Center); browser-local durability caveat |
| Enterprise Document Package Builder | CO-DOC-003/005 verify PASS |
| Enterprise Document Dispatch Engine (EDDE) | Included in document platform programmes (verify via prior DOC gates) |
| Enterprise Activity Registry | CO-ORG-003 engineered · dual-write · verify PASS |
| CHANAKYA Radar (CO-RADAR-003) | Fixes verified PASS |
| Organization activations | Org MDM / dashboard / settings / security / business-config shipped |
| Navigation updates | CO-ORG-007 PARTIAL (Investments Soon · MC scaffolds · ADMIN/ORG drift) |
| Production readiness fixes | Mock quarantine CO-ORG-004 · Business Notes CO-UX-021 · readiness reports |

### Remaining production blockers (honest — Soft Pilot review)

From CO-ORG-008 (still apply for **full** OS claim):

1. Live E2E Scenario Pack not Pass  
2. Document Registry durability (browser-local)  
3. Accounting commercial SSOT unbound  
4. ETE/EDC/EDL in-memory defaults  
5. Migrations must be confirmed on prod DB  
6. Demo seeds must stay off  

**This deployment is for Product Owner review / Soft Pilot BAT — not a claim of full Enterprise Go-Live certification.**

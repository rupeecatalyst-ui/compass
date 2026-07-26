# CO-ARCH-002 — Wave 2 Completion Report

**Program:** CO-ARCH-002  
**Wave:** 2 — Enterprise Deal API Engine  
**Status:** **Complete — paused for ARB review**  
**Date:** 2026-07-21  
**Baseline:** Wave 1 Approved · Wave 0 Approved (A1–A3) · F0 · Execution Program v1.0  

---

## Scope adherence

| In scope | Done |
|----------|------|
| Deal Create / Read / Update / Search APIs | ✅ |
| Timeline / Transitions / Snapshot APIs | ✅ |
| Counterparty / Document / Task / Activity APIs | ✅ |
| Deal Health APIs (placeholder) | ✅ GET reserved · PATCH 501 |
| Archive / Restore / Soft-delete | ✅ |
| Centralized validation | ✅ `deal-validation.ts` |
| Audit via append-only timeline (+ ESD on delete/restore) | ✅ |
| JWT auth + org tenancy (pilot org) | ✅ |
| Feature flags default OFF | ✅ `DEAL_REGISTRY_API_ENABLED` + prior flags |
| UI / module migration | ❌ **Forbidden — not done** |
| Dual-write / dual-read / import | ❌ Deferred Wave 3+ |

---

## 1. API Inventory

| Capability | Method | Path |
|------------|--------|------|
| Search Deals | `GET` | `/api/enterprise-deals` |
| Create Deal | `POST` | `/api/enterprise-deals` |
| Read Deal | `GET` | `/api/enterprise-deals/:dealId` |
| Update Deal | `PATCH` | `/api/enterprise-deals/:dealId` |
| Soft-delete Deal | `DELETE` | `/api/enterprise-deals/:dealId` |
| Archive Deal | `POST` | `/api/enterprise-deals/:dealId/archive` |
| Restore Deal | `POST` | `/api/enterprise-deals/:dealId/restore` |
| Transition Stage | `POST` | `/api/enterprise-deals/:dealId/transitions` |
| Timeline (read) | `GET` | `/api/enterprise-deals/:dealId/timeline` |
| List Snapshots | `GET` | `/api/enterprise-deals/:dealId/snapshots` |
| Append Snapshot | `POST` | `/api/enterprise-deals/:dealId/snapshots` |
| Deal Health (placeholder) | `GET` | `/api/enterprise-deals/:dealId/health` |
| Deal Health write | `PATCH` | `/api/enterprise-deals/:dealId/health` → **501** |
| List Counterparties | `GET` | `/api/enterprise-deals/:dealId/counterparties` |
| Assign Counterparty | `POST` | `/api/enterprise-deals/:dealId/counterparties` |
| Update Counterparty | `PATCH` | `/api/enterprise-deals/:dealId/counterparties/:assignmentId` |
| Remove Counterparty | `DELETE` | `/api/enterprise-deals/:dealId/counterparties/:assignmentId` |
| Pipeline update | `POST` | `/api/enterprise-deals/:dealId/counterparties/:assignmentId/pipeline` |
| List Documents | `GET` | `/api/enterprise-deals/:dealId/documents` |
| Attach Document | `POST` | `/api/enterprise-deals/:dealId/documents` |
| Update Document | `PATCH` | `/api/enterprise-deals/:dealId/documents/:linkId` |
| List Tasks | `GET` | `/api/enterprise-deals/:dealId/tasks` |
| Add Task | `POST` | `/api/enterprise-deals/:dealId/tasks` |
| Update Task | `PATCH` | `/api/enterprise-deals/:dealId/tasks/:taskId` |
| List Activities | `GET` | `/api/enterprise-deals/:dealId/activities` |
| Record Activity | `POST` | `/api/enterprise-deals/:dealId/activities` |
| Update Activity | `PATCH` | `/api/enterprise-deals/:dealId/activities/:activityId` |

Envelope: `{ success, data }` / `{ success: false, error }` via existing Catalyst One API helpers.

---

## 2. Route Map

```
src/app/api/enterprise-deals/
  route.ts                          GET search · POST create
  _lib/route-utils.ts               API flag + persistence guards
  [dealId]/
    route.ts                        GET · PATCH · DELETE
    archive/route.ts                POST
    restore/route.ts                POST
    transitions/route.ts            POST
    timeline/route.ts               GET
    snapshots/route.ts              GET · POST
    health/route.ts                 GET · PATCH(501)
    counterparties/
      route.ts                      GET · POST
      [assignmentId]/
        route.ts                    PATCH · DELETE
        pipeline/route.ts           POST
    documents/
      route.ts                      GET · POST
      [linkId]/route.ts             PATCH
    tasks/
      route.ts                      GET · POST
      [taskId]/route.ts             PATCH
    activities/
      route.ts                      GET · POST
      [activityId]/route.ts         PATCH
```

Service SSOT: `server/services/enterprise-deal/enterprise-deal.service.ts`  
Repository: `server/repositories/enterprise-deal/enterprise-deal.repository.ts`

---

## 3. Authorization Matrix

| Concern | Rule |
|---------|------|
| Authentication | Bearer JWT via `requireAccessToken` — all endpoints |
| Unauthenticated | `401 UNAUTHORIZED` |
| Organization tenancy | Service resolves `resolvePilotOrganizationId()`; every query filters `organizationId` |
| Cross-tenant | Blocked — Deal IDs looked up only within pilot org |
| API enablement | `DEAL_REGISTRY_API_ENABLED` must be `true`; else **`404 DEAL_API_DISABLED`** |
| Persistence | `ENTERPRISE_PERSISTENCE_MODE=prisma` required; else `503` |
| Role model (Wave 2) | Any authenticated role may invoke Deal APIs (operational, not admin-master). Soft-delete uses ESD with actor identity. |
| Health write | Explicitly **501** — no bypass |

---

## 4. Validation Matrix

| Operation | Required / rules |
|-----------|------------------|
| Create | `productFamily` (enum), `grossStage`; reject client `id` as authority; allocate Deal Number server-side |
| Update / Transition | `rowVersion` required; mismatch → `409 DEAL_VERSION_CONFLICT` |
| Transition | `toGrossStage`; closed-deal stage change requires explicit lifecycle when applicable |
| Counterparty | `counterpartyType` enum + `counterpartyRegistryId`; at most one primary (partial unique index) |
| Document | status enum when provided |
| Task / Activity | `title` required on create |
| Snapshot append | `reason` + `snapshot` object |
| Enums | productFamily, lifecycle, operational, priority, counterpartyType, document status |

Central module: `server/services/enterprise-deal/deal-validation.ts`

---

## 5. Audit Coverage Report

| Write operation | Timeline event | Other audit |
|-----------------|----------------|-------------|
| Create Deal | `deal_created` | Snapshot v1 |
| Update Deal | `deal_updated` | — |
| Soft delete | `soft_deleted` | ESD record + ESD audit |
| Archive | `archived` | — |
| Restore | `restored` | ESD restore audit when was deleted |
| Transition | `stage_transition` | Snapshot on stage change |
| Assign / update / remove counterparty | `counterparty_*` | — |
| Pipeline update | `counterparty_updated` | — |
| Attach / update document | `document_*` | — |
| Task create / update | `task_*` | — |
| Activity create / update | `activity_*` | — |
| Append snapshot | `snapshot_appended` | Append-only `enterprise_deal_snapshots` |
| Health PATCH | none | Rejected 501 |

Timeline table remains **insert-only** (ARB A2). Snapshots never mutate prior versions (ARB A1).

---

## 6. Feature Flag Verification

| Flag | Default | Wave 2 state |
|------|---------|--------------|
| `DEAL_REGISTRY_API_ENABLED` | OFF | **OFF** — all Deal routes return 404 |
| `DEAL_REGISTRY_DUAL_WRITE` | OFF | OFF |
| `DEAL_REGISTRY_PORT_RUNTIME` | OFF | OFF |
| `DEAL_REGISTRY_IMPORT_ENABLED` | OFF | OFF (import not in Wave 2) |
| `DEAL_REGISTRY_BLOCK_LOCAL_WRITE` | OFF | OFF |

`.env.example` documents all five. Soft Go-Live UX unchanged.

Verify: `node scripts/co-arch-002-w2-verify.mjs`

---

## 7–11. Certifications

### Engineering
- [x] API routes + service + repository for authorized capabilities  
- [x] TypeScript clean for Deal modules (`tsc` Deal paths)  
- [x] No UI module changes / no dashboard consumers  
- [x] Flags default OFF; API gated  

### Data
- [x] All writes org-scoped; F0 child entities belong to Deal  
- [x] Optimistic concurrency via `rowVersion`  
- [x] Append-only timeline + snapshots preserved  

### Business
- [x] Endpoints are business capabilities (Create Deal, Assign Counterparty, …) — not screen saves  
- [x] Production behavior unchanged while flags OFF  

### AI
- [x] Health reserved only; no parallel AI case identity  
- [x] Intelligence link tables untouched / unused  

### Production readiness
- [x] Idle by default (`DEAL_API_DISABLED`)  
- [x] Rollback: leave flags OFF (routes inert)  
- [x] **STOP** — do not start Wave 3 until ARB Approves Wave 2  

---

## Deliverable index

| # | Artifact |
|---|----------|
| 1 | This completion report |
| 2–6 | Sections above (Inventory, Route Map, AuthZ, Validation, Audit, Flags) |
| 7–11 | Certification checklists above |
| Script | `scripts/co-arch-002-w2-verify.mjs` |

---

## ARB decision request

Please **Approve Wave 2** to authorize **Wave 3 (Dual-Write Create/Save Paths)** only.

**STOP:** Do not begin Wave 3 or any UI integration until ARB Approves this Wave 2 package.

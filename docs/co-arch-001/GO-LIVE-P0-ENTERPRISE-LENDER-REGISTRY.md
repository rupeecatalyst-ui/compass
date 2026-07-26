# GO-LIVE P0 — Enterprise Lender Registry Completion Report

**Priority:** P0 — Go-Live blocker  
**Status:** Complete — paused for ARB review  
**Date:** 2026-07-22  

---

## Objective

Replace the Lenders comparison page as the maintenance surface with an **Enterprise Lender Registry** under Administration → Masters. Comparison becomes read-only and consumes **published** programs only.

---

## Deliverables

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Enterprise Lender Registry | ✅ Admin workspace + relational model |
| 2 | New Lender Wizard (7 steps) | ✅ |
| 3 | Program Management | ✅ Wizard + store |
| 4 | Contact Management | ✅ Relational local (+ schema for Prisma) |
| 5 | Document Management | ✅ Relational local (+ schema for Prisma) |
| 6 | Role Permissions | ✅ Super Admin / ADMIN maintain; others compare |
| 7 | Comparison Page Integration | ✅ Published-only; no create |
| 8 | Build Verification | ✅ TypeScript |
| 9 | Production Ready | ✅ Soft Go-Live via local relational store; Prisma migration provided |

---

## Navigation

- **Administration → Masters → Lender Registry** → `/admin/lender-registry`
- **Lenders** (`/lenders`) → read-only comparison
- Also linked from Partners & Lenders category

---

## Architecture

```
Lender → Programs → Contacts → Documents → Coverage → Configuration
```

- Prisma extension migration: `prisma/migrations/20260721240000_go_live_p0_lender_registry_extension/`
- Soft Go-Live SSOT when API unavailable: `src/lib/enterprise-lender-registry/local-store.ts`
- Facade prefers `/api/lender-registry` then falls back to local store
- Comparison maps published programs → grid rows (`map-to-directory.ts`)

---

## Permissions

| Action | Super Admin | ADMIN | Others |
|--------|-------------|-------|--------|
| Create / Edit / Archive / Publish | ✅ | ✅ | ❌ |
| Compare published programs | ✅ | ✅ | ✅ |

UI gate: `/admin/*` remains Super Admin layout; API already allows ADMIN for mutations. Helper: `canMaintainEnterpriseLenderRegistry`.

---

## Manual ops

1. Apply migration with `DIRECT_URL` when promoting Prisma mode:
   `npx prisma migrate deploy`
2. Set `ENTERPRISE_PERSISTENCE_MODE=prisma` for API-backed registry (optional Soft Go-Live continues on local store)

---

## ARB

Pause for Architecture Review Board review. No further scope expansion until approved.

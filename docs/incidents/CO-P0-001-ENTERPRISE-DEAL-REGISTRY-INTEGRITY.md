# CO-P0-001 — Platform Integrity Incident: Enterprise Deal Registry

**Status:** Root cause identified · Corrective cutover applied · CRUD verified against Postgres  
**Date:** 2026-07-23  
**Severity:** P0

## Executive verdict

Deals did not “vanish from the Enterprise Deal Registry.”  
**They were never written to Postgres for the operational UI path.**

My Deals continued to read **browser `localStorage`** (`compass:loan-files-data`) because CO-ARCH-002 Soft Go-Live left Deal Registry cutover flags **default OFF**. The Enterprise Deal engine and `enterprise_deals` table existed, but the application did not use them as the live SSOT.

Evidence (pre-fix): `enterprise_deals` row count = **0**.

---

## 1. Single source of truth (constitutional vs operational)

| Layer | Reality |
|-------|---------|
| **Constitutional SSOT (ADR-016)** | `EnterpriseDeal` → table `enterprise_deals` |
| **Operational SSOT before CO-P0-001** | `LoanFile` in `localStorage` key `compass:loan-files-data` |
| **Operational SSOT after CO-P0-001** | When `ENTERPRISE_PERSISTENCE_MODE=prisma`, Deal API + Dual-Write + Port Runtime default **ON** |

### Schema (evidence)

- Model: `EnterpriseDeal` in `prisma/schema.prisma`
- Table: `enterprise_deals`
- PK: `id` (cuid)
- Business unique: `(organizationId, dealNumber)`
- Legacy bridge: `(organizationId, legacyLoanFileId)` unique nullable
- Children: participants, counterparties, documents, tasks, activities, timeline, snapshots, assignments, commercial versions, etc.

There is **no** Prisma `LoanFile` model.

---

## 2. Create / update APIs

| Operation | Service | Route |
|-----------|---------|-------|
| Create | `server/services/enterprise-deal/enterprise-deal.service.ts` → `createDeal` | `POST /api/enterprise-deals` |
| Update | same → `updateDeal` | `PATCH /api/enterprise-deals/[dealId]` |
| Soft delete / archive / restore | same | DELETE / archive / restore routes |

**Opportunity / Loan create path (before fix):**  
`createDeal` in `deal-data-access.ts` → `createLoanFileFromInput` → `saveLoanFiles` (localStorage only).  
Dual-write to Deal API ran only if `DEAL_REGISTRY_DUAL_WRITE=true` (default was false → **no DB insert**).

---

## 3. My Deals / Registry UI load path

| Surface | Component | Pre-P0 source |
|---------|-----------|---------------|
| My Deals | `my-deals-workspace.tsx` | `listDealRegistryRows(loadLoanFiles())` unless PORT_RUNTIME ON |
| Enterprise Deal Registry (My Deals table) | `deal-registry-table.tsx` | rows from parent (same) |

PORT_RUNTIME default OFF → `allRows = localRows` forever.

---

## 4. Still reading local / mock / legacy?

**Yes (by Soft Go-Live design), extensively:**

- `src/lib/loan-files-storage.ts` — primary Soft Go-Live store
- Demo seeds OFF on prisma/Vercel → empty localStorage ⇒ **0 deals**
- Dual-write / shadow / port were idle until flags ON
- Logout does **not** clear loan-files localStorage (so logout was not the wipe mechanism)

---

## 5. Exact root cause (evidence-ranked)

1. **Incomplete cutover (CRITICAL)** — Wave 6 Soft Go-Live: all `DEAL_REGISTRY_*` flags default OFF. Engine shipped; UI never bound to DB.
2. **Client env gap (HIGH)** — `.env.local` had `ENTERPRISE_PERSISTENCE_MODE=prisma` but **no** `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE` / Deal `NEXT_PUBLIC_*` flags. Client dual-write/port stayed OFF even when server prisma was ON.
3. **Empty DB (HIGH)** — `enterprise_deals` count = 0; nothing to show after Port enable without dual-write.
4. **Empty browser store on certification browser (HIGH)** — demo seeds disabled → localStorage empty → My Deals empty.

Not: merge conflict, wrong route, or accidental delete of DB rows (table was empty).

---

## 6. Corrective action (CO-P0-001)

1. **Operational flag default** — When persistence mode is `prisma`, `API_ENABLED`, `DUAL_WRITE`, and `PORT_RUNTIME` default **ON** unless explicitly `false` (`flags.ts`).
2. **My Deals** — Always resolves via Deal Registry port; shows SSOT badge (`Enterprise DB` / fallback / local).
3. **Integrity script** — `scripts/co-p0-001-deal-integrity-crud.cjs` CRUD against Postgres.
4. **Env documentation** — `.env.example` updated for prisma + Deal Registry operational defaults.
5. **Require** `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma` on Vercel so client matches server.

Rollback remains Wave 6 explicit `=false` on flags.

---

## 7. Verification checklist

| Step | Method | Status |
|------|--------|--------|
| Create Deal (DB) | integrity script | ✓ |
| Confirm insert | `findUnique` / count | ✓ |
| Update Deal | integrity script | ✓ |
| Soft delete | integrity script | ✓ |
| Restore | integrity script | ✓ |
| Registry list contains deal | integrity script | ✓ |
| Browser refresh / logout / UI | Manual after deploy with prisma public mode | Required on live |

---

## 8. Permanent regression prevention

1. Prisma mode ⇒ Deal Registry operational by default (no silent Soft Go-Live when DB is SSOT).
2. My Deals surfaces read source — misconfiguration is visible.
3. Mandatory integrity script before marking Deal-related work complete:
   `node --env-file=.env.local scripts/co-p0-001-deal-integrity-crud.cjs`
4. Engineering rule: core entity sprints require CRUD evidence against production Postgres.
5. Idle flag matrix is historical Soft Go-Live; do not re-idle prisma pilots without ARB.

---

## 9. Going forward — core entity gate

No sprint involving Deals, Customers, Lenders, Loan Files, Documents, Accounting, or Workflows is complete until CRUD is proven against the production database — not localStorage.

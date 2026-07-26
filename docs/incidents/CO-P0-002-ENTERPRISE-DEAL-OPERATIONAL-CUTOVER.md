# CO-P0-002 — Enterprise Deal Registry Operational Cutover

**Status:** Phase B cutover implemented  
**Related:** CO-P0-001 RCA · CO-ARCH-002 Waves 1–6 Soft Go-Live

---

## Milestone separation (mandatory)

| Phase | Meaning | Status |
|-------|---------|--------|
| **A — Implementation Complete** | Schema, API, dual-write, port, DAL exist under Soft Go-Live (flags idle) | Done in CO-ARCH-002 |
| **B — Operational Cutover Complete** | Prisma mode ⇒ Enterprise Deal Registry is **default runtime SSOT** without manual Deal flag enablement | **This sprint (CO-P0-002)** |
| **C — Legacy Decommissioned** | localStorage Deal store removed / `BLOCK_LOCAL_WRITE` permanent; no dual path | **Future — not claimed here** |

Do **not** report A and B as the same milestone again.

---

## Root cause summary (why cutover was needed)

Phase A delivered the engine with Wave 6 Soft Go-Live **flags default OFF**.  
My Deals / Opportunity / Loan Workspace continued to use browser `localStorage` (`compass:loan-files-data`).  
`enterprise_deals` stayed empty. Deals appeared to “disappear” after refresh / new browser / demo-off environments.

---

## Runtime after Phase B (prisma)

When:

```text
ENTERPRISE_PERSISTENCE_MODE=prisma
NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma
```

and Deal-specific flags are **unset** (or explicitly `true`):

| Capability | Behaviour |
|------------|-----------|
| Deal API | Enabled |
| Dual-write | Enabled (create/update persist to Postgres) |
| Port runtime | Enabled (My Deals reads Enterprise Deal Registry) |
| Opportunity / Loan Workspace consumers | Enabled (DAL prefers Enterprise + hydrates sync cache) |

Deal-specific `=false` remains **emergency rollback only**.

---

## Single source of truth (Phase B)

**Operational SSOT:** Postgres `enterprise_deals` (Enterprise Deal Registry).

| Surface | Read path |
|---------|-----------|
| My Deals | `loadMyDealsDealRegistryRows` → Deal API |
| Opportunity Workspace | `loadDeals("opportunity_workspace")` → DAL enterprise cache |
| Loan Workspace | `loadDeals("loan_workspace")` → DAL enterprise cache |

Local storage may still hold a **workspace shape cache** for mapping stubs (Phase C removes dependency). Production list/open identity comes from Enterprise Deal Registry when prisma is on.

---

## Changes implemented

1. Consumer flags default ON under prisma (`flags.ts`)
2. DAL enterprise read cache + hydrate (`deal-data-access.ts`)
3. Loan Workspace + Opportunity Workspace hydrate on mount
4. My Deals SSOT badge / port path (CO-P0-001)
5. Gate: `scripts/co-p0-002-operational-cutover-gate.cjs`
6. Integrity CRUD: `scripts/co-p0-001-deal-integrity-crud.cjs`
7. `npm run verify:deal-registry` wired into production build when prisma

---

## Validation policy (shared pilot SSOT)

| Phase | Script | DB writes |
|-------|--------|-----------|
| **1 — Read-only** | `npm run verify:deal-registry:readonly` | **None** |
| **2 — CRUD** | `npm run verify:deal-registry:crud` | Temporary test deal create/update/delete — **requires explicit approval** |

Do not run Phase 2 against the shared Pilot / Platform database without operator approval.

---

## Deployment sequence (mandatory — do not skip)

1. Complete **local** operational cutover (`.env.local`)
2. Complete **local** Phase 2 CRUD validation (only after explicit approval)
3. Verify browser uses Enterprise Deal Registry **locally**
4. Verify My Deals · Opportunity Workspace · Loan Workspace **locally**
5. After local success → update **Development / Preview** env if applicable
6. Only after Preview validation → update **Vercel Production** (requires explicit approval)

**Do not modify Vercel Production environment variables until step 6 is explicitly approved.**

Local Phase 2 config SSOT: `docs/incidents/CO-P0-002-LOCAL-PHASE2-CONFIG.md`

---

## Confirmation

**Enterprise Deal Registry is the default runtime under prisma persistence (Phase B).**  
Phase C (full localStorage decommission) is explicitly **not** complete.

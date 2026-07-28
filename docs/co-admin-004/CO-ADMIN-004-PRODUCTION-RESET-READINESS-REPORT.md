# CO-ADMIN-004 — Production Reset Readiness Report

**Status:** Implemented (disabled by default)  
**Date:** 2026-07-22  
**Scope:** Administration → System Administration → Production Reset

---

## Executive summary

Catalyst One now includes a Super Administrator **Production Reset & Demo Data Cleanup Wizard**. It analyses transactional inventories, supports demo/cutover filters, dry-run impact, password + typed confirmation, transactional soft-delete with rollback on failure, immutable run audit, and cutover reports.

**Overall Readiness Score: 8.2 / 10**

Feature ships **disabled** (`PRODUCTION_RESET_ENABLED` default false). No automatic deletion occurs during implementation or deploy.

---

## Security Review

| Control | Status |
|--------|--------|
| Super Administrator role gate | ✅ API + intended UI audience |
| Feature permission key `admin.system_tools.production_reset` | ✅ Declared; enforced with SUPER_ADMIN |
| Feature flag default OFF | ✅ |
| Password re-verification on execute | ✅ |
| Typed confirmation `RESET PRODUCTION DATA` | ✅ |
| Second irreversible acknowledgement | ✅ |
| No SQL exposed to UI | ✅ Service/repository path only |
| Masters never deleted | ✅ Users, roles, products, lenders, registries, policies preserved |

## Permission Validation

- API rejects non–`SUPER_ADMIN` with 403.
- Execute/dry-run reject when flag is OFF (403 `PRODUCTION_RESET_DISABLED`).
- Analyse/status readable to Super Admin for readiness even when flag OFF (status/analyse); mutate paths require flag ON.

## Transaction Safety

- Execute uses `prisma.$transaction` with timeout/rollback on failure.
- Soft-delete dependency order: deal children → deals → opportunities → contacts.
- Contact/opportunity selection expands dependent deals to avoid FK orphans.

## Rollback Validation

- Transaction failure aborts all in-flight mutations (Prisma rollback).
- Soft-deleted rows remain recoverable via Recovery Center adapters where configured.
- Timeline hard-delete (when selected) is called out as irreversible in impact warnings.

## Audit Validation

- Every dry-run/execute writes `ProductionResetRun` ledger row (success/failure).
- Governance / EDL admin action recorded via `recordAdminGovernanceAction`.
- Report JSON + summary stored on the run record (Document Intelligence handoff surface).

## Performance

- Impact estimates ~2 ms/record heuristic.
- Batch soft-delete via `updateMany` / `deleteMany` inside one transaction.
- Caps at 50k IDs per entity family per run (documented limitation).

## Known Limitations

1. Messages / ECE portal sessions are not durable Postgres tables — counted as N/A.
2. Timeline is append-only — reset uses hard-delete only when Timeline is selected.
3. Client-local loan-file / note stores outside Prisma are out of scope.
4. Requires migration `20260722120000_co_admin_004_production_reset` before run history persists.
5. Document Intelligence blob storage is via run ledger JSON (not a separate DI upload pipeline yet).

## Manual ops before first execute

1. Apply Prisma migration for `production_reset_runs`.
2. Set `PRODUCTION_RESET_ENABLED=true` and `NEXT_PUBLIC_PRODUCTION_RESET_ENABLED=true` only for the cutover window.
3. Super Admin: Dry-run → review report → Execute with password + typed confirmation.
4. Disable flags after cutover.

## Verdict

**Ready for controlled Super Admin certification** with flag OFF in production until an explicit cutover window.

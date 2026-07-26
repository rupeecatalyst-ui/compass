# CO-ARCH-001 — Dry Run Readiness Package

**Program:** CO-ARCH-001 Wave 4 Track C  
**Classification:** DOC / OPS  
**Date:** 2026-07-21  
**Status:** Package ready — Dry Run execution deferred until ARB Wave 5 authorization

---

## 1. Dry Run Objective

Validate that Catalyst One can operate with PostgreSQL-backed Enterprise Master Data (Tier 1 + Tier 2) under controlled feature flags, with full rollback to constants SSOT.

---

## 2. Entry Criteria

| Criterion | Met? |
|-----------|------|
| Waves 1–4 implementation complete | ✅ (pending ARB close of Wave 4) |
| Migrations I1–I4c applied on target DB | ✅ |
| I3 seed ≥189 Reference Master rows | ✅ |
| Wave 4 Tier 2 seed applied | ✅ |
| Verify scripts green | ✅ (local) |
| Production build green | Wave 4 gate |
| Auth unchanged | ✅ |
| Rollback procedure documented | ✅ |

---

## 3. Dry Run Sequence (when authorized)

### Phase D1 — Baseline (flags OFF)

1. Confirm production/cert env:  
   `REFERENCE_MASTER_PORT_RUNTIME=false`  
   `TIER2_REGISTRY_PORT_RUNTIME=false`  
   `ENTERPRISE_MASTERS_DUAL_READ=true`
2. Smoke: login, Contacts, create contact with employment type / city.
3. Smoke: Lenders page, Product Library browse, Organization Documents.
4. Record baseline screenshots / counts.

### Phase D2 — Tier 1 only

1. Enable `REFERENCE_MASTER_PORT_RUNTIME=true` (+ `NEXT_PUBLIC_…`).
2. Redeploy / restart.
3. Re-test Contact Tier 1 pickers; confirm DB-backed options.
4. Add one Reference Master via admin; confirm picker refresh after hydrate.

### Phase D3 — Tier 2

1. Enable `TIER2_REGISTRY_PORT_RUNTIME=true` (+ `NEXT_PUBLIC_…`).
2. Redeploy / restart.
3. Re-test product / lender ECM pickers and org document types.
4. Confirm seeded counts via APIs or SQL.

### Phase D4 — Rollback drill

1. Set both runtime flags to `false`.
2. Redeploy / restart.
3. Confirm pickers match Phase D1 baseline (constants).
4. Record rollback duration.

---

## 4. Exit Criteria

| Criterion | Required |
|-----------|----------|
| No P0/P1 defects in D1–D4 | Yes |
| Rollback ≤ 15 minutes | Yes |
| No data loss on rollback | Yes |
| Dual-read remains healthy | Yes |
| Quality Office sign-off to proceed | Yes |

---

## 5. Rollback Procedure (SSOT)

```text
1. Set REFERENCE_MASTER_PORT_RUNTIME=false
2. Set NEXT_PUBLIC_REFERENCE_MASTER_PORT_RUNTIME=false
3. Set TIER2_REGISTRY_PORT_RUNTIME=false
4. Set NEXT_PUBLIC_TIER2_REGISTRY_PORT_RUNTIME=false
5. Redeploy (Vercel) or restart local process
6. Hard-refresh browser (clear stale client hydrate)
```

- **Estimated duration:** 5–15 minutes (deploy-bound)
- **Data loss risk:** None (flags only; DB rows retained)
- **DB rollback:** Not required (additive schema)

---

## 6. Ops Runbook Commands

```bash
# Seed (idempotent)
node scripts/co-arch-001-i3-seed.mjs
node scripts/co-arch-001-wave4-seed.mjs

# Verify
node scripts/co-arch-001-wave4-seed-verify.mjs
node scripts/co-arch-001-i6a-verify.mjs
node scripts/co-arch-001-i6b-verify.mjs
```

Migration note: apply with `DIRECT_URL` (port 5432), not pooler 6543.

---

## 7. Contacts

| Role | Action |
|------|--------|
| Infrastructure | Seed / migrate / flags |
| Quality Office | Execute Dry Run scenarios |
| ARB | Authorize Wave 5 / certification execution |

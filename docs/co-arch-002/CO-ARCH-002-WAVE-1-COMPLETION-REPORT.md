# CO-ARCH-002 — Wave 1 Completion Report

**Program:** CO-ARCH-002  
**Wave:** 1 — Database Foundation / Enterprise Deal Engine  
**Status:** **Complete — paused for ARB review**  
**Date:** 2026-07-21  
**Baseline:** Wave 0 Approved (incl. ARB amendments A1–A3) · Execution Program v1.0 · F0  

---

## Scope adherence

| In scope | Done |
|----------|------|
| Prisma models for Enterprise Deal aggregate | ✅ |
| Additive migration | ✅ `20260721230000_co_arch_002_w1_enterprise_deal_registry` |
| Migration applied on pilot DB (`DIRECT_URL`) | ✅ |
| Deal Number service | ✅ |
| Repository engine (create, find, soft-delete, timeline append, snapshot append) | ✅ |
| Feature flags default OFF | ✅ |
| `.env.example` documentation | ✅ |
| ARB A1 Deal Snapshot | ✅ `snapshot` + `enterprise_deal_snapshots` |
| ARB A2 Append-only Timeline | ✅ no update/delete methods; table has no soft-delete cols |
| ARB A3 Deal Health reservation | ✅ `health_*` columns nullable, unused |
| UI / module migration | ❌ **Not done (forbidden in Wave 1)** |
| Dual-write / dual-read / APIs | ❌ Deferred to Waves 2–4 |

---

## Deliverables

| Artifact | Path |
|----------|------|
| Wave 0 amendments | `docs/co-arch-002/CO-ARCH-002-WAVE-0-TECHNICAL-DESIGN.md` |
| Prisma schema | `prisma/schema.prisma` (CO-ARCH-002-W1 block + `directUrl`) |
| Migration | `prisma/migrations/20260721230000_co_arch_002_w1_enterprise_deal_registry/migration.sql` |
| Flags | `src/constants/enterprise-deal-registry/` |
| Deal Number | `server/services/enterprise-deal/deal-number.service.ts` |
| Repository | `server/repositories/enterprise-deal/enterprise-deal.repository.ts` |
| Verify script | `scripts/co-arch-002-w1-verify.mjs` |
| Env example | `.env.example` |
| This report | `docs/co-arch-002/CO-ARCH-002-WAVE-1-COMPLETION-REPORT.md` |

---

## Feature flags (all default OFF)

| Flag | Default | Wave |
|------|---------|------|
| `DEAL_REGISTRY_DUAL_WRITE` | OFF | 3 |
| `DEAL_REGISTRY_PORT_RUNTIME` | OFF | 4 |
| `DEAL_REGISTRY_IMPORT_ENABLED` | OFF | 4–6 |
| `DEAL_REGISTRY_BLOCK_LOCAL_WRITE` | OFF | 6 |

Runtime helpers return false when unset. Soft Go-Live UX unchanged.

---

## Engine behavior (Wave 1)

`EnterpriseDealRepository.createDeal`:

1. Idempotent on `(organizationId, legacyLoanFileId)` when provided  
2. Allocates `DEAL-YYYY-######` (UTC year)  
3. Writes working `snapshot` JSON  
4. Appends historical snapshot v1 (`reason=deal_created`)  
5. Appends timeline `deal_created`  
6. Leaves `health_*` null  

Timeline: `appendTimelineEvent` only (ARB A2).  
Snapshots: `appendSnapshot` only — never mutates prior versions (ARB A1).  
Soft delete: ESD module `enterprise_deal` + timeline event.

---

## Verification evidence

```
npx prisma migrate deploy   → applied 20260721230000_co_arch_002_w1_enterprise_deal_registry
node scripts/co-arch-002-w1-verify.mjs → CO-ARCH-002-W1 VERIFY PASSED (engine idle; flags OFF)
```

Verify confirmed: all Deal tables present; A1 snapshot column + snapshots table; A3 health columns; A2 timeline shape; partial unique primary counterparty index; all four flags OFF.

No `src/` UI or API route consumers of the Deal repository (flags/constants only).

---

## Ops / notes

1. Prisma datasource now includes `directUrl = env("DIRECT_URL")` — required so migrate does not hang on pooler.  
2. Do **not** enable any Deal flags until later waves are certified.  
3. Confirm Vercel / CI has `DIRECT_URL` for future migrate steps (same as CO-ARCH-001).

---

## Certification checklist (Wave 1)

### Engineering
- [x] Schema validates (`prisma validate`)  
- [x] Migration SQL additive for Deal tables + partial unique primary counterparty  
- [x] Client generated  
- [x] No UI module changes  
- [x] Flags default OFF  

### Data
- [x] F0: transactional children belong to Deal  
- [x] Snapshot + append-only timeline + health reservation present  
- [x] `migrate deploy` applied on pilot  

### Business
- [x] Existing Soft Go-Live UX unaffected (no consumers wired)  
- [x] Deal Number format frozen (`DEAL-YYYY-######`)  

### AI
- [x] Intelligence link table reserved; health reserved for future Deal-centric scoring  
- [x] No parallel AI case identity introduced  

### Production readiness
- [x] Rollback: tables idle while flags OFF; reverse only if non-prod requires drop  
- [x] Pause for ARB before Wave 2 API  

---

## ARB decision request

Please **Approve Wave 1** to authorize **Wave 2 (Deal Persistence API)** only.

**STOP:** Do not begin Wave 2 until ARB Approves this Wave 1 package.

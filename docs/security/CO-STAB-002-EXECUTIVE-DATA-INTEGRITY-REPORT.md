# CO-STAB-002 — Executive Data Integrity Report

**Sprint:** Enterprise Data Integrity & Persistence Stabilisation  
**Date:** 26 Jul 2026  
**Scope:** Stabilisation only (no UX / workflow / architecture / entity changes)

---

## 1. Executive Summary

Catalyst One’s transactional SSOT for Deal execution is the **Enterprise Deal Registry** (Prisma → PostgreSQL) when `ENTERPRISE_PERSISTENCE_MODE=prisma` and Deal Registry API + Port Runtime are operational.

CO-STAB-002:

1. Confirmed **Prisma migration chain is up to date** against the connected Pilot database (17/17).
2. Confirmed **referential integrity probes are clean** (zero orphan Deal/Opportunity/document-link counts on live data).
3. **Closed the P0 LoanFile localStorage bypass** — when Registry is operational, `saveLoanFiles` no longer performs durable local writes (projection notify only). Dual-write remains a Soft Go-Live rollback path and already no-ops when Registry is operational.
4. Documented DB-only partial uniques in `schema.prisma` so Prisma remains the **canonical model**, with migration-owned indexes called out explicitly.

Business workflows, navigation, and screens were not redesigned.

---

## 2. Data Integrity Score

| Dimension | Score | Notes |
|-----------|------:|-------|
| Prisma ↔ DB alignment | 9/10 | Migrations current; DB-only partial indexes documented |
| Deal SSOT compliance | 8.5/10 | Registry operational path solid; LIFE pre-Move still has soft projection attachment (P1 debt) |
| Dual-write elimination | 8.5/10 | Operational dual-write retired; Soft Go-Live path retained for rollback |
| Projection discipline | 8/10 | LoanFile now projection-only when operational |
| Referential integrity | 9.5/10 | Live orphan counts = 0 |
| Migration health | 9.5/10 | Linear 17-migration chain; ADR-018 index present |
| Persistence regression | 7.5/10 | Readonly + flag gates pass; interactive login E2E pending credentials |
| Performance | 8/10 | No N+1 hotspots introduced; dual-write debounce retained for Soft Go-Live only |

**Overall Data Integrity Score: 8.6 / 10**

---

## 3. Prisma Alignment Status

| Check | Result |
|-------|--------|
| `prisma migrate status` | **Database schema is up to date** (17 migrations) |
| Applied migrations | 17 |
| Duplicate / conflicting folders | None in active chain |
| DB-only indexes present | All 5 expected (opp uniqueness, deal opp+lender, payee contact/company, company CI name) |
| Invoice party NOT NULL | `legal_name` / `billing_name` = NO |
| Schema documentation | Deal model annotated for `edeal_org_opp_lender_active_key` |

**Verdict:** Prisma schema + migration history are the canonical source of truth. Partial uniques remain migration-owned (Prisma limitation) and are verified live.

---

## 4. SSOT Compliance Status

```
Customer (ECM Contact)
        ↓
Opportunity (Enterprise Opportunity Registry)
        ↓
Enterprise Deal (one lender = one Deal)
```

| Concern | Status |
|---------|--------|
| Canonical Deal write path | API → Service → Repository → Prisma |
| Primary create fail-closed | `DEAL_REGISTRY_PRIMARY_WRITE` ON under prisma |
| Dual-write when operational | No-op (`dual-write.ts`) |
| LoanFile durable write when operational | **Blocked** (`saveLoanFiles` + `isLoanFileLocalStorageWriteForbidden`) |
| Soft Go-Live rollback | Preserved when Registry flags explicitly OFF |

---

## 5. Migration Status

| Item | Status |
|------|--------|
| Order | Linear `20260721…` → `20260725…ADR-018` |
| Completeness | Up to date on Pilot |
| Conflicting versions | None |
| ADR-018 uniqueness index | Present (`eopp_active_contact_product_uidx`) |

---

## 6. Referential Integrity Status

Live audit (`scripts/co-stab-002-data-integrity-audit.mjs`):

| Probe | Count |
|-------|------:|
| Active deals missing opportunity | 0 |
| Active deals missing lender | 0 |
| Active opps missing product uniqueness key | 0 |
| Soft-deleted contacts referenced by active opps | 0 |
| Deal document links with bad definition ids | 0 |

**Registry volumes (non-deleted):** Contacts 9 · Opportunities 8 · Deals 14 · Lenders 12

**Known residual (debt, not live orphans):** Deal document link columns lack Prisma FKs to Document Registry (soft integrity only) — see §8.

---

## 7. Persistence Regression Results

| Test | Result |
|------|--------|
| TypeScript (`tsc --noEmit`) | ✅ |
| Deal registry readonly verify | ✅ `ok: true`, no blockers |
| Migrate status | ✅ |
| Data integrity SQL audit | ✅ |
| Create Contact → Opp → Deal → reload (interactive UI) | ⚠️ Pending cert password on production browser session |
| Logout/Login persistence | ⚠️ Same |
| Dashboard / registry consistency after ops | ⚠️ Same (readonly DB counts consistent) |

---

## 8. Remaining Technical Debt

| ID | Item | Priority |
|----|------|----------|
| TD-1 | LIFE pre–Move `ensureLoanWorkspace` may still attach LoanFile-shaped projection before Move to Deal | P1 |
| TD-2 | Direct `saveLoanFiles` callers in Credit Bench / Chanakya fallback (now no-op when operational; should route to Opp/Deal APIs) | P1 |
| TD-3 | Deal document links without FK to Document Registry definitions | P2 |
| TD-4 | Soft-deleted contacts still occupy `(org, mobile)` unique (blocks mobile reuse) | P2 |
| TD-5 | Confirm Vercel Production has `JWT_SECRET` / `JWT_REFRESH_SECRET` + `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma` | P0 ops |
| TD-6 | Dual-write flag remains default-ON under prisma as harmless no-op — may set explicit `false` after soak | P2 |

---

## 9. Production Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Client missing `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE` | High historically | Documented; operational flags default from prisma mirror |
| Accidental Soft Go-Live rollback | Medium | Explicit `false` required per flag |
| LocalStorage silent Deal creates | **Reduced** | CO-STAB-002 writer guard |
| Migration drift from idempotent FKs | Low on Pilot (verified) | Re-run audit after each migrate |

---

## 10. Recommendation

### **GO WITH OBSERVATIONS**

**Rationale:** Schema/migrations/referential probes are healthy; Deal SSOT path is enforced for durable LoanFile writes when Registry is operational. Remaining items are P1 call-site cleanups and ops env confirmation — not blocking for continued certification — provided Production env mirrors (`NEXT_PUBLIC_*` + JWT) are confirmed.

**Observations to close before Final Production Readiness Certification:**

1. Interactive persistence E2E with certification credentials.
2. Vercel env confirmation (`NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma`, JWT secrets).
3. Schedule TD-1 / TD-2 cleanup (LIFE + Credit Bench write routing) as a follow-on stab ticket.

---

## Code / Script Deliverables

| Artifact | Purpose |
|----------|---------|
| `src/lib/loan-files-storage.ts` | Block durable local writes when Registry operational |
| `src/constants/enterprise-deal-registry/flags.ts` | `isLoanFileLocalStorageWriteForbidden` + public BLOCK env |
| `src/lib/enterprise-deal/cutover-health.ts` | Monitoring message for projection-only mode |
| `prisma/schema.prisma` | Document Deal DB-only partial unique |
| `scripts/co-stab-002-data-integrity-audit.mjs` | Repeatable integrity probe |
| `.env.example` | CO-STAB-002 flag documentation |

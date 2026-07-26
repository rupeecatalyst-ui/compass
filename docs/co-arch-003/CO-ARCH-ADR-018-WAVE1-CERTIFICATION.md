# ADR-018 Wave 1 — Migration Verification & Certification

**Date:** 2026-07-25  
**Status:** **Wave 1 Certified** (persistence verified on target database)  
**Database:** Supabase PostgreSQL (`aws-0-ap-southeast-1.pooler.supabase.com`) via `DATABASE_URL` / `.env.local`

---

## 1. Migration execution

Initial combined migration failed with PostgreSQL `55P04` (new enum values must be committed before use). Recovered by:

1. `prisma migrate resolve --rolled-back 20260725010000_adr_018_w1_opportunity_lifecycle`
2. Split into:
   - `20260725010000_adr_018_w1_opportunity_lifecycle` — enum `draft`, `requirement_captured` only  
   - `20260725010100_adr_018_w1_opportunity_uniqueness_index` — uniqueness index recreate  
3. `prisma migrate deploy` — **both applied successfully**

---

## 2. Schema version

| Item | Value |
|------|--------|
| Latest applied migration | `20260725010100_adr_018_w1_opportunity_uniqueness_index` |
| Wave 1a | `20260725010000_adr_018_w1_opportunity_lifecycle` ✅ |
| Wave 1b | `20260725010100_adr_018_w1_opportunity_uniqueness_index` ✅ |
| Total applied migrations | 17 |

### Enum `OpportunityLifecycleStatus`

`active`, `on_hold`, `won`, `lost`, `cancelled`, `archived`, **`draft`**, **`requirement_captured`**

### Uniqueness index

`eopp_active_contact_product_uidx` WHERE  
`lifecycle_status IN ('requirement_captured','active','on_hold')`  
(and not deleted/archived/closed; key not null). **Draft excluded.**

---

## 3. Persistence verification (script)

Script: `scripts/adr-018-w1-verify-persistence.ts`  
Result: **`ok: true` / `certifiedReady: true`**

| Check | Result |
|-------|--------|
| Draft Opportunity persists | ✅ `lifecycleStatus=draft`, `product_uniqueness_key=null` |
| Second Draft same Contact (no product) | ✅ Allowed — uniqueness not applied |
| Requirement Captured persists | ✅ Product + amount + `requirement_captured` |
| Uniqueness at Requirement Captured | ✅ Duplicate same Contact+Product **blocked** |
| Active transition | ✅ `requirement_captured` → `active` |
| Cleanup | ✅ Verification rows soft-deleted |

---

## 4. Certification

**Wave 1 Certified** — persistence foundation is live on the target environment.

Wave 2 (Lead Information Workspace) may proceed upon Product Architecture approval.

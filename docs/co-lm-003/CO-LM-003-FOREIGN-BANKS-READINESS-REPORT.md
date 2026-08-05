# CO-LM-003 — Lender Registry · Default Foreign Banks

**Status:** Implementation complete (static verify) · Ready for BAT  
**Change control:** No migrations · No Vercel deploy · No Opportunity / Deal / Loan record mutation  

---

## Business decision

Dedicated Lender Category **Foreign Bank** with exactly nine default lenders (approved list only).

---

## Default data added

| # | Display Name | seedKey | Category |
|---|---|---|---|
| 1 | Standard Chartered Bank | `standard_chartered` | Foreign Bank |
| 2 | HSBC Bank | `hsbc` | Foreign Bank |
| 3 | DBS Bank India | `dbs_india` | Foreign Bank |
| 4 | Deutsche Bank | `deutsche_bank` | Foreign Bank |
| 5 | Bank of America | `bank_of_america` | Foreign Bank |
| 6 | Citibank | `citibank` | Foreign Bank |
| 7 | Shinhan Bank | `shinhan_bank` | Foreign Bank |
| 8 | State Bank of Mauritius | `state_bank_mauritius` | Foreign Bank |
| 9 | Doha Bank | `doha_bank` | Foreign Bank |

**Default configuration (each):** Status Active · Category Foreign Bank · Enabled · Selectable · Editable · Soft-delete supported · `defaultRecord: true`

---

## Duplicate check result

| Check | Result |
|---|---|
| Prior catalog presence of these 9 names | **None** (not in master catalog before CO-LM-003) |
| Unique `seedKey` values | ✅ All 9 unique; full catalog seedKeys are unique |
| Seed upsert strategy | By normalized code (`seedKey`); if missing, match display name / aliases and **update** — never create a second row |
| Soft Go-Live bootstrap | Same idempotent find-by-tag / name / alias |

---

## Architecture notes

- SSOT: `LENDER_MASTER_SEED_CATALOG` (+ Tier-2 seed + Soft Go-Live bootstrap).
- Category `foreign_bank` / label **Foreign Bank** added to lender category seeds (string category table — **no Prisma enum migration**).
- `institutionCategory` remains `bank` (existing Prisma enum).
- Catalog `classification: "foreign_bank"` for Soft Go-Live / UI; Prisma write maps `foreign_bank` → `null` until a future approved enum migration.
- Master seed version bumped to **2** so Soft Go-Live re-bootstraps and picks up the nine banks.

---

## Files modified

| Path | Change |
|---|---|
| `src/constants/enterprise-lender-registry/master-seed-catalog.ts` | FOREIGN_BANKS ×9, version 2, helpers |
| `src/constants/enterprise-lender-registry/index.ts` | Exports |
| `src/types/enterprise-lender-registry.ts` | `foreign_bank` classification + label |
| `server/services/tier2-registry/seed-catalog.ts` | Foreign Bank category + categoryCode mapping |
| `server/services/tier2-registry/seed-tier2-registries.service.ts` | Idempotent upsert + name duplicate guard |
| `src/lib/enterprise-lender-registry/bootstrap-master.ts` | Category ensure + Foreign Bank assignment |
| `src/lib/enterprise-lender-registry/local-store.ts` | `ensureCategory` |
| `src/components/.../new-lender-wizard.tsx` | classification → institution map |
| `src/lib/enterprise-tier2-ports/ports/lender-constants-port.ts` | Foreign Bank category option |
| `scripts/co-lm-003-verify.mjs` | Static verify |
| `package.json` | `verify:co-lm-003` |

---

## Availability

Once Tier-2 / Soft Go-Live bootstrap runs (existing seed paths), lenders appear wherever published Lender Registry selection is used (Opportunity / Deal / Loan / assignment / product composition / credit / workflow consumers of the registry SSOT).

**Ops:** Re-run existing lender master seed / bootstrap in the target environment (no migration). Do not mass-edit Opportunities/Deals/Loans.

---

## Business Certification Report

### Development
- Smoke / static verify: ✅ `npm run verify:co-lm-003`
- Migrations: ❌ Not executed (forbidden)
- Deploy: ❌ Not executed (forbidden)
- Opportunity / Deal / Loan writes: ❌ None

### Authentication
Authentication: ✅ Unchanged

### Implementation Summary
- Nine Foreign Banks added to Enterprise Lender Master catalog
- Foreign Bank category added
- Idempotent create/update; no duplicates by design
- Existing transactional records untouched

### Final Status
✅ Ready for BAT

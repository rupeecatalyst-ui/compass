# CO-P0-006 Wave 1 — Technical Certification Report

**Incident / Program:** CO-P0-006 Wave 1 — Enterprise Deal Registry Primary Persistence (Create)  
**Date:** 2026-07-23  
**Branch:** `compass-hl03-conversation-first`  
**Governance:** CO-GOV-001 (Local only — no Preview/Production deploy)  
**Scope:** Wave 1 create path only — no update primary write, no migration tools, no localStorage removal

---

## 1. Objective (as implemented)

New Deal creation requires a successful `POST /api/enterprise-deals` (Postgres `enterprise_deals`) before the UI reports success. localStorage remains a **cache** after successful create (Option B ID bridge).

## 2. Architecture decisions

| Decision | Choice |
|----------|--------|
| ID strategy | **Option B** — keep client `LoanFile.id` as `legacyLoanFileId`; attach `enterpriseDealId` + `dealNumber` |
| DAL entry | `createDealAsync` in `deal-data-access.ts` |
| Persistence helper | `persistNewDealToEnterpriseRegistry` in `primary-write.ts` |
| Rollback flag | `DEAL_REGISTRY_PRIMARY_WRITE` / `NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE` — unset + prisma ⇒ **ON**; explicit `false` = legacy create |
| Sync create | `createDeal` / `addFile` throw `SYNC_CREATE_FORBIDDEN` when primary ON |
| Updates | Unchanged (still local + optional dual-write) — out of Wave 1 |

## 3. Files changed (Wave 1)

### Core
- `src/constants/enterprise-deal-registry/flags.ts` — primary-write flag
- `src/lib/enterprise-deal/primary-write.ts` — awaited create + identity attach
- `src/lib/enterprise-deal/deal-data-access.ts` — `createDealAsync`, sync guard
- `src/lib/enterprise-deal/map-deal-to-loan-file.ts` — map `enterpriseDealId` / `dealNumber`
- `src/types/catalyst-one.ts` — `enterpriseDealId?`, `dealNumber?`

### UI / hooks
- `src/hooks/use-loan-files-workspace.ts` — `addFileAsync`
- `src/components/catalyst-one/loan-files/loan-create-form-dialog.tsx` — async submit + loading
- `src/components/catalyst-one/loan-files/create-loan-modal.tsx`
- `src/components/catalyst-one/loan-files/loan-information-workspace.tsx`
- `src/components/catalyst-one/contacts/contact-workspace-modal.tsx`
- `src/components/catalyst-one/customers/customer-360-modal.tsx`
- `src/lib/strategic-lender-pipeline/ensure-loan-workspace.ts` — async ensure (already wired to Opportunity board)

### Ops / docs
- `.env.example` — primary-write documentation
- `scripts/co-p0-006-primary-write-verify.mjs` + `npm run verify:deal-registry:primary-write`
- `src/constants/build-information/whats-new.ts`
- `src/constants/build-information/certification.ts`
- Plan status update in `docs/incidents/CO-P0-006-PRIMARY-PERSISTENCE-CUTOVER-PLAN.md`

## 4. Database / migrations

**None required** for Wave 1. Existing `enterprise_deals` schema used.

## 5. Validation executed (Local)

| Check | Result |
|-------|--------|
| `npm run verify:deal-registry:primary-write` | ✅ PASSED |
| `npx tsc --noEmit -p tsconfig.json` | ✅ PASSED (after contact toast rename fix) |
| IDE lint on touched create paths | ✅ No issues |
| `npm run verify:deal-registry:crud` | ✅ PASSED (Pilot DB create/read/update/soft-delete/restore/cleanup; left 0 active test deals) |
| Preview / Production deploy | ⏸️ **Not performed** (CO-GOV-001 gate) |

## 6. Rollback

Set both:

```text
DEAL_REGISTRY_PRIMARY_WRITE=false
NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE=false
```

Restores localStorage-primary create. Dual-write / read flags unchanged.

## 7. Technical verdict

**✅ Technically certified for Local** — Wave 1 create cutover implemented per approved plan.

**Not certified for Preview or Production** until explicit CO-GOV-001 stage approvals and env mirrors (`NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma` + Deal flags as required).

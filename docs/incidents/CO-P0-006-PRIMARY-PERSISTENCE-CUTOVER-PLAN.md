# CO-P0-006 — Enterprise Deal Registry Primary Persistence Cutover

**Document type:** Implementation Plan  
**Status:** WAVE 1 BUSINESS APPROVED — implemented (Local Certification pending reports)  
**Depends on:** CO-P0-004 (Priyesh trace) · CO-P0-005 (RCA) · CO-P0-002 (operational flags) · CO-GOV-001  
**Environment sequence:** Local → Preview → Production (explicit approval each stage)  
**Deploy gate:** Do not deploy Preview/Production until Local Certification is complete.

---

## 1. Objective

Make **PostgreSQL `enterprise_deals`** the **mandatory System of Record** for all **new** Deal creation.

| Requirement | Target behaviour |
|-------------|------------------|
| Primary persistence | `enterprise_deals` via Enterprise Deal API / service |
| Success definition | UI success **only after** successful DB write |
| Failure | UI must **not** report success; show actionable error |
| Return value | Enterprise Deal `id` (+ `dealNumber`) to callers |
| localStorage | Cache / workspace shape only — **not** SoR |
| Downstream | Modules resolve Deal by Enterprise Deal ID (with `legacyLoanFileId` bridge during transition) |

**Out of scope for this cutover (Phase C later):** full removal of `LoanFile` shape; permanent `BLOCK_LOCAL_WRITE`; historical Soft Go-Live decommission of all dual-path reads.

---

## 2. Recommended approach (controlled, minimal regression)

### Principle

**Invert the create contract in one DAL entry point**, then force all UI create handlers through it.

Do **not** rewrite every workspace to a new domain model in one sprint.

```text
TODAY (broken SoR):
  UI → createLoanFileFromInput → saveLoanFiles(localStorage) → [optional dual-write]

TARGET (cutover):
  UI → createDealAsync(input) 
        → build LoanFile draft (client id retained as legacyLoanFileId)
        → POST /api/enterprise-deals  (REQUIRED)
        → on success: map Enterprise Deal → LoanFile (id strategy below)
                     update local cache
                     return { dealId, dealNumber, file }
        → on failure: throw / return error — NO success toast, NO optimistic “created”
```

### ID strategy (critical design choice)

**Recommendation: Option B — Bridge ID (lowest regression)**

| Option | Behaviour | Pros | Cons |
|--------|-----------|------|------|
| **A** | Replace `LoanFile.id` with Enterprise Deal cuid | Pure SoR | Breaks deep links, journey context, localStorage orphans |
| **B (recommended)** | Keep client `LoanFile.id` as `legacyLoanFileId`; store Enterprise Deal `id` on file as `enterpriseDealId` (new field) / use dealNumber in UI | Journey URLs & in-flight local state keep working; DB SoR by Deal id | Temporary dual identity |
| **C** | Use Enterprise Deal id as `LoanFile.id` immediately for **new** creates only | Clean for new deals | Mixed ID space in same browser |

**Option B for CO-P0-006 Wave 1** with types:

```ts
// LoanFile extension (non-breaking)
enterpriseDealId?: string;      // Postgres enterprise_deals.id
dealNumber?: string;            // e.g. DL-2026-…
```

Downstream that already key by `file.id` continue; new APIs and documents/lender links use `enterpriseDealId` when present.

**Wave 2 (later):** migrate URL/query params to `dealId=` Enterprise ID.

### Create API contract

Reuse existing:

- `POST /api/enterprise-deals` → `enterpriseDealService.createDeal`
- Body from `mapLoanFileToDealCreateBody` (already maps `primaryContactId` from `customerId`)

**Hardening required in plan:**

1. Guard remains: `ENTERPRISE_PERSISTENCE_MODE=prisma` + Deal API enabled  
2. Client **must** have `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma` (or explicit dual-write/create flag) so create path cannot “succeed” in memory-only browser mode  
3. New flag (recommended for rollback):  
   `DEAL_REGISTRY_PRIMARY_WRITE=true` / `NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE=true`  
   - When **true**: create requires API success  
   - When **false**: legacy localStorage create (emergency rollback only)

### Success / failure UX

| Outcome | UI |
|---------|-----|
| API 201 + Deal id | Toast success; navigate with `file` id + store `enterpriseDealId` |
| API 4xx/5xx / network / flag off under primary mode | Toast/error dialog; **no** “Loan file created”; form stays open or returns to create |
| Validation fail (client or server) | Surface messages; no local SoR write as “created deal” |

Optional: write a **draft** to sessionStorage for form recovery — never present as a registry Deal.

---

## 3. Phased implementation plan

### Phase 0 — Preconditions (ops, no app behaviour change)

1. Confirm Pilot `.env.local`: `ENTERPRISE_PERSISTENCE_MODE=prisma` + `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma`  
2. Document that Preview/Production must set **both** mirrors before cutover deploy  
3. Add Create-path smoke script: create Deal via API → assert `enterprise_deals` row → cleanup  

### Phase 1 — DAL primary create (core)

1. Add `createDealAsync(input, module): Promise<DealCreateResult>` in `deal-data-access.ts`  
2. Implement `createDealViaRegistry(file): Promise<EnterpriseDealApiRecord>` (awaited, not fire-and-forget)  
3. On success: merge `enterpriseDealId` / `dealNumber` into LoanFile; update enterprise read cache; optionally mirror to localStorage **as cache**  
4. On failure: throw typed `DealCreatePersistenceError`  
5. Deprecate sync `createDeal` for UI creates (keep thin wrapper that throws in primary mode if called sync)

### Phase 2 — Wire all create UIs to async primary create

Convert handlers from sync to async:

| Entry | Change |
|-------|--------|
| Contact Workspace | `handleLoanCreated` → await `createDealAsync` |
| Create Loan Modal | `onSubmit` async → await `createDealAsync` / `addFileAsync` |
| Loan Information Workspace | same |
| Customer 360 | same |
| `use-loan-files-workspace` | `addFile` → `addFileAsync` |
| `ensure-loan-workspace` | await primary create |

Disable or gate: any path that calls `createLoanFileFromInput` + `saveLoanFiles` alone for **new** deals when primary flag ON.

### Phase 3 — Read path consistency (same sprint if capacity)

1. My Deals already prefers Enterprise API when port ON — keep  
2. After create, invalidate/hydrate `loadDeals(module)` so Opportunity / Loan Workspace see Postgres row  
3. Ensure `primaryContactId` set from ECM Contact id (Priyesh case: `customerId` must be Contact id)  
4. Documents / Lender counterparties: continue using Deal API dealId = `enterpriseDealId` when linking new records  

### Phase 4 — Certification gates

1. Local: create Deal for test Contact → row in `enterprise_deals` → UI shows Deal → refresh/login retains Deal  
2. Recreate path for Priyesh-like case: Contact exists → Create Loan → Deal appears with `primary_contact_id` = Contact id  
3. Negative test: force API failure → UI shows error, `enterprise_deals` unchanged, no success toast  
4. Preview then Production per CO-GOV-001  

---

## 4. Files that will change

### Core (must)

| File | Change |
|------|--------|
| `src/lib/enterprise-deal/deal-data-access.ts` | `createDealAsync`, primary-write gate, stop treating local save as success |
| `src/lib/enterprise-deal/dual-write.ts` | Extract/reuse awaited create; or new `primary-write.ts` |
| `src/lib/enterprise-deal/deal-api-client.ts` | Ensure create errors propagate (already throws) |
| `src/lib/loan-files-storage.ts` | Document cache role; optional: refuse “create-only” semantics when primary ON |
| `src/constants/enterprise-deal-registry/flags.ts` | `DEAL_REGISTRY_PRIMARY_WRITE` operational flag |
| `src/types/catalyst-one.ts` (or deal types) | `enterpriseDealId`, `dealNumber` on `LoanFile` |
| `src/lib/enterprise-deal/map-deal-to-loan-file.ts` | Map API record → LoanFile including enterpriseDealId |
| `src/hooks/use-loan-files-workspace.ts` | `addFileAsync` |
| `src/components/catalyst-one/loan-files/create-loan-modal.tsx` | Async submit + error UX |
| `src/components/catalyst-one/loan-files/loan-information-workspace.tsx` | Async submit + error UX |
| `src/components/catalyst-one/contacts/contact-workspace-modal.tsx` | Async create + error UX |
| `src/components/catalyst-one/customers/customer-360-modal.tsx` | Async create + error UX |
| `src/lib/strategic-lender-pipeline/ensure-loan-workspace.ts` | Await primary create |
| `.env.example` | Document primary-write + public persistence mirror |
| `docs/incidents/CO-P0-006-*.md` | Plan + completion report |

### Likely follow-ons (same PR or immediate follow-up)

| File | Change |
|------|--------|
| `src/lib/enterprise-deal/map-loan-file-to-deal.ts` | Ensure Contact id mapping; harden validation if Contact required |
| `src/components/catalyst-one/loan-files/loan-create-form-dialog.tsx` | Loading/disabled submit while persisting |
| `src/app/api/enterprise-deals/route.ts` | Only if create body needs primaryContactId mandatory |
| `server/services/enterprise-deal/*` | Only if server must require `primaryContactId` for lending creates |
| `src/constants/build-information/whats-new.ts` | Release note when certified |
| `scripts/co-p0-006-primary-write-verify.cjs` | New verification script |

### Explicitly not changing (this cutover)

- ECM Contact create APIs (already correct)  
- Full localStorage deletion (Phase C)  
- Renaming LoanFile domain everywhere  
- Production env without approval  

---

## 5. Database migrations required

**None required for Wave 1** if:

- `enterprise_deals` schema already supports create (verified present)  
- `primary_contact_id`, `legacy_loan_file_id`, stages already exist  

**Optional (not blocking):**

- DB check constraint / app validation: lending deals should have `primary_contact_id` NOT NULL  
- Index already exists on `(organization_id, primary_contact_id)`

**No new tables** for cutover.

---

## 6. Regression risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Create UX becomes slower (network round-trip) | Medium | Loading state on submit; keep payload lean |
| Offline / API down blocks create | High (intentional) | Clear error; rollback flag to legacy only for emergency |
| Missing `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE` on deploy | **Critical** | Fail closed in primary mode; checklist in CO-GOV-001 |
| `customerId` empty → Deal without Contact link | High | Require Contact id on create from Contact/Loan form; validate server-side |
| Dual identity (`file.id` vs `enterpriseDealId`) confusion | Medium | Document; map helpers; SSOT badge already on My Deals |
| Updates still local-first | Medium | Wave 1 = **create** only; schedule Wave 1b for update primary write |
| Documents/Lender still keyed only by legacy id | Medium | Pass `enterpriseDealId` into Deal-scoped APIs when linking |
| Existing empty registry + localStorage deals | High (perception) | See §8 migration; My Deals may show Enterprise empty until migrate/create |
| Auth token missing → create fails | Medium | Same as other APIs; prompt re-login |

---

## 7. Rollback strategy

| Layer | Action |
|-------|--------|
| **Feature flag** | Set `NEXT_PUBLIC_DEAL_REGISTRY_PRIMARY_WRITE=false` (and server twin) → restore localStorage-primary create |
| **Persistence** | Keep `ENTERPRISE_PERSISTENCE_MODE=prisma` for Contact/other; only create path rolls back |
| **Code** | Single gate in `createDealAsync`; no irreversible schema change |
| **Data** | Deals already written to `enterprise_deals` remain (correct); localStorage cache may diverge — prefer Enterprise read when port ON |
| **Deploy** | Revert Preview/Production deploy to prior Ready deployment (CO-GOV-001 Stage 8 rollback) |

**Rollback does not delete** Enterprise Deals created during cutover.

---

## 8. Impact on existing workflows

| Workflow | Impact |
|----------|--------|
| Contact create | None |
| Create Loan / Deal | Becomes async; requires auth + Deal API; failure visible |
| My Deals | New deals appear from Enterprise API after successful create |
| Opportunity / Loan Workspace | Hydrate after create; open by legacy file id still works (Option B) |
| Documents / Lender / Tasks / Accounting | New links should use Enterprise Deal id once Deal exists; modules that only read localStorage will miss Deal until they use DAL hydrate |
| Chanakya / journey chrome | `fileId` in URL remains legacy id initially |
| Soft delete / Recovery | Enterprise Deal soft-delete path applies once rows exist |

**Wave 1b recommendation (separate approval):** primary write for **updates** (`updateDeal` await API), not only create — otherwise edits can diverge again.

---

## 9. Existing locally stored deals — migration?

| Question | Answer |
|----------|--------|
| Are localStorage deals in Pilot `enterprise_deals` today? | **No** (registry empty) |
| Does cutover require migration to proceed? | **No** for making **new** creates correct |
| Should we migrate browser localStorage deals? | **Optional Wave 1.5** — admin tool / one-time import using existing dual-write / import APIs |
| Priyesh Jain | Contact exists; **re-create Deal** via new primary path (or targeted repair script linking Contact → new Deal) — not auto-infer from localStorage without user browser access |

**Recommendation:**

1. Ship primary create **without** mandatory bulk migration  
2. Provide optional “Import local deals to Enterprise Registry” (admin-only) behind flag  
3. For known customers (Priyesh): guided re-create after cutover  

Cannot migrate other users’ `localStorage` from the server — it never left the browser.

---

## 10. Test / verification plan

| # | Test | Pass criteria |
|---|------|----------------|
| 1 | Primary create happy path | Row in `enterprise_deals`; UI success; returns `enterpriseDealId` |
| 2 | API failure simulation | No success toast; no new row |
| 3 | Refresh / re-login | Deal still listed (My Deals Enterprise source) |
| 4 | Create from Contact (Priyesh) | `primary_contact_id` = Contact id |
| 5 | Flag OFF rollback | Legacy local create restored |
| 6 | My Deals SSOT badge | `enterprise_deal` after create |
| 7 | Documents/Lender smoke | Can attach against returned Deal id (minimal) |

Scripts: extend CO-P0-002 CRUD style + new `co-p0-006-primary-write-verify`.

---

## 11. Governance alignment (CO-GOV-001)

| Stage | Gate |
|-------|------|
| Development Complete | Plan approved + code land local |
| Technical Certification | Scripts + tsc/build |
| Business Certification Local | Create Deal visible in registry; failure path verified |
| Preview | Env mirrors set; Preview certify |
| Production | Explicit Product Owner approval |

Build Information What’s New + Certification board update on Local certify.

---

## 12. Effort & sequencing summary

| Wave | Scope | Migrations | Risk |
|------|--------|------------|------|
| **0** | Env/docs/smoke harness | None | Low |
| **1** | Primary **create** + UI async + flag | None | Medium |
| **1.5** | Optional localStorage import tool | None | Medium |
| **1b** | Primary **update** | None | Medium |
| **2** | URL/identity → Enterprise Deal id | None | Higher |
| **C** | Remove local SoR / BLOCK_LOCAL_WRITE | None | High |

**Ask for approval of Wave 0 + Wave 1 only** for CO-P0-006.

---

## 13. Approval checklist (Product Owner / Business Reviewer)

Please confirm:

- [ ] Option B ID bridge (`enterpriseDealId` + keep `LoanFile.id` as legacy)  
- [ ] New flag `DEAL_REGISTRY_PRIMARY_WRITE` (fail closed when ON)  
- [ ] Wave 1 = **create only** (updates remain dual-write/local until 1b)  
- [ ] No mandatory bulk localStorage migration  
- [ ] Local → Preview → Production sequence; no Production until approved  
- [ ] Proceed to implement Wave 0–1 after this plan is approved  

---

## 14. Non-goals (reconfirmed)

- No implementation until this plan is approved  
- No Production env/deploy in the same step as coding without CO-GOV-001 Stage 8  
- No UI redesign beyond loading/error states required for honesty of create outcome  

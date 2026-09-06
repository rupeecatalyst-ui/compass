# CO-PRODUCT-PROGRAM-OPERATIONS-001 — Certification Report

Status: **BLOCKED — PRODUCT PROGRAMMES NOT READY**  
Date: 2026-09-06  
Authority: Product Owner sequential sprint instruction  
Hostinger / production: **unchanged**  
Git: **not pushed** · **not deployed**

This report does not claim Product Owner BAT readiness. PostgreSQL persistence, live HTTP against Prisma, visual BAT, and a migrate-free Next production build were not proven on this machine.

---

## Isolated worktree

| Item | Value |
|------|--------|
| Worktree | `C:\Compass by Rupee Catalyst (3)\.tmp\wt-product-program-operations` |
| `git rev-parse --show-toplevel` | `C:/Compass by Rupee Catalyst (3)/.tmp/wt-product-program-operations` |
| Branch | `co-product-program-operations-001` |
| Tracks | `origin/compass-hl03-conversation-first` |
| Starting SHA | `3c9b48a3eab4fba4dde2fb906a8e80745cc73822` |
| Parent checkout copied? | **No** |
| Parent dirty checkout | `C:\Compass by Rupee Catalyst (3)` left untouched |
| Sibling worktrees | Left as-is |

Sprint 0 baseline: `docs/co-product-program-operations-001/CO-PRODUCT-PROGRAM-OPERATIONS-001-SPRINT-0-BASELINE.md`

### Ancestry

| Commit | In baseline? |
|--------|----------------|
| Marketing rebuild `9395feb7dc0ca65e1986a287903974d93bb9235b` | **Yes** |
| Marketing BAT prep `3c9b48a3eab4fba4dde2fb906a8e80745cc73822` | **Yes** (start) |
| Advantage Committed `8c35e23973ff36307370a5726d3fb41d2d8c1bdd` | **No** — local-only; not cherry-picked |

---

## Sprint commit SHAs and parents

| Sprint | SHA | Parent | Subject |
|--------|-----|--------|---------|
| 0 | `360e0a9e0dd2d11808a15f56ce70619b1e6f5c42` | `3c9b48a3eab4fba4dde2fb906a8e80745cc73822` | docs(product-programmes): record Sprint 0 isolated baseline SHA. |
| 1 | `4ea60c5abd495b87f7db9beb82d33e24f59fb235` | `360e0a9e0dd2d11808a15f56ce70619b1e6f5c42` | feat(product-programmes): persist complete programmes and durable policy. |
| 2 | `9ca274f48c069188d1d52074523a77797a26e71a` | `4ea60c5abd495b87f7db9beb82d33e24f59fb235` | feat(product-programmes): add structured controlled programme editor. |
| 3 | `0a37470c41446b0282a76af53200cfb83f7cdc2e` | `9ca274f48c069188d1d52074523a77797a26e71a` | feat(product-programmes): gate publication and stop empty matrix stubs. |
| 4 | `12680a5f05bfcd450427712ed51ac4164e921def` | `0a37470c41446b0282a76af53200cfb83f7cdc2e` | feat(product-programmes): surface published programmes in Lender Registry and 360. |
| 5 | `09d08117f17eb83c9fe18d90482a97d81d837e9d` | `12680a5f05bfcd450427712ed51ac4164e921def` | feat(product-programmes): consume published programmes across CHANAKYA, LOD and deals. |
| 6 | *(this certification commit)* | `09d08117f17eb83c9fe18d90482a97d81d837e9d` | certify(product-programmes): BAT fixtures, TypeScript gates, honest blocked status. |

Certified history was not squashed or amended.

---

## Exact files changed by sprint

### Sprint 0

- `docs/co-product-program-operations-001/CO-PRODUCT-PROGRAM-OPERATIONS-001-SPRINT-0-BASELINE.md`

### Sprint 1

- `package.json`
- `prisma/migrations/20260906180000_co_product_program_operations_001/migration.sql`
- `prisma/schema.prisma`
- `scripts/co-product-program-operations-001-sprint1-verify.mjs`
- `server/repositories/credit-risk-policy/durable-policy.repository.ts`
- `server/repositories/lender-registry/lender-registry.repository.ts`
- `server/repositories/lender-registry/mappers.ts`
- `server/repositories/lender-registry/structured-program-data.ts`
- `server/services/product-programme-operations/programme.service.ts`
- `src/app/api/lender-registry/programs/[programId]/route.ts`
- `src/app/api/lender-registry/programs/route.ts`
- `src/constants/product-programme-operations/controlled-masters.ts`
- `src/lib/product-programme-operations/completeness.ts`
- `src/lib/product-programme-operations/employment.ts`
- `src/lib/product-programme-operations/index.ts`
- `src/lib/product-programme-operations/isolated-durable-store.ts`
- `src/lib/product-programme-operations/money.ts`
- `src/lib/product-programme-operations/request-schema.ts`
- `src/lib/product-programme-operations/sprint1-proof.ts`
- `src/lib/product-programme-operations/to-registry-input.ts`
- `src/lib/product-programme-operations/versioning.ts`
- `src/types/enterprise-lender-registry.ts`
- `src/types/product-programme-operations.ts`

### Sprint 2

- `scripts/co-product-program-operations-001-sprint2-verify.mjs`
- `src/components/catalyst-one/enterprise-mdm/product-programs-workspace.tsx`
- `src/components/catalyst-one/product-programme-operations/controlled-multi-select.tsx`
- `src/components/catalyst-one/product-programme-operations/programme-editor.tsx`
- `src/lib/product-programme-operations/editor-state.ts`
- `src/lib/product-programme-operations/to-write-payload.ts`

### Sprint 3

- `scripts/co-product-program-operations-001-sprint3-verify.mjs`
- `server/repositories/lender-registry/lender-registry.repository.ts`
- `server/services/product-programme-operations/programme.service.ts`
- `src/app/api/admin/product-lender-matrix/route.ts`
- `src/app/api/lender-registry/programs/[programId]/workflow/route.ts`
- `src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx`
- `src/components/catalyst-one/product-programme-operations/programme-editor.tsx`
- `src/lib/enterprise-lender-registry/index.ts`
- `src/lib/enterprise-lender-registry/program-architecture.ts`
- `src/lib/product-programme-operations/isolated-durable-store.ts`
- `src/lib/product-programme-operations/policy-surface.ts`

### Sprint 4

- `scripts/co-product-program-operations-001-sprint4-verify.mjs`
- `src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx`
- `src/components/catalyst-one/enterprise-lender-workspace/elw-lender-registry.tsx`
- `src/components/catalyst-one/enterprise-mdm/product-programs-workspace.tsx`
- `src/lib/enterprise-lender-directory/compose-chanakya-insights.ts`
- `src/lib/enterprise-lender-directory/programs.ts`
- `src/lib/enterprise-lender-registry/index.ts`
- `src/lib/enterprise-lender-registry/map-to-directory.ts`
- `src/lib/product-programme-operations/index.ts`
- `src/lib/product-programme-operations/product-aliases.ts`
- `src/lib/product-programme-operations/registry-filters.ts`
- `src/types/enterprise-lender-directory.ts`

### Sprint 5

- `scripts/co-product-program-operations-001-sprint5-verify.mjs`
- `server/services/compass-customer-gateway/compass-recommendations.service.ts`
- `src/lib/chanakya-credit-proposal/compose-proposal.ts`
- `src/lib/chanakya-credit-proposal/gather-context.ts`
- `src/lib/chanakya-enterprise-read-context/product-lender-intelligence-core.ts`
- `src/lib/chanakya-enterprise-read-context/product-lender-intelligence.ts`
- `src/lib/chanakya-opportunity-recommendations/derive.ts`
- `src/lib/document-requests/generate-lod.ts`
- `src/lib/document-requests/store.ts`
- `src/lib/enterprise-deal/deal-create-from-opportunity.ts`
- `src/lib/enterprise-lender-registry/recommend-from-registry.ts`
- `src/lib/enterprise-opportunity-compass/compass-engine.ts`
- `src/lib/enterprise-opportunity-compass/index.ts`
- `src/lib/enterprise-partner-lod/project.ts`
- `src/lib/enterprise-partner-recommendations/project.ts`
- `src/lib/product-programme-operations/chanakya-evidence.ts`
- `src/lib/product-programme-operations/cibil-band.ts`
- `src/lib/product-programme-operations/deal-stamp.ts`
- `src/lib/product-programme-operations/index.ts`
- `src/lib/product-programme-operations/isolated-durable-store.ts`
- `src/lib/product-programme-operations/lod-merge.ts`
- `src/lib/product-programme-operations/match-published.ts`
- `src/lib/product-programme-operations/proposal-citation.ts`

### Sprint 6 (this commit)

- `docs/co-product-program-operations-001/CO-PRODUCT-PROGRAM-OPERATIONS-001-CERTIFICATION-REPORT.md`
- `scripts/co-product-program-operations-001-sprint1-verify.mjs`
- `scripts/co-product-program-operations-001-sprint2-verify.mjs`
- `scripts/co-product-program-operations-001-sprint3-verify.mjs`
- `scripts/co-product-program-operations-001-sprint4-verify.mjs`
- `scripts/co-product-program-operations-001-sprint5-verify.mjs`
- `scripts/co-product-program-operations-001-sprint6-bat.mjs`
- `server/repositories/lender-registry/lender-registry.repository.ts`
- `server/repositories/lender-registry/structured-program-data.ts`
- `server/services/tier2-registry/seed-baseline-commercial-programs.service.ts`
- `server/services/tier2-registry/seed-tier2-registries.service.ts`
- `src/components/catalyst-one/product-programme-operations/programme-editor.tsx`
- `src/lib/chanakya-credit-proposal/gather-context.ts`
- `src/lib/document-requests/generate-lod.ts`
- `src/lib/enterprise-deal/deal-create-from-opportunity.ts`
- `src/lib/product-programme-operations/fixtures.ts`
- `src/lib/product-programme-operations/lod-merge.ts`
- `src/lib/product-programme-operations/sprint1-proof.ts`
- `src/lib/product-programme-operations/to-registry-input.ts`
- `src/lib/product-programme-operations/to-write-payload.ts`

---

## Prisma migrations prepared

**Not applied.** Production / Hostinger migrations were not run. `prisma migrate dev` and `prisma db push` were not used.

| Migration | Path |
|-----------|------|
| Additive programme lineage + durable policy | `prisma/migrations/20260906180000_co_product_program_operations_001/migration.sql` |

### Schema summary

Canonical row remains `EnterpriseLenderProgram`.

Added / required:

- `lineageId` (backfilled from `id`; then NOT NULL)
- `lockVersion`
- structured eligibility JSON arrays (employment, constitution, residency, geography, documents, concessions)
- exact money / percent `DECIMAL` columns (`*_exact`)
- `publicationState`, `completenessState`, `isLivePublished`
- approval / submit metadata
- `policyVersionId` FK to durable policy versions
- unique `(organizationId, lineageId, versionNumber)`
- partial unique live published `(organizationId, code)` where not deleted and live published
- dropped `elprog_org_code_key` so draft revisions can share a code

New tables:

- `enterprise_credit_risk_policies`
- `enterprise_credit_risk_policy_versions`
- `enterprise_credit_risk_policy_audit_events`
- `enterprise_lender_program_audit_events`

Legacy Float commercial columns remain dual-written for display only. Durable representation is decimal **strings**, not JavaScript floats.

### Known migration / backfill risks

1. Stub classification is **deterministic** from existing columns only: missing policy ref OR empty LOD OR missing ROI → `incomplete` / `draft` / not live. No policy, LOD, or monetary values are invented.
2. Rows that already have policy ref + LOD + some ROI **and** `status=active` + `lifecycle_status=active` + `enabled=true` are marked complete/published/live. That may promote historically thin but non-empty stubs if those three fields happen to be present. Review before applying anywhere with real data.
3. Unique live-published code is partial. Seed create paths must supply `lineageId` and must not assume `organizationId_code`.
4. Applying this migration to production requires a **separate Product Owner authorisation**. It is prepared only.

---

## API persistence proof

**What was proven:** typed request schema, unknown-field rejection, tenant/role gates, POST/PATCH field round-trip, published-row overwrite protection, audit history, and process-restart durability against `IsolatedProgrammeDurableStore` (JSON file). HTTP routes were wired to `productProgrammeOperationsService` and inspected; they were **not** exercised against Postgres.

**What was not proven:** live `POST /api/lender-registry/programs` / `PATCH` against Prisma, lock-version conflict on a real database, or durable policy rows surviving a Postgres restart.

Sprint 1 file-store proof (`scripts/co-product-program-operations-001-sprint1-verify.mjs`): **PASS** (file store only).

---

## Controlled dropdown inventory

| Control | Source | UI |
|---------|--------|----|
| Lender | Enterprise Lender Registry | searchable Select |
| Product | Product Master options | Select |
| Product variant | programme variant code | text only when product has variants; not a free employment field |
| Applicant types | `PROGRAMME_APPLICANT_TYPES` | multi-select |
| Employment | `PROGRAMME_EMPLOYMENT_TYPES` — Salaried, Self-employed Professional, Self-employed Non-professional/Business, Not applicable | multi-select. **Both** is derived |
| Legal constitution | `PROGRAMME_LEGAL_CONSTITUTIONS` — Individual, Proprietorship, Partnership, LLP, OPC, Private Limited, Public Limited, HUF, Trust, Society, Other approved | separate multi-select |
| Residency | `PROGRAMME_RESIDENCY` — Resident, NRI, PIO/OCI, Not applicable | multi-select. **NRI is not constitution** |
| Property type | `PROGRAMME_PROPERTY_TYPES` including Not applicable | multi-select; hidden/forced N/A for non-property products |
| Transaction type | `PROGRAMME_TRANSACTION_TYPES` | multi-select; BT forced for `HOME_LOAN_BT` |
| Geography | ECM city/state masters via `listEcmMasterOptions` | multi-select |
| Income assessment | `PROGRAMME_INCOME_ASSESSMENT_METHODS` filtered by employment family | multi-select |
| Rate type | `PROGRAMME_RATE_TYPES` | Select |
| Benchmark | `PROGRAMME_BENCHMARKS` | Select |
| Policy | published durable policy list | Select |
| Document types | `EDIE_CATALOG` | searchable multi-select |
| Dates | date inputs | Effective / Review / Expiry |
| Money / percent | exact decimal strings + Indian currency display | structured numeric |

Free text remains only for description, policy notes, deviation/remarks narrative.

---

## Publication completeness proof

Server-side `evaluateProgrammeCompleteness` plus workflow `POST /api/lender-registry/programs/[programId]/workflow`.

File-store BAT:

- Incomplete programme cannot publish (**BAT-05 PASS**)
- Creator cannot self-approve (**BAT-07 PASS**)
- Approved complete programme publishes (**BAT-08 PASS**)
- Product–Lender Matrix / baseline seeds now create **draft incomplete** shells, not live published programmes

Not proven: the same gates on Prisma HTTP in a running app.

---

## Policy durability proof

Durable policy tables exist in the additive migration. Isolated store persists `policyVersionId` across process reload (**BAT-04 / Sprint 1 policyRestart PASS** on file store).

Not proven: `enterprise_credit_risk_policies` rows in Postgres surviving process restart.

Lender 360 policy surface statuses: `not_mapped` · `draft_policy` · `expired_policy` · `resolution_failure` · `available_published`.

---

## Lender Registry / Lender 360 proof

Code paths:

- Registry columns + search / product / applicant / status / effective-expired filters (`registry-filters.ts`)
- Alias collapse `HL_STD` / `HOME-LOAN` / `HOME_LOAN` / `LAP_STD` (`product-aliases.ts`)
- Lender 360 full published card, version history, draft-revision indicator, Edit → `createDraftRevision`

Sprint 4 file-store verify: **PASS**. Live Lender 360 UI against Prisma: **not run**.

---

## Downstream consumer proof

File-store / unit verify (Sprint 5 + BAT-16…21, 25, 26): **PASS**

| Consumer | Behaviour proven in file-store tests |
|----------|--------------------------------------|
| CHANAKYA ranker | Score 88 only with matching published complete programme; empty programmes → no Bank/HFC/NBFC heuristic rank |
| Opportunity Compass | Cites programme code + version |
| LOD | EDIE baseline + programme overlay; overlay wins same `typeRef`; empty `requiredDocuments` does not shadow `requiredDocumentTypeIds` |
| Proposal | `citePublishedProgramme` includes lender, programme, version, ROI range, eligibility, documents, effective date |
| Deal | `publishedProgrammeStamp` + `lenderProgramId`; existing stamp is not silently retargeted |

Live CHANAKYA / Compass / Deal screens: **not run**.

---

## All BAT results

Runner: `node --import tsx scripts/co-product-program-operations-001-sprint6-bat.mjs`  
Store: `IsolatedProgrammeDurableStore` (temp JSON). **Not PostgreSQL.**

| ID | Result | Notes |
|----|--------|-------|
| BAT-01 | PASS | Create complete draft |
| BAT-02 | PASS | Controlled employment + derived Both |
| BAT-03 | PASS | Constitution separate from NRI residency |
| BAT-04 | PASS | Commercial fields survived file reload |
| BAT-05 | PASS | Incomplete cannot publish |
| BAT-06 | PASS | Complete programme submitted |
| BAT-07 | PASS | Creator cannot self-approve |
| BAT-08 | PASS | Approved programme publishes |
| BAT-09 | PASS | Appears under fixture lender id |
| BAT-10 | PASS | Policy and documents present |
| BAT-11 | PASS | Admin edit creates draft v2 |
| BAT-12 | PASS | Published version stayed live |
| BAT-13 | PASS | Republish activates revision (ROI 8.250000) |
| BAT-14 | PASS | Previous version superseded / auditable |
| BAT-15 | PASS | Deactivation excluded from recommendations |
| BAT-16 | PASS | CHANAKYA match uses published programme |
| BAT-17 | PASS | Opportunity Compass uses published programme |
| BAT-18 | PASS | Alias matching |
| BAT-19 | PASS | LOD edie + programme_overlay |
| BAT-20 | PASS | Proposal cites programme and version |
| BAT-21 | PASS | Deal stores programme/version reference |
| BAT-22 | PASS | Tenant isolation (file store) |
| BAT-23 | PASS | Ordinary user cannot edit (file store) |
| BAT-24 | PASS | Incomplete stub not operational |
| BAT-25 | PASS | No heuristic rank without programmes |
| BAT-26 | PASS | No Bank/HFC/NBFC heuristic in ranker source |
| BAT-27 | PASS | Marketing execution `false` |
| BAT-28 | PASS | No email senders in ranker |
| FIXTURE-SE | PASS | Home Loan self-employed fixture |
| FIXTURE-BT | PASS | Home Loan Balance Transfer fixture |
| FIXTURE-BOTH | PASS | Multi-employment fixture |

Fixtures are **labels only**. They are not live approved bank rates.

Supporting verifies (file store / static): Sprint 1–5 scripts **PASS** after Sprint 6 `process.exit(0)` hang fix.

---

## Engineering gate results

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | **PASS** |
| ESLint `--max-warnings=0` on programme files | **PASS** |
| `npx prisma validate` with dummy `DATABASE_URL` | **PASS** (schema valid; database not running) |
| Product Programme / policy / publication / versioning / registry / consumer tests | **PASS** against isolated file store only |
| Permission and tenant tests | **PASS** against isolated file store only |
| Safe Next production build without production migration | **PASS** — `node ./node_modules/next/dist/bin/next build` with dummy `DATABASE_URL=postgresql://127.0.0.1:55432/...`. Exit 0. `npm run build` was **not** used (it runs `prisma migrate deploy`). |
| Secret scan (programme files) | **PASS** — only BAT-28 lists email provider needles as forbidden strings |
| External-call scan (programme files) | **PASS** — no live Google Sheet, cron, Hostinger, or SMTP senders |
| PostgreSQL round-trip | **FAIL / NOT RUN** — no local Postgres (port 5432 closed; no Docker) |
| Visual BAT screenshots | **NOT RUN** — no local app against an isolated database |

---

## Visual evidence paths

None. Live screenshots were not captured. Capturing UI against production or Hostinger was forbidden. This workstation had no isolated Postgres and no running local Catalyst One against the new schema.

Required captures remain outstanding for a later isolated BAT environment:

- Programme Registry
- Create/Edit wizard
- Employment multi-select
- Constitution multi-select
- Eligibility / Pricing / Policy / LOD / Review
- Publication errors
- Lender Registry
- Lender 360 programme card / full detail / version history / draft revision
- CHANAKYA programme evidence
- Opportunity Compass recommendation
- Proposal programme reference

---

## Confirmation of zero emails and zero external execution

| Control | Value |
|---------|--------|
| `ENTERPRISE_MARKETING_EXECUTION_ENABLED` | `false` |
| `ENTERPRISE_MARKETING_EMAIL_MODE` default | `dry_run` |
| `ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED` | `false` |
| `ENTERPRISE_MARKETING_SHEETS_MODE` default | `fixture` (not a live Google Sheet connection in this build) |
| Production Contacts / Opportunities created | **No** |
| Test or customer emails sent | **No** |
| Production cron registered | **No** |
| Live email provider activated | **No** |

---

## Hostinger and production

Unchanged. No push. No Hostinger deploy. No production migration. No production env change.

---

## Why this is blocked

The Product Owner instruction forbids claiming readiness if PostgreSQL persistence, publication gating, versioning, or downstream consumers were only statically inspected.

This build has:

1. Additive schema and HTTP wiring
2. Structured editor and publication workflow in code
3. File-store BAT covering the 28 scenarios

It does **not** have:

1. An isolated local PostgreSQL
2. Applied non-production migration + SQL round-trip
3. Live HTTP create/update/publish against Prisma
4. Visual BAT of Lender 360 / CHANAKYA / Compass (Next compile succeeded; UI was not exercised)

Marketing campaign authorisation remains **blocked** until Product Owner BAT on a real isolated database succeeds.

---

## Final status

**BLOCKED — PRODUCT PROGRAMMES NOT READY**

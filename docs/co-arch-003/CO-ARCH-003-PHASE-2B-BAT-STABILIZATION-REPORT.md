# Business Acceptance Testing Report — P0 Stabilization Sprint

**Environment:** Production — https://catalyst-one-two.vercel.app  
**Deployment:** `dpl_HiFLnxDS5mYatgMxVZMQ2kGLXunS` (Ready)  
**Organization:** `rupee-catalyst`  
**Mode:** Investigation only — **no fixes implemented**  
**Date:** 2026-07-24  
**Status:** Awaiting approval before remediation  

Related deep-dive: `docs/co-arch-003/CO-ARCH-003-P0-LOAN-JOURNEY-TRANSACTION-INVESTIGATION.md`

---

## Executive summary

BAT of the certified Phase 2A/2B Opportunity–Deal build is **blocked**.

| Severity | Count | Headline |
|----------|------:|----------|
| **P0 Blocking** | 3 | Loan Journey cannot start (Prisma txn maxWait) + LiveEntityMasterSearch request storm + provisional-contact mobile deadlock |
| **P1 Functional** | 7 | Opportunity-only create without Deal number; journey context ignores enterprise Opportunity ID; Source/meta persistence gaps; BT institution empty risk; Customer Type mismatch; Invoice Party only post-create; Overview BT validation gap |
| **P2 UI/UX** | 4 | Hidden RM on create; Login Date unbound; financials not on Overview; cancel-all-draft wipe |

**Recommendation:** Approve a **Stabilization Sprint** focused on P0 items first. Do **not** start Phase 2B Sprint 3 feature work until P0 is cleared and BAT re-run.

---

## 1. Blocking Issues (P0)

### P0-1 — Could not start loan journey / Transaction API maxWait

| Item | Detail |
|------|--------|
| **Observed** | Toast: `Could not start loan journey` · Detail: `Transaction API error: Unable to start a transaction in the given time.` |
| **Exact failure point** | `allocateOpportunityNumber()` → `prisma.$transaction(...)` in `server/services/enterprise-opportunity/opportunity-number.service.ts` during `POST /api/enterprise-opportunities` |
| **Meaning** | Prisma default **`maxWait = 2000ms`** exceeded — could **not acquire a connection / begin** interactive transaction. **Not** FK, RLS, Invoice Party, or Option A uniqueness. |
| **Call chain** | Loan Information submit → `addFileAsync` → `createDealAsync` → `persistNewOpportunityToEnterpriseRegistry` → Opportunity API → number allocator `$transaction` |
| **Evidence** | (1) Exact Prisma wording = maxWait semantics. (2) `server/lib/prisma.ts` has no `transactionOptions`. (3) Production Vercel logs show ECM GET flood immediately before BAT attempts. (4) Error mapped through as HTTP 500 `OPPORTUNITY_ERROR` with Prisma message. |
| **Layer** | Integration: Frontend request storm → Backend Prisma txn → Supabase pooler |
| **Introduced by** | Phase 2A Opportunity primary write (always needs interactive txn for `OPP-YYYY-######`) + live picker loop (amplifier) |

### P0-2 — LiveEntityMasterSearch ↔ registry notify loop (request storm)

| Item | Detail |
|------|--------|
| **Observed** | Production logs: `GET /api/ecm/contacts` and `GET /api/ecm/companies` ~every 150–250ms while Loan Journey create UI is open |
| **Mechanism** | `LiveEntityMasterSearch` warm effect deps include `registryVersion`. Successful search → `syncContactsToCache` / `upsertEcmCompanyLocal` → `notifyEcmContactRegistryChanged()` → version++ → warm re-runs. Loan create mounts **both** contact and company pickers with `warmOnMount={open}`. |
| **Evidence** | `live-entity-master-search.tsx` L81–108; `live-search.ts` L24–28; `company-registry.ts` upsert notify; `loan-create-form-dialog.tsx` dual pickers; Vercel log sample |
| **Layer** | Frontend (infinite API loop) causing backend pool saturation |
| **Introduced by** | Live Prisma pickers (`CO-BLOCKER-001` / related hotfix) after enterprise persistence |

### P0-3 — Provisional contact mobile deadlock on create

| Item | Detail |
|------|--------|
| **Observed (code)** | Selecting a contact whose `mobilePrimary` starts with `pending-` clears mobile to `""`. Mobile field is **read-only**. Zod requires `customerMobile.min(10)`. User cannot enter mobile → **submit permanently blocked** for that applicant. |
| **Evidence** | `loan-create-form-dialog.tsx` `selectPrimaryApplicant` + `ReadOnlyField` Mobile + Zod L87 |
| **Layer** | Frontend validation vs Progressive Contact Creation UX |
| **Conflicts with** | Progressive Contact Constitution (PROVISIONAL contacts must allow journey continuation) |

---

## 2. Functional Bugs (P1)

| ID | Issue | Impact | Layer | Architecture link |
|----|-------|--------|-------|-------------------|
| **P1-1** | Typical Loan Journey create sets `lender` **label only** (`HDFC Bank`), not `lenderRegistryId` → `createDealAsync` creates **Opportunity only**; `dealNumber` / `enterpriseDealId` empty | BAT Step “create Deal / verify Deal Number” fails even when Opportunity succeeds | Backend contract + Frontend payload | Phase 2A BI-1…BI-3 (Deal requires lender registry id) |
| **P1-2** | After create, `setActiveOpportunityContext({ opportunityId: undefined })` and label uses `opportunityNumberForFile` which **ignores** `file.opportunityNumber` | Journey chrome / Continue hops may lose enterprise Opportunity identity | Frontend | Phase 2A Opportunity Registry |
| **P1-3** | Source (+ often participants/company meta) not on primary create payload; conditional local `updateFile` only; Overview Source is **locked** and often `"—"` | Source Details empty after create | Frontend / dual-write gap | Pre-existing + worsened under primary write |
| **P1-4** | BT institution uses **memory-only** `OrganizationRegistrySelect` (not live API) | Balance Transfer mandatory institution list may be empty in prisma mode | Frontend | Dynamic Transaction Type |
| **P1-5** | Customer Type on create (Individual/MSME/…) stuffed into notes; Overview derives Business/Individual only — **no edit** | Semantic mismatch; financial profile context lost | Frontend | Context-aware collection |
| **P1-6** | Invoice Party **absent on create**; first assignable on Overview / stage ≥ logged_in | Ops may expect Invoice Party earlier; empty Master → empty dropdown | Frontend + Master data | Phase 2B Sprint 1 (by design for stage gate; still BAT surprise) |
| **P1-7** | Overview BT edit has **no Zod mandatory** institution/amount (create has) | Policy bypass vs create form | Frontend | Dynamic Transaction Type |

---

## 3. UI/UX Issues (P2)

| ID | Issue | Notes |
|----|-------|-------|
| **P2-1** | Relationship Manager required in schema but **no picker on create** (silent `loanManagers[0]`) | User cannot choose RM at start |
| **P2-2** | Login Date shown as constant `today`, not bound to RHF `loginDate` | Mild display drift |
| **P2-3** | Create-time financial fields not surfaced on Overview | Discoverability |
| **P2-4** | Overview `cancelEdits` resets **entire** draft from snapshot | Cross-card wipe |

---

## 4. Root Cause Analysis (Part 1 checklist)

| Investigation area | Finding |
|--------------------|---------|
| **Browser Console** | Toast surfaces Prisma message; underlying cause is API 500 + pool starvation (loop also produces network noise) |
| **Network** | Failing write: `POST /api/enterprise-opportunities`. Concurrent storm: `GET /api/ecm/contacts`, `GET /api/ecm/companies` |
| **Backend Logs** | Vercel λ spam on ECM GETs; Opportunity POST fails with Prisma Transaction API maxWait when pool exhausted |
| **Supabase** | Connectivity exists (read paths work). Failure mode is **pooler slot / connection acquisition**, not missing project |
| **DB Transactions** | Begins at `allocateOpportunityNumber` `$transaction`. Failure is **before** Opportunity row insert when maxWait fires. Rollback N/A (txn never started) |
| **RLS** | Not indicated (would not produce Prisma Transaction API maxWait wording) |
| **FK / Constraints** | Not indicated (would be `P2003` / validation messages) |
| **Triggers** | Not indicated |
| **Timeouts** | Prisma interactive **`maxWait` 2s** (start), not statement timeout |
| **API Failures** | Opportunity create 500 with Prisma message → client `DealCreatePersistenceError` → toast |

**Causal chain:**

```
Open Loan Journey create
  → LiveEntityMasterSearch warm loop (P0-2)
  → ECM GET storm saturates Supabase pooler
  → User submits
  → allocateOpportunityNumber $transaction cannot start in 2s (P0-1)
  → "Could not start loan journey"
```

---

## 5. Loan Journey screen validation matrix

### 5.1 Loan Information (create) — summary

| Section | Rendering | Editable | Auto-populate | Conditional | Validation | Save / submit | Status |
|---------|-----------|----------|---------------|-------------|------------|---------------|--------|
| Primary Applicant search | OK | Yes | ECM | — | Required | Blocked by P0-1/P0-3 | **Fail under BAT** |
| Mobile / Email / Employment / City | OK | **Read-only** | ECM | — | Mobile min 10 | Deadlock if pending | **Fail (P0-3)** |
| Associated Company | OK | Yes | Profile | — | Optional | Meta gap P1-3 | Caution |
| Source | OK | Yes | Default Direct | Source Contact if not Direct | Required | Often not persisted | **Fail (P1-3)** |
| Product Type / Product | OK | Yes | Defaults | Product list by type | Required | Local master OK | Pass (code) |
| Transaction Type + BT | OK | Yes | Fresh | BT section on BT | BT mandatory | Institution empty risk | Caution (P1-4) |
| Customer Type + Financials | OK | Yes | Defaults | Context-aware | Profile required | Notes-only Customer Type | Caution (P1-5) |
| CIBIL / Priority / Expected Login | OK | Yes | Defaults | — | CIBIL required | — | Pass (code) |
| Stage / Sub Stage / Login Date | OK | RO | Fixed | — | — | — | Pass / P2-2 |
| Invoice Party | **Missing** | — | — | — | — | Post-create only | P1-6 |
| Lender / RM pickers | **Hidden** | No | Hardcoded | — | Schema silent | Opportunity-only Deal | P1-1 / P2-1 |

### 5.2 Post-create Loan Workspace Overview — summary

| Section | Status |
|---------|--------|
| Loan Details (product, amount, priority, RM) | Editable in edit mode; soft validation |
| Invoice Party | Present; Master API; required from `logged_in` |
| Participants / Structure | Present; depends on create meta success |
| Source Details | **Locked**; often empty (P1-3) |
| Property | Only if secured product; not on create |
| Stage transitions / Lender Pipeline | Separate tab; not reachable if create fails (P0-1) |

**Note:** Full interactive BAT of every Overview field after successful create could not be completed in this session because **P0-1 blocks journey start** on production under the picker storm. Matrix above is **code-audited** + production log evidence for the blocking path.

---

## 6. Regression analysis

| Issue | Frontend | Backend | DB | Integration | Introduced by (functional attribution) | Exact git commit |
|-------|----------|---------|----|-------------|----------------------------------------|------------------|
| P0-1 txn maxWait | Amplifier | Allocator `$transaction` | Pooler | **Yes** | Phase 2A Opportunity primary write + default Prisma maxWait on Vercel | **Unknown SHA** — prod deploy is CLI working-tree (`dpl_HiFLnx…`); no Git commit on Vercel inspect |
| P0-2 ECM loop | **Yes** | — | — | Amplifies P0-1 | LiveEntityMasterSearch + notify on sync (`CO-BLOCKER-001` era) | Same — uncommitted / CLI deploy lineage |
| P0-3 pending mobile | **Yes** | — | — | — | Progressive contact + read-only mobile + Zod | Pre-2B / journey form |
| P1-1 Opportunity-only | Payload | BI-3 gate | — | **Yes** | Phase 2A intentional; create form never sends `lenderRegistryId` | Phase 2A |
| P1-2 opportunityId undefined | **Yes** | — | — | Missed wiring after 2A | Post-2A identity attach incomplete in workspace | Phase 2A follow-on gap |
| P1-6 Invoice Party create | **Yes** | Stage gate | Master | — | Phase 2B Sprint 1 design (assign on Deal) | Sprint 1 |

**Conclusion:** Blocking BAT failure is a **regression of the Opportunity primary-write era**, made acute by the **live picker loop**. It is not an Invoice Party Sprint 1 schema defect.

---

## 7. Files affected

### P0 (must touch for fix)

- `src/components/catalyst-one/shared/live-entity-master-search.tsx`
- `src/lib/enterprise-registry/live-search.ts`
- `src/lib/enterprise-company-master/company-registry.ts` (notify on upsert)
- `server/services/enterprise-opportunity/opportunity-number.service.ts`
- `server/services/enterprise-deal/deal-number.service.ts` (same pattern)
- `server/lib/prisma.ts` (transactionOptions / pool guidance)
- `src/components/catalyst-one/loan-files/loan-create-form-dialog.tsx` (pending mobile)

### P1

- `src/lib/enterprise-deal/deal-data-access.ts` / `primary-write.ts` / `map-loan-file-to-deal.ts`
- `src/components/catalyst-one/loan-files/loan-information-workspace.tsx`
- `src/lib/enterprise-credit-workspace/map-documents.ts` (`opportunityNumberForFile`)
- `src/components/catalyst-one/shared/organization-registry-select.tsx`
- `src/components/catalyst-one/shared/loan-workspace-modal.tsx`
- `src/components/catalyst-one/shared/commercial-payee-field.tsx`

---

## 8. Recommended fixes (approval required — do not implement yet)

### Wave A — Unblock BAT (P0)

1. **Break LiveEntityMasterSearch loop** — remove `registryVersion` from warm deps **or** stop notifying on warm/search cache sync.  
2. **Raise / configure Prisma interactive `maxWait`/`timeout`** for number allocators (+ optional client defaults) for serverless + pooler.  
3. **Provisional mobile** — allow edit when mobile empty/pending, or skip min(10) for provisional + Chanakya follow-up (align Progressive Contact).

### Wave B — Make BAT Deal verification possible (P1)

4. Wire enterprise `opportunityId` / `opportunityNumber` into active journey context and label helper.  
5. Clarify create UX: Opportunity-first is OK, but surface `OPP-…` clearly; add optional Identify Lender path if BAT expects `DEAL-…` immediately.  
6. Persist Source (and participants meta) through enterprise update path, not conditional local-only patch.  
7. BT institution → live company/lender-capable search in prisma mode.  
8. Align Customer Type persistence between create and Overview.

### Wave C — Polish (P2)

9. RM picker on create; bind Login Date; show financial summary on Overview.

---

## 9. Risk assessment

| Risk | Level | Notes |
|------|-------|-------|
| Production Loan Journey create blocked | **Critical** | Confirmed BAT + code + logs |
| Pool exhaustion affecting other APIs | **High** | Any `$transaction` under storm |
| Partial Opportunity without Deal | **Medium** | By design when no lender registry id — confuses BAT “Deal Number” check |
| Data corruption | **Low** | Failure typically before Opportunity insert when allocator cannot start |
| Proceeding to Sprint 3 features | **High business risk** | Must not |

---

## 10. BAT readiness verdict

| Question | Answer |
|----------|--------|
| Is production ready for continued Business Acceptance Testing of Opportunity → Deal? | **No — blocked by P0-1/P0-2** |
| Can Contact create succeed? | Likely yes (separate ECM create); not the failing path |
| Can Loan Journey start succeed reliably? | **No** under current picker storm + txn maxWait |
| Can Deal Number be verified after start? | **No** until journey starts; even then create is Opportunity-only without `lenderRegistryId` (P1-1) |
| Approve implementation? | **Awaiting your approval** of this report before any fix |

---

## Appendix A — Exact point of failure (P0-1)

```
File: server/services/enterprise-opportunity/opportunity-number.service.ts
Line: prisma.$transaction(async (tx) => { ... })
Error: Transaction API error: Unable to start a transaction in the given time.
HTTP: POST /api/enterprise-opportunities → 500 OPPORTUNITY_ERROR
UI: loan-information-workspace.tsx → "Could not start loan journey"
```

## Appendix B — Production log evidence (ECM storm)

```
catalyst-one-two.vercel.app  λ GET /api/ecm/companies  (~200ms cadence)
catalyst-one-two.vercel.app  λ GET /api/ecm/contacts   (~200ms cadence)
```

Sustained while Loan Journey create UI is open — consistent with P0-2.

---

**End of investigation report. No code changes were made in this pass.**

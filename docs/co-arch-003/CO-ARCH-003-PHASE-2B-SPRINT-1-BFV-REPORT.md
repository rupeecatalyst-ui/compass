# CO-ARCH-003 Phase 2B Sprint 1 — Business & Functional Validation Report

**Program:** Phase 2B Sprint 1 — Invoice Party Architecture  
**Date:** 2026-07-24  
**Environment:** Production DB (secure runner) + Vercel `https://catalyst-one-two.vercel.app`  
**Scope:** Validation / certification only — no feature work, no architecture changes  
**Evidence:** `docs/co-arch-003/CO-ARCH-003-PHASE-2B-S1-BFV-EVIDENCE.json`  
**Harness:** `scripts/co-arch-003-p2b-s1-bfv-validate.mjs` → **56 PASS / 0 FAIL**

---

## Executive verdict

| Result | Detail |
|--------|--------|
| **Overall** | **PASS** |
| Defects blocking Sprint 1 | **None** |
| Recommendation | **Recommend Final Business Certification** |

The Invoice Party architecture behaves as approved. Certified Phase 2A Opportunity–Deal structure remains intact.

---

## TEST 1 — Invoice Party Master

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| 1.1 | Accounting → Invoice Party Master accessible (nav + workbench wiring) | **PASS** | `accounting-workbench.ts` id `invoice_party_master`; `/accounting` page → `AccountingWorkspace` |
| 1.2 | “Add Invoice Party” available | **PASS** | Master UI CTA present |
| 1.3 | Existing Contacts / Companies searchable | **PASS** | `LiveEntityMasterSearch` kind `contact` / `company` |
| 1.4 | Selecting Contact/Company creates linked Invoice Party | **PASS** | Created Master row with `contactId` / `companyId` FK |
| 1.5 | No duplicate Contact/Company created | **PASS** | Contact count +1 only for explicit test Contact; Master create does not insert ECM rows |
| 1.6 | Accounting fields saved | **PASS** | GSTIN, PAN, billing address, state, invoice email, TDS, GST status persisted |

**TEST 1 result: PASS**

---

## TEST 2 — Deal Workspace

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| 2.1 | Invoice Party dropdown available | **PASS** | Deal field label “Invoice Party”; wired in loan workspace |
| 2.2 | Dropdown reads ONLY from Invoice Party Master | **PASS** | `invoicePartyApiClient.listActive()` — no Contact Registry search in Deal field |
| 2.3 | Contacts that are NOT Invoice Parties do NOT appear | **PASS** | Non-party Contact absent from Master active list |
| 2.4 | Selected Invoice Party saves | **PASS** | Deal `invoicePartyId` = Master id |
| 2.5 | Persists after reopen | **PASS** | Reload Deal row retains FK + display name |

**TEST 2 result: PASS**

---

## TEST 3 — Relationship validation

```
Enterprise Contact / Company Registry
        │  1 : 0..1
        ▼
Invoice Party Master
        │  1 : Many
        ▼
Deals
```

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| 3.1 | Every Invoice Party references one Contact or Company | **PASS** | Zero orphan Master rows in sample; create requires link |
| 3.2 | One Invoice Party usable across multiple Deals | **PASS** | Same Master id on Deal(SBI) + Deal(ICICI) |
| 3.3 | No duplicate Contact/Company records from Master flow | **PASS** | Count checks + unique indexes block second Master for same Contact |
| 3.4 | 1:0..1 uniqueness enforced | **PASS** | Duplicate Master create for same Contact rejected |

**TEST 3 result: PASS**

---

## TEST 4 — Chanakya validation

Configured stage SSOT: `INVOICE_PARTY_REQUIRED_FROM_STAGE = "logged_in"`  
Hard gate: progression **beyond** that stage.

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| 4.1 | Without Invoice Party, progression beyond Logged In blocked | **PASS** | Assert on `soft_approved` throws |
| 4.2 | Correct message | **PASS** | Exact approved copy: *“This Deal does not have an Invoice Party assigned. Please select an Invoice Party from the Accounting Master before proceeding.”* |
| 4.3 | Assign Invoice Party → validation clears | **PASS** | Assert succeeds with Master id |
| 4.4 | Deal can proceed after assignment | **PASS** | Previously empty Deal updated then allowed |
| 4.5 | Stage gate configurable (not hard-coded only in UI) | **PASS** | Constant + pipeline/service consumers |
| 4.6 | Logged In itself not hard-blocked (beyond-stage semantics) | **PASS** | `logged_in_wip` without party does not throw |

**TEST 4 result: PASS**

---

## TEST 5 — Opportunity–Deal regression (Phase 2A)

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| 5.1 | Create Contact | **PASS** | ECM Contact created |
| 5.2 | Create Opportunity | **PASS** | e.g. `OPP-2026-000003` |
| 5.3 | Create multiple Deals (HDFC / SBI / ICICI) | **PASS** | 3 Deals under one Opportunity |
| 5.4 | Opportunity stores correctly | **PASS** | Row + opportunity number |
| 5.5 | Deals store correctly | **PASS** | Deal numbers + lender FKs |
| 5.6 | Opportunity–Deal relationship intact | **PASS** | All deals `opportunityId` = parent |
| 5.7 | No data corruption | **PASS** | Registry tables + FK constraints intact after run |

**TEST 5 result: PASS**

---

## TEST 6 — Application regression

| Area | Status | Notes |
|------|--------|-------|
| Authentication | **PASS** | Unchanged; `/api/invoice-parties` returns **401** without token (expected) |
| Routing | **PASS** | `/accounting` page present; Invoice Party API + legacy alias routes present |
| Navigation | **PASS** | Accounting workbench includes Invoice Party Master |
| Contact Registry | **PASS** | `ecm_contacts` intact; create/read in validation |
| Company Registry | **PASS** | `ecm_companies` intact |
| Opportunity Registry | **PASS** | `enterprise_opportunities` intact |
| Deal Registry | **PASS** | `enterprise_deals` intact; Invoice Party FK constraint present |
| Existing APIs | **PASS** | New `/api/invoice-parties`; alias `/api/accounting-payees` retained |
| Repository layer | **PASS** | `invoice-party` repository/service; accounting-payee re-exports |
| Database integrity | **PASS** | Unique indexes + Deal→Master FK verified |

Production smoke (`curl`):

| URL | HTTP |
|-----|------|
| `/` | reachable (app responds) |
| `/api/invoice-parties` | **401** (auth required — correct) |
| `/api/accounting-payees` | **401** (alias alive) |

**TEST 6 result: PASS**

---

## Defects discovered

**None.** No blocking defects. No code fixes required for Sprint 1 certification criteria.

---

## Architectural observations

1. Physical DB table remains `enterprise_accounting_payees`; Prisma model is `EnterpriseInvoiceParty` with `@map` — intentional Sprint 1 backward compatibility.
2. Deal column remains `commission_accounting_payee_id` mapped to `invoicePartyId` — dual API keys accepted for transition.
3. Chanakya hard-blocks progression *beyond* the configured stage (`logged_in`); UI still requires Invoice Party at that stage — matches “beyond configured stage” success criterion.
4. Disbursement “Intelligent Payee” is a separate concept and was correctly left unchanged.

---

## Regression summary

| Layer | Regression? |
|-------|-------------|
| Phase 2A Contact → Opportunity → multi-Deal | **No** |
| ECM Contact / Company | **No** |
| Auth / API security posture | **No** (401 without JWT) |
| Accounting module shell | **No** (additive workbench) |

---

## Recommendation

**Recommend Phase 2B Sprint 1 (Invoice Party Architecture) for Final Business Certification.**

Await formal Business Certification before starting Phase 2B Sprint 2.

---

## Authentication

Authentication: ✅ Unchanged (`admin@compass.com` / Business Certification Admin freeze)

---

## How to re-run

```bash
node scripts/run-with-db-env.mjs scripts/co-arch-003-p2b-s1-bfv-validate.mjs
```

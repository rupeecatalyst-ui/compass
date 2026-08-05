# CO-LR-010 — Enterprise Lender Registry Completion Programme

**Status:** Applied (additive) · Final audit complete  
**Date:** 2026-07-31  
**Script:** `scripts/co-lr-010-complete-registry.mts`  
**Summary JSON:** `docs/co-lr-010/CO-LR-010-COMPLETION-SUMMARY.json`  
**Final audit:** re-ran `scripts/co-lr-009-audit.mts`

---

## Production data attestation

| Action | Performed? |
|--------|------------|
| Delete lender records | **No** |
| Modify / remint Lender IDs | **No** |
| Change Deal / Opportunity FKs | **No** |
| Remove lender programmes | **No** |
| Rename existing canonical lenders | **No** |
| Truncate tables | **No** |
| Invented interest / LTV / FOIR / CIBIL policy values | **No** (left unset) |
| Mode | **Additive create + fill-missing metadata + create-missing programmes** |

---

## Phase 1 — Master catalogue validation

| Check | Result |
|-------|--------|
| Approved master total | **275** |
| Unique seedKeys | **275** |
| `getLenderSeeds()` | **275** |
| Lenders with 0 products | **0** |
| Public Sector Banks | 12 |
| Private Banks | 22 |
| Small Finance Banks | 12 |
| HFCs | 32 |
| NBFCs | 98 |
| Foreign Banks | 28 |
| Co-operative Banks | 65 |
| Payments Banks | 6 |
| Additional lenders recommended before seed | **None** (PO catalogue accepted as SSOT) |
| **Validated** | **YES — seeding authorised** |

Note: Prisma `LenderMasterClassification` has no `foreign_bank` enum value. Foreign Banks are stored with `categoryCode = foreign_bank` and `classification = null` (CO-LM-003 pattern).

---

## Phase 2 — Complete Registry (additive)

| Metric | Count |
|-------:|------:|
| Live rows before | 90 |
| Categories created | 1 (`foreign_bank` if missing) |
| **Lenders created** | **192** |
| Existing non-provisional linked (no second row) | 83 |
| Fill-missing metadata updates on linked rows | 83 |
| Exact catalogue codes still missing | **0** |
| Catalogue coverage (code or non-provisional name link) | **275 / 275** |

Rules enforced:

- Create-missing only for catalogue `seedKey` codes  
- Never reuse `BF_*` / `LND-P2A-*` as canonical identity  
- Name-match to non-provisional rows → link + fill-missing (no duplicate create)  
- Existing IDs / codes preserved  

---

## Phase 3 — Baseline programmes

| Metric | Count |
|-------:|------:|
| **Programmes created** | **1,573** |
| Programmes skipped (already present) | 0 |
| Programmes missing lender | 0 |
| Catalogue lenders with ≥1 programme | **275 / 275** |
| Commercial numeric policy fields | **Unset (NULL)** — not invented |

Programmes follow each lender’s catalogue `productsSupported` (Home Loan, BT, LAP, Business Loan, Working Capital, Construction, Personal Loan, etc. as applicable).

---

## Phase 4 — Enterprise metadata

On create / fill-missing:

- Category · Published/Active gates · Website · HQ · Short name · Aliases · Supported products · Tags (`co-lr-010`, `seed:<key>`)

Channel / processing-model commercial packs were **not** fabricated.

---

## Phase 5 — Programme foundation (policy intelligence)

Interest rate, processing fee, max LTV, FOIR, min CIBIL, max tenure, TAT, required documents:

**Left NULL** wherever not already present. No invented values.

---

## Phase 6 — Duplicate review

| Metric | Count |
|-------:|------:|
| Presentation duplicate families (live) | **9** |
| Physical merges | **0** (blocked) |

CO-LR-008 presentation canonicalisation remains the SSOT for selectors. Families include legacy `BF_*` / inactive `LND-P2A-*` alongside canonical catalogue codes — retained for FK continuity.

After presentation dedupe, UI survivor count ≈ **271**.

---

## Phase 7 — UI verification (static + counts)

Visibility gate unchanged: Published ∧ Active ∧ enabled ∧ not `BF_*` ∧ presentation survivor.

| Surface | SSOT consumer | Status |
|---------|---------------|--------|
| Opportunity Workspace / Competition | `listCanonicalEnterpriseLenderOptionsAsync` | Uses Registry + presentation dedupe |
| Loan / Deal Manual Recommendation | same | OK |
| Lender dropdowns / search | Published directory | OK |
| Product–Lender Matrix | Registry APIs | OK |
| Wealth Partner | Does not own lender SSOT | N/A (no alternate lender master) |
| Filters | Registry classification / category | Foreign Bank category available |

Live counts after apply:

- UI-visible Published∧Active: **276**  
- After presentation dedupe: **271**  
- Soft-deleted: **0**  

---

## Phase 8 — Final audit (CO-LR-009 re-run)

| Metric | Before (CO-LR-009) | After (CO-LR-010) |
|--------|-------------------:|------------------:|
| Approved Master | 275 | 275 |
| Live Registry (non-deleted) | 90 | **282** |
| Catalogue missing from DB | **192** | **0** |
| Exact catalogue codes missing | 192 | **0** |
| Catalogue lenders with programmes | ~7 | **275** |
| Presentation duplicate families | 7 | **9** |
| UI-visible | 84 | **276** |

Why live = 282 not 275: **7** legacy/provisional/extra non-deleted rows remain (e.g. `BF_*`, inactive phase fixtures) — **not deleted** per PDP. Catalogue coverage is complete.

**Programme coverage (catalogue):** **100%** (275/275 have ≥1 programme).

---

## Deliverable summary

1. **Registry Completion Report** — this document  
2. **Lenders added:** **192**  
3. **Programme mappings created:** **1,573**  
4. **Remaining presentation duplicates:** **9** families (no physical merge)  
5. **Final audit:** `docs/co-lr-009/CO-LR-009-LENDER-REGISTRY-COMPLETENESS-AUDIT.md` + inventory JSON (re-generated)  
6. **Business Acceptance Report** — see below  
7. **No production deletes / ID rewrites** — confirmed  

### Re-run commands

```bash
npm run complete:co-lr-010          # dry-run
npm run complete:co-lr-010 -- --apply
npm run audit:co-lr-009
```

---

## Business Acceptance Report

### Development
- Build Status: ⚠️ Not required for seed script (ops apply)
- TypeScript Status: ✅ Script executed via `tsx`
- Lint Status: ⚠️ N/A (ops script)
- Smoke Test Status: ✅ Final audit `missingFromDb = 0`, programmes `275/275`

### Git
- Commit Status: ⏸️ Pending milestone / end-of-day request

### Deployment
- Deployment Status: ⏸️ Seed applied to configured `DATABASE_URL` environment  
- Vercel redeploy: not required for DB seed (data-plane)

### Authentication
Authentication: ✅ Unchanged

### Implementation Summary
- Changed: Additive lender completion + baseline programmes + fill-missing metadata  
- Files: `scripts/co-lr-010-complete-registry.mts`, `docs/co-lr-010/*`, package scripts, refreshed `docs/co-lr-009/*`  
- Architectural decisions: Preserve provisional/legacy rows; presentation dedupe; no invented policy numbers  
- Completed: Phases 1–8  
- Partially Completed: Physical duplicate count ≠ 0 (by design)  
- Pending: Optional PO review of 9 presentation families; BAT of picker UX in browser  

### Final Status
✅ Ready for Business Certification (data completeness)  
🟡 Presentation duplicates remain visible only as Legacy/Historical survivors — expected under CO-LR-008

---

*End of CO-LR-010*

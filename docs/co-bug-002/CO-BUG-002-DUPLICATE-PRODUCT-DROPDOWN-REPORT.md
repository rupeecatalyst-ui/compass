# CO-BUG-002 — Duplicate Product Entries in Product Selection

**Status:** Implementation complete (Production Data Protection compliant)  
**Priority:** Product defect  
**Change control:** No Prisma migrations · **No mutation of existing Product Master rows** · No delete/truncate  

---

## 1. Root cause

Product Master seed concatenated three catalogues and de-duplicated by **code only**:

1. Canonical Product Master (`HOME_LOAN` → “Home Loan”)
2. Product Library definitions (`HL_STD` → “Home Loan”)
3. ECM legacy picker (`HOME-LOAN` → “Home Loan”)

Plus Tier-2 dual-read previously **merged** DB + constants (different codes / same labels).

---

## 2. Production Data Protection decision

An earlier draft remediator would have **disabled** duplicate rows on seed. That was **withdrawn** under Production Data Protection:

- Existing Product Master rows are **not** deleted, disabled, or rewritten by seed.
- Historical codes remain available for Opportunity / Deal / LoanFile mappings.
- Dropdown uniqueness is enforced at **read / selection** time only.
- Seed only **stops creating new** duplicate codes/labels going forward.

Physical cleanup of legacy duplicate rows requires **explicit Product Owner approval** (separate change).

---

## 3. Files changed

| Path | Change |
|------|--------|
| `server/services/tier2-registry/seed-catalog.ts` | Prevent new duplicate seeds (code + label + alias) |
| `server/services/tier2-registry/seed-tier2-registries.service.ts` | No remediator — preserves live Product rows |
| `src/constants/enterprise-product-master/canonical-catalog.ts` | Legacy aliases + code normalization |
| `src/lib/enterprise-product-master/options.ts` | `dedupeProductOptionsForSelection` (read-only) |
| `src/lib/enterprise-tier2-ports/ports/dual-read-ports.ts` | DB-only products + label dedupe (no row mutation) |
| `scripts/co-bug-002-verify.mjs` | Guards against seed mutation |

---

## 4. BAT

```bash
npm run verify:co-bug-002
```

Confirm Product dropdown uniqueness on Lead Information, Opportunity, Deal selectors. Admin Product Master may still list historical duplicate **rows** (data preserved) — selection UX shows each label once.

---

## Final status

🟡 Implementation ready · Awaiting Product Owner BAT on selection UX  
Physical master-data cleanup of duplicate rows: **blocked** until PO approves a dedicated remediation.

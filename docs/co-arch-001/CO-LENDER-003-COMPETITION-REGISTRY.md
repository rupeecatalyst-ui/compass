# CO-LENDER-003 — Competition Lender Registry Integration

**Status:** Fixed · Verify PASS · Deployed  
**Date:** 2026-07-26  
**Production:** https://catalyst-one-two.vercel.app (`dpl_6LTpaemMaHZb9BknWCnH539qAqFP`)

---

## 1. Root cause

Two defects blocked Competition search:

### A. UI gate (primary UX failure)

Search input rendered when Competition = Yes and lenders empty, but **results only rendered when `editing === true`**.

After Yes (prompt or answer), `editing` stayed `false` → typing “ICICI” filtered in memory → **UI showed nothing**.

### B. Disconnected / incomplete directory (data)

Competition called sync `listPublishedLenderOptions()` (warm session **or Soft Go-Live local only**).

Manual Recommendation / LIFE use `listPublishedLenderOptionsAsync()` = **API ∪ Soft Go-Live**, Published ∧ Active.

In production, Published lenders often live primarily in the **Enterprise Lender Registry API**. Sync-only search returned empty or incomplete catalogues.

Not a separate competition dataset — wrong **consumer path** + Edit gate.

---

## 2. Files responsible

| Role | File |
|------|------|
| Search UI + gate | `workspace-competition-panel.tsx` |
| Competition persistence | `competition-store.ts` |
| Canonical directory | `published-directory.ts` (`listPublishedLenderOptionsAsync`) |
| Exclusion consumers | LIFE / Manual (`getExcludedCompetitionKeys`) |

---

## 3. Registry queried

**Before:** Soft Go-Live / session sync snapshot only (`listPublishedLenderOptions`).  
**After:** Enterprise Lender Registry Published · Active via `listPublishedLenderOptionsAsync` (same SSOT as Manual, LIFE, Deal Creation, Pipeline).

---

## 4. SSOT confirmation

✓ One canonical Published lender directory  
✓ No separate competition-lender catalogue  
✓ Select persists `enterpriseLenderId`  
✓ Exclusion keys include Registry id  
✓ Results visible when Yes (auto-edit when empty)  

---

## 5. Business certification

Search ICICI → results → select → chip → refresh persists → Chanakya / Manual exclude (unless override).

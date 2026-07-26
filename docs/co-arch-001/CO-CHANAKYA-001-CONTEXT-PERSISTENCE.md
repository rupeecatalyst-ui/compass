# CO-CHANAKYA-001 — Chanakya Context Persistence & Auto-Population

**Status:** Fixed · Verify PASS · Deployed  
**Date:** 2026-07-26  
**Production:** https://catalyst-one-two.vercel.app (`dpl_Dgii9uVpNcNwu36v7mMP6JdfXjmT`)

---

## 1. Root cause analysis

City was **persisted correctly** on Enterprise Opportunity Registry as `cityLabel` (Lead Information / Chanakya gap save).

Chanakya and LIFE did **not** consume that field.

| Step | What happened |
|------|----------------|
| Loan Details / Lead Information / Chanakya City | Saved to `Opportunity.cityLabel` |
| Session | `putSessionOpportunity` held full Opportunity including `cityLabel` |
| Runtime projection | `projectOpportunityToRuntimeCase` set `file.city` from **ECM Contact only** |
| Chanakya derive | Read `file.city` → empty for progressive contacts → City gap |
| User selects Mumbai | Optimistic `file.city` + PATCH `cityLabel` → recommendations appear |
| `onAfterPersist` → `reloadRuntime` | Re-projected from Contact → wiped city → recommendations gone |

**Not** missing Registry write. **Not** Chanakya inventing a second store.

**Primary defect:** incorrect Opportunity → runtime mapping + remount overwrite of optimistic state.

---

## 2. Files responsible

| Role | File |
|------|------|
| Mapping bug (fixed) | `opportunity-runtime-adapter.ts` |
| Derive gap (fixed) | `chanakya-opportunity-recommendations/derive.ts` |
| LIFE Property City (fixed) | `enterprise-life-engine/case-context.ts` |
| Persist (already correct) | `chanakya-opportunity-recommendation-panel.tsx`, `chanakya-gap-inline-field.tsx` |
| Remount trigger | `credit-bench-workspace.tsx` `reloadRuntime` |

---

## 3. Classification

- **Incorrect Opportunity mapping** — primary  
- **Remount / state overwrite** — amplifier after save  
- **Missing Session Context usage for city in derive** — secondary (derive now reads cached Opportunity `cityLabel`)  
- **Not** missing Registry persistence for Chanakya / Lead Information City  

---

## 4. Implementation plan (executed)

1. Prefer `Opportunity.cityLabel` / `stateLabel` in `projectOpportunityToRuntimeCase` (Contact seeds only when Registry empty).  
2. Chanakya `collectSignals` / `readExtensionSignals` fall back to cached `cityLabel`.  
3. LIFE `fromLoanFile` uses projected city + Registry fallback.  
4. Keep Chanakya gap PATCH to Registry (already correct) — remount now restores city.

---

## 5. Business certification

✓ Chanakya consumes canonical Opportunity `cityLabel`  
✓ Existing City auto-populates — no repeat prompt when present  
✓ User-selected City persists to Registry and survives remount  
✓ Recommendations remain stable when City is on Opportunity  

**Validation flow**

Property / Lead City = Mumbai → Opportunity Saved → Open Chanakya → City available → Recommendations → UI refresh → City + recommendations remain.

# CO-BUG-005 — Lender Registry Lookup Integration (Banker Institution)

**Status:** Root cause confirmed · Fix implemented · Ready for BAT  
**Date:** 2026-07-31  

---

## 1. Root Cause

The Banker role **Institution (Lender)** field used `EcmMasterSelect` with `masterDomain: "lender"`.

That path does **not** call the live Enterprise Lender Registry picker used by Identify Lender.

| Path | Source |
|---|---|
| Identify Lender / Admin | `lenderRegistryClient` → `/api/lender-registry/lenders` (UUID) |
| Banker Institution (before) | `listEcmMasterOptions("lender")` → Tier-2 in-memory cache **or** legacy ECM catalog (`hdfc`, `sbi`, …) |

When `TIER2_REGISTRY_PORT_RUNTIME` is enabled:

1. Tier-2 returns **only** the in-memory cache.
2. Contact Workspace **did not hydrate** that cache on open.
3. `listFromTier2Port` returned an **empty array** (truthy), so catalog fallback never ran.
4. Institution dropdown appeared empty even though Enterprise Lender Registry had rows.

Secondary defect: Tier-2 cache mapped lenders with `id: record.code` instead of Registry **UUID**, which would break Banker ↔ Lender links expected by CO-LR-013.

**Enterprise Lender Registry itself is populated — this was an integration bug, not incomplete master data.**

---

## Answers to investigation questions

1. **Was Institution querying ELR?** No — ECM master / Tier-2 port.  
2. **Incorrect active filter?** Partially — empty cache looked like “no lenders”; live ELR filter is fine.  
3. **API returning lenders?** Yes (`/api/lender-registry/lenders`) for Admin / Identify Lender.  
4. **UI bound to correct endpoint?** No for Banker; yes for Identify Lender.  
5. **Permissions?** No evidence of permission block on GET lenders (same auth as other registry UIs).  
6. **Snapshot vs live?** Tier-2 in-memory snapshot / legacy catalog — not live ELR select.

---

## 2. Files Modified

| Path | Change |
|---|---|
| `banker-lender-registry-fields.tsx` | Institution / City / Branch bound to ELR |
| `contact-workspace-modal.tsx` | Wire Banker fields + hydrate Tier-2 on open |
| `role-templates.ts` | City parented by Institution; help text |
| `cache-store.ts` | Lender option id = Registry UUID |
| `masters.ts` | Empty Tier-2 lender list → catalog fallback |
| `scripts/co-bug-005-verify.mjs` | Static gates |
| This report | Investigation + fix |

---

## 3. Registry Integration Review

- **Institution:** `EnterpriseLenderRegistrySelect` → active lenders from ELR (UUID stored on `roleProfiles.lender_employee.institution`).
- **City:** Lender `coverageCities` when present; else City Master.
- **Branch:** Lender `branchCoverage` when present; else legacy branch catalog if parent matches; else guidance message.
- **Designation:** Unchanged — Enterprise Designation Master via `EcmMasterSelect`.
- **No** new registries · **No** lender duplicates · **No** ID renames of existing lenders.

---

## 4. Validation Results

`npm run verify:co-bug-005` — PASS  

---

## 5. Screenshots

Manual BAT:

1. Contacts → Create / open Banker role  
2. Institution dropdown lists active ELR lenders  
3. Select Institution → City options load  
4. Select City → Branch options load (when coverage exists)  
5. Save → `institution` = lender UUID · Sales Contact / CO-LR-013 still resolves  

---

## Business Acceptance Checklist

- [ ] Institution dropdown populated from Enterprise Lender Registry  
- [ ] City filtering works after Institution  
- [ ] Branch filtering works after Institution  
- [ ] Designation lookup works  
- [ ] Selected lender UUID saved on Banker profile  
- [ ] Contact linked to ELR (no duplicate lender created)  

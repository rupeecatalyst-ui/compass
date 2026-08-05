# CO-WP-JOURNEY-001 — New Opportunity Journey Continuity

**Status:** Product Owner Review Mode · Ready for BAT  
**Date:** 2026-08-02  
**Deploy:** None  

---

## Scope reviewed

1. Business Home  
2. Customer Search / Create Customer  
3. Product Selection  
4. Opportunity Details  
5. Document Upload  
6. Activities  
7. Save Draft  
8. Submit  
9. Loan File  
10. Timeline  

---

## Gaps closed (continuity only — no redesign)

| Gap | Fix |
|-----|-----|
| Product merged into details | Distinct **Product** step before Details |
| Only one create action | **Save Draft** and **Submit** both continue to Documents |
| Post-create landed on Overview without next step | Lands on **Documents**; Continue/Back footers between sections |
| Documents list-only | Placeholder **Document upload** (Partner DTO; not Document Center SSOT) |
| Timeline missing | **Timeline** tab + events; rail includes Timeline |
| Journey felt fragmented | Shared **OpportunityJourneyRail** across Business → create → workspace |

---

## Connected path (BAT)

```text
Business Home
  → New Opportunity
  → Customer (search / create)
  → Product
  → Details → Save Draft | Submit
  → Documents (upload)
  → Activities
  → Loan File
  → Timeline
  → Business Home
```

---

## Out of scope (unchanged)

- No EEE / Experience Center  
- No Opportunity Registry SSOT write (placeholder Partner DTOs)  
- No visual redesign / polish pass  
- No deployment  

---

## Validation

- Wealth Partner `npm run build` — run after this pass  
- Await Product Owner BAT  

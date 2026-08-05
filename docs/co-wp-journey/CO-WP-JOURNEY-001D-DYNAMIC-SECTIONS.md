# CO-WP-JOURNEY-001D — Enterprise Dynamic Sections

**Status:** Architecture refinement complete · Await Product Owner BAT  
**Date:** 2026-08-02  
**Deploy:** **None**

Not a redesign. Opportunity Journey path unchanged.

---

## Objective

Opportunity Details render **Enterprise-defined Sections** from Catalyst One.

Companion renders. Catalyst One decides section name, order, visibility, mandatory flags, and fields.

---

## Delivered

### Catalyst One

- `detailSections[]` on Partner journey config DTO  
- Sections: Borrower · Employment · Business · Financial · Property · Loan Requirement · Additional Information  
- Visibility metadata: borrower kind · product family · field-level product family  
- `resolveVisibleDetailSections()` applies only rules encoded on the DTO  
- Legacy flat field projections retained (deprecated) for 001C compatibility  

### Wealth Partner (0.5.5)

- `JourneySectionStack` — collapsible premium section cards  
- Per-section completion (`N of M` · `%` · Complete)  
- Jump chips · Previous · Next section · Continue (next incomplete)  
- Default: first incomplete expanded · completed collapsed  
- No companion section SSOT — config API only  

---

## Architecture

| Owner | Responsibility |
|-------|----------------|
| Catalyst One | Section definitions · field metadata · validation flags · display / conditional rules |
| Wealth Partner | Rendering · animation · UX navigation |

---

## Non-negotiable held

- No journey redesign / no new modules  
- No companion business logic / no hardcoded section catalogue in WP  
- **No deployment**  

Await Product Owner BAT.

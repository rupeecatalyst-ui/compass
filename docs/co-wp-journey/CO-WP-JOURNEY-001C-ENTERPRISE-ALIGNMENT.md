# CO-WP-JOURNEY-001C — Enterprise Opportunity Journey Alignment

**Status:** Architecture alignment complete · Await Product Owner BAT  
**Date:** 2026-08-02  
**Deploy:** **None** (explicit PO instruction)

---

## Objective

Align Wealth Partner Opportunity Journey with Catalyst One Opportunity Workspace architecture.

Companion app remains presentation-only. No parallel masters, rules, or workflow.

---

## Delivered

### Catalyst One (Partner Gateway)

1. **`GET /api/partner/opportunity-journey/config`** — Enterprise journey configuration DTO  
   - Borrower types (`individual` | `company`) — terminology from `opportunity-primary-borrower`  
   - Products from Product Master / Lead Information options  
   - Option sets: Employment Type · Constitution · Industry · Lending Type · Transaction Type (ECM / Lead Information)  
   - Individual / Company / Requirement / Product-family field metadata  
   - Submission pipeline + Enterprise Event names (documentation + timeline projection)

2. **Create / Submit DTOs** — `primaryBorrowerKind`, `productCode`, `borrowerFields`  
3. **Submit path** — records named Enterprise Events on timeline (placeholder until Opportunity Registry cutover)  
4. Types: `src/types/enterprise-partner-opportunity-journey.ts`

### Wealth Partner App (0.5.4)

1. **Mandatory Borrower Type** after Customer (premium cards · Individual / Company)  
2. Journey order: Customer → Borrower Type → Product → Opportunity Details → …  
3. Dynamic Individual vs Company fields from Enterprise config  
4. Product cards + select options from config API (hardcoded product catalog removed)  
5. Config-driven field renderer (`JourneyConfigFields`)  
6. No business processing in companion — Partner API only  

---

## Submission architecture (target)

```
Wealth Partner App
 → Partner API
 → Catalyst One
 → Opportunity Registry
 → Workflow Engine
 → Notification Engine
 → Activity Engine
 → Executive Dashboard
 → Assigned Employee
```

**Today:** Partner Business placeholder store + Enterprise Event *names* on timeline.  
**Not yet:** live Opportunity Registry persistence (explicit future cutover; no dual SSOT invent).

---

## Non-negotiable held

- No journey redesign / no new modules  
- No companion master data SSOT  
- No EEE / Experience Center  
- **No deployment**  
- Await Product Owner BAT  

---

## Manual / next

- Registry cutover behind Partner Gateway when Product Owner authorises  
- Expand option sets (City · State · Document Categories · Activity Types) from Enterprise admin config  
- Admin-authored field metadata without WP release  

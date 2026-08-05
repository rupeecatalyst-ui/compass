# CO-WP-DEVELOPMENT-WAVE-001 — Progress

**Date:** 2026-08-02  
**Deploy:** Not authorised (await Product Owner module review)  
**EEE / Experience Center:** Not started (forbidden in this wave)

---

## Delivered in this pass

### Governance
- Wave instruction recorded: `docs/co-wp-development-wave/CO-WP-DEVELOPMENT-WAVE-001.md`
- Cursor rule: `.cursor/rules/co-wp-development-wave-001.mdc`
- MODE-003 status updated (Business authorised for WAVE-001)

### Home
- Confirmed complete as companion Experience Home (prior CO-WP-103.21)
- Version stamp → `0.5.0` / `CO-WP-DEVELOPMENT-WAVE-001`
- Deep links `/app/business` and `/app/opportunities*` remain valid

### Business (Opportunity journey)
**Wealth Partner App**
- Hub: list · empty · loading · error · placeholder banner
- Create Opportunity: customer search / create-new → product + amount → submit
- Opportunity detail tabs: Overview · Documents · Activities · Loan File
- Routes wired under `/app/business` and `/app/opportunities/*`

**Catalyst One Partner Gateway (placeholder DTOs)**
- `GET /api/partner/business`
- `GET|POST /api/partner/opportunities`
- `GET /api/partner/opportunities/:id` (+ documents · activities · loan-file)
- `GET /api/partner/customers/search`
- Service: `partner-business.service.ts` — `dtoSource: placeholder_partner_business`  
  **Not** Opportunity Registry SSOT writes

### Saarthi / Private / More
- Functional module hub shells with navigation (deepen next)

---

## Validation
- Wealth Partner `npm run build` — passed  
- **No Vercel deploy**

---

## Remaining in WAVE-001
- Deepen Saarthi · Private · More journeys beyond hubs  
- Replace placeholder Partner Business DTOs with Opportunity Registry projection when PO authorises Enterprise API cutover  
- Product Owner review of completed modules before deploy

# E2E Business Scenario Pack — Document Workspace Contact-Centric (013)

### Scenario ID
CO-C1-DOCUMENT-WORKSPACE-CONTACT-CENTRIC-013-E2E-001

### Business path
Authorised Opportunity / Deal list → contact-centric card → Open Contact (360) **or** View Documents (locked desk) → registry operations on that transaction only → observable registry outcome

### Preconditions
- Catalyst One employee session
- Enterprise Document Registry + Opportunity / Deal registries available
- Canonical Contact or Company ID on the Opportunity
- Hostinger production deploy of this SHA (not true at last local close)

### Steps
1. Open Document Workspace with no `opportunityId` / `dealId` (opener grid).
2. Confirm the largest card text is the Contact name, or Company name when `companyId` is present.
3. Confirm nested lender Deals stay under one Opportunity card.
4. **Open Contact** opens Contact 360 / Company 360 using canonical IDs only (no name / email / mobile resolution).
5. Return to Document Workspace. **View Documents** on the Opportunity opens the right-side locked desk (≥ 50vw on desktop).
6. Confirm header shows party, Opportunity, product, stage, assigned RC, readiness.
7. Add a document to an acceptable type; confirm it appears on the locked Opportunity only.
8. Replace with a reason; confirm a new version on the same registry record.
9. Queue Email Document to Outbox; confirm nothing is sent.
10. Change Transaction to a nested Deal; confirm Deal-scoped docs do not leak across Deals.
11. Refresh the URL; the same Opportunity / Deal remains locked.

### Expected business outcomes
- One Enterprise Document Registry SSOT
- No second document store
- No Prisma migration
- No stage / assignment / communication mutation from opening a card
- No live email send
- Category readiness does not treat two files in one category as two complete categories

### Related domains (re-run triggers)
- Document Registry association / reclassify / replace / delete
- Opportunity / Deal list filters and identity keys
- Contact 360 / Company 360 query params
- Document Workspace context lock / deep links
- Document request LOD / custom requirements / folder packages
- Outbox queue behaviour

### Last run
2026-09-08 · Local worktree only (layout fixture + verify scripts) · Live Hostinger **not run** · Result: engineering PASS / live E2E **blocked** by Product Programme authenticated smoke hold

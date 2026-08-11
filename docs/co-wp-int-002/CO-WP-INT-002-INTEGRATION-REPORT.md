# CO-WP-INT-002 — Wealth Partner Customer, Document & Activity Integration

**Status:** DEVELOPMENT COMPLETE · Ready for BAT  
**Deploy:** **NOT performed**  
**Date:** 2026-08-10

---

## Objective

Complete operational integration of Customers, Documents, and Activity/Notepad between Wealth Partner App and Catalyst One. Catalyst One remains the SSOT.

---

## Constitutional Health Check

| Principle | Result |
|-----------|--------|
| No second Customer Registry | GREEN — ECM + owned Opportunity `primaryContactId` |
| Cross-partner customer 403 | GREEN — `requireOwnedCustomer` |
| Document Center / ETD SSOT | GREEN — `EnterpriseTransactionDocument` via Gateway |
| No parallel partner doc store for uploads | GREEN — placeholder no longer authorizes uploads |
| Activity = Business Notes | GREEN — write + hydrate; partner-visible filter |
| `activity_add` without `edit` | GREEN — unchanged ACCESS contract |
| Entitlements | GREEN — unchanged |

**CHC: GREEN**

---

## Delivered

### 1. Customers

- **List / search** — distinct ECM contacts from Opportunities with `sourceWealthPartnerId = partner`
- **Detail** — `requireOwnedCustomer` → 403 cross-partner; workspace projects owned Opportunities
- **Create** — via Opportunity create (ECM provisional contact); preferred `customerId` must already be partner-owned
- **Association** — Opportunity `primaryContactId` is canonical; fabricated `cust-reg-*` / `ecm-*` ids removed

### 2. Documents

- **Upload / replace / list / delete** — `EnterpriseTransactionDocument` (`uploadSource: wealth_partner`)
- LOD status derived from durable rows
- Ownership: Opportunity `sourceWealthPartnerId` before any document action
- Entitlements: `document_upload` / `document_edit` / `view`
- Forged Opportunity / Document IDs cannot reach another partner’s rows

### 3. Activity / Notepad

- Write → Enterprise Business Notes (+ EAR), with `contactId` from primary borrower
- Opportunity **read** hydrates from Business Notes (not placeholder-only)
- Partner-safe filter hides `internal_*` / management categories
- Deal activity same filter + `contactId`
- Customer Notes / Documents panels wired to workspace projections

---

## Verification

```bash
# Catalyst One
npm run verify:co-wp-int-002
npx tsc --noEmit

# Wealth Partner App
npm run verify:co-wp-int-002
npm run lint
npm run build
```

BAT checklist:

- [ ] Customer create via New Opportunity → appears in directory after reload
- [ ] Customer detail for own customer · 403 for other partner’s customer id
- [ ] Document upload on owned Opportunity → visible in C1 Document Registry / reload
- [ ] Unauthorized document id / foreign opportunity → 403
- [ ] Notepad with Referral (no edit) → persists · reload shows note
- [ ] Cross-partner activity/document access → 403

---

## Manual / ops

- Requires `ENTERPRISE_PERSISTENCE_MODE=prisma`
- Document binary capped (~4 MB durable content; API still accepts ≤8 MB metadata path)
- **Do not deploy** until Product Owner authorizes

---

## Final status

🟡 **Development complete · Not deployed · Ready for BAT**

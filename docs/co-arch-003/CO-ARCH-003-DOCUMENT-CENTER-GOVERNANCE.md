# CO-ARCH-003 — Opportunity Document Center Governance (FROZEN)

**Status:** ENTERPRISE FROZEN (pending Business Acceptance Testing confirmation)  
**Date:** 2026-07-24  
**Program:** Catalyst One constitutional architecture  

---

## Constitutional decision

The **Opportunity Document Center** is the **only** document authoring workspace in Catalyst One.

All business documents originate here.

No other module may maintain its own independent document repository.

---

## Dual SSOT model

Catalyst One now has two constitutional Single Sources of Truth:

| # | SSOT | Owns |
|---|------|------|
| 1 | **Opportunity Registry** | All Opportunity business entities |
| 2 | **Opportunity Document Center** | All business documents |

No downstream module shall duplicate either business entities or documents.

Consumers (examples): Credit Bench · LIFE · Deal Workspace · Lender Packaging · Accounting · Reports — all reference the same Document Center repository.

---

## Document ownership model

Every document belongs to **exactly one** of the following scopes.

### 1. Applicant Documents

Belong to a specific participant.

Examples: PAN · Aadhaar · Passport · Driving Licence · Salary Slips · Bank Statements · ITR · GST · Financial Statements · Photograph · Signature · KYC · Income Proof

When an Opportunity has multiple participants (Primary Applicant, Co-Applicant(s), Guarantor(s)), Document Center displays a **Participant Selector** at the top.

Selecting a participant displays only documents belonging to that participant.

**Registry stamp:** `links.participantId` + `links.documentScope: "applicant"`

### 2. Shared Opportunity Documents

Belong to the Opportunity itself (exist once).

Examples: Property Papers · Sale Agreement · Builder Documents · Legal Report · Valuation Report · NOC · Society Documents · Approved Plans · Chain Documents · Collateral Documents

**Registry stamp:** `links.documentScope: "shared"` (no `participantId`)

EDIE module mapping (implementation):

- Shared → `property`, `existing_loan`
- Applicant → `customer_kyc`, `address_proof`, `business_constitution`, `financial`, `banking`

---

## Document Center capabilities

The Document Center is the only place where documents may be:

- Uploaded
- Replaced
- Deleted
- Renamed
- Tagged
- Categorized
- Versioned

---

## Deal Workspace Documents tab

The Deal Workspace **Documents** tab is **not** another repository.

It is a **read-only projection** of the Opportunity Document Center.

| Allowed | Not allowed |
|---------|-------------|
| View | Upload |
| Preview | Replace |
| Download | Delete |
| Print | Rename |
| Search | Edit metadata |
| Filter | |

### Editing workflow

If a user attempts to modify documents inside Deal Workspace (or Action Center upload):

> Documents can only be edited from the Opportunity Document Center.

Provide **Go to Document Center**, navigating:

Opportunity → Document Center  

while preserving active Opportunity Context (`opportunityId` / journey context).

---

## Implementation SSOT

| Concern | Path |
|---------|------|
| Scope constants / helpers | `src/constants/opportunity-document-center.ts` |
| Registry links | `DocumentEntityLinks.participantId`, `documentScope` |
| Participant selector | `DocumentCenterParticipantSelector` |
| Document Center workspace | `document-center-workspace.tsx` |
| Deal read-only projection | `deal-documents-projection.tsx` |
| Action Center redirect | `documents-context-workspace.tsx` |
| Cursor rule | `.cursor/rules/opportunity-document-center-governance.mdc` |

---

## Architectural principles (frozen)

1. Guide authoring to one place — Document Center.  
2. Project, never duplicate — Deal and other modules read the same store.  
3. Preserve Opportunity Context on every hop to Document Center.  
4. Scope every document to Applicant (participant) or Shared (Opportunity).  

---

## BAT checklist

- [ ] Upload Applicant doc under Primary — appears only for Primary  
- [ ] Upload Shared property doc — appears under Shared Opportunity Documents  
- [ ] Deal Documents tab: preview/download only; no upload controls  
- [ ] Attempt edit from Deal / Action Center → message + Go to Document Center  
- [ ] Go to Document Center preserves Opportunity context  
- [ ] Credit Bench / LIFE do not introduce a parallel document store  

After successful BAT, mark this document **ENTERPRISE CERTIFIED** and keep the Cursor rule permanently applied.

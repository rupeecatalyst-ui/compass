---
id: contacts.contact-360
title: Contacts and Contact 360°
summary: How to find contacts, open Contact 360° relationship intelligence, and continue the loan journey without blocking on incomplete data.
categoryId: contacts
status: available
audience: admin
updated: 2026-08-13
tags: contacts, ecm, contact-360, relationships
related: getting-started.overview, opportunities.overview, communication.send-email
---

# Contacts and Contact 360°

**Enterprise Contact Master (ECM)** is the source of truth for people and parties. Contacts is a registry workspace — scan and select, then open a workspace for relationship intelligence.

## How to find a contact

1. Open **Contacts** from the primary navigation.
2. Search by name, mobile, email, or other registry fields supported in the search control.
3. Select a row to open the Contact workspace (Contact 360°).

## Contact 360° overview

Contact 360° is the **relationship-intelligence** primary surface for a contact. Typical Overview content includes:

- Identity and company association (when linked)
- Snapshot KPIs derived from enterprise projections (opportunities, deals, tasks, documents, communication where available)
- Compact relationship cards
- Recent activity from the Enterprise Activity Registry timeline
- Role Dashboard details available in a collapsed section (progressive disclosure)

## Progressive contact creation

Never stop a business process because a supporting contact is incomplete.

| Participant | Minimum at create |
| --- | --- |
| Primary Applicant | Full Name + Mobile |
| Co-Applicant / Guarantor / Other | Full Name only |

Other fields (email, PAN, address, occupation) are optional at create and must not block the Loan Journey. Chanakya may advise on gaps; only Policy Engine may hard-block.

### How to create during a journey

1. Search existing Contact.
2. If found → select, link, continue.
3. If not found → **Create New Contact** under search.
4. Save & Continue → create, auto-link, return to the transaction.

## FAQs

**Is Contact 360° a separate database?**  
No. It composes ECM Contact data with Opportunity, Deal, Task, Document, Communication, and Activity projections. Do not invent a parallel contact store.

**Where do I edit documents for a customer?**  
Authoring belongs in the **Opportunity Document Center**, scoped to the opportunity (and participant when applicable).

## Warnings

> Do not treat Contact Workspace as a dashboard of permanently expanded CRM widgets. Prefer compact intelligence and drill-downs.

## Related articles

- [Opportunities](/admin/user-manual/opportunities/overview)
- [Communication / Send Email](/admin/user-manual/communication/send-email)

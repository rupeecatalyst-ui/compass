---
id: communication.send-email
title: Communication and Send Email
summary: Operational email configuration, follow-up send, and how this differs from Marketing Command Center.
categoryId: communication
status: available
audience: admin
updated: 2026-08-13
tags: email, ecc, communication, follow-up
related: contacts.contact-360, marketing.overview, administration.console
---

# Communication and Send Email

Operational communication (relationship email, follow-ups, Communication Profiles) is **not** the Marketing Command Center acquisition engine.

## Where to configure email

Administrators typically use:

- **Organization → Communication / Email Configuration** — operational sender and related org communication settings
- **Administration → Enterprise Communication Center** — Communication Profiles, sender identities, SMTP, event → profile mapping

Exact labels appear on the Administration Console and Organization context navigation.

## How to send an operational follow-up email

1. Open the relevant business workspace (Contact, Opportunity, Deal, or Action Center entry).
2. Choose the Send Email / follow-up action provided for that context.
3. Confirm recipient, template (if any), and content.
4. Send through the enterprise outbox path for that feature.

Templates should remain relationship-aware (recipient, product, stage, context) where the feature supports filtering.

## Marketing vs operational email

| Concern | Operational Communication | Marketing Command Center |
| --- | --- | --- |
| Purpose | CRM / journey communication | Bounded acquisition campaigns |
| Entry | Org Communication / ECC / workspace actions | `/admin/marketing` |
| Live bulk campaign send | N/A | **Currently gated off** (fixture / dry-run) |

## FAQs

**Why can’t I find Marketing under Organization Communication?**  
Marketing is an Administration Enterprise Configuration module (Marketing Command Center), documented under the Marketing section of this manual.

## Related articles

- [Marketing Command Center overview](/admin/user-manual/marketing/overview)
- [Contacts / Contact 360°](/admin/user-manual/contacts/contact-360)

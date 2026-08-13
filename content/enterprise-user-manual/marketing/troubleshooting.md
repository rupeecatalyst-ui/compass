---
id: marketing.troubleshooting
title: Marketing troubleshooting
summary: Common Marketing Command Center issues, fixture vs live confusion, and safe recovery steps.
categoryId: marketing
status: fixture
audience: admin
updated: 2026-08-13
tags: marketing, troubleshooting, faq
related: marketing.overview, marketing.execution-safety, marketing.data-sources-audiences
---

# Marketing troubleshooting

## FAQs

**I cannot find Marketing in the left navigation.**  
Correct. Marketing is under Administration Console (Enterprise Configuration → Marketing Command Center), not primary nav.

**Campaigns do not send to real inboxes.**  
Expected while `ENTERPRISE_MARKETING_EXECUTION_ENABLED` is false. Use dry-run records only.

**100k audience disappeared after deploy.**  
Fixture / in-memory certification data is not a durable CRM audience. Re-run fixture generation for tests.

**Handoff did not create Contacts / Opportunities.**  
Confirm handoff mode. Default is **fixture**. Live mode requires PO approval.

**Is this the same as Organization Email Configuration?**  
No. Operational Send Email / ECC is separate. See Communication articles.

## Warnings

> Do not “fix” dry-run by enabling live execution flags without Product Owner authorisation.

> Do not import 100k marketing rows into Supabase to make the UI look populated.

## Related articles

- [Marketing overview](/admin/user-manual/marketing/overview)
- [Execution and production safety](/admin/user-manual/marketing/execution-safety)
- [Communication / Send Email](/admin/user-manual/communication/send-email)

---
id: marketing.engagement-qualification-handoff
title: Marketing engagement, qualification, and Opportunity handoff
summary: Engagement events, analytics, qualification queue, Catalyst One Opportunity handoff, assignment, and notifications.
categoryId: marketing
status: fixture
audience: admin
updated: 2026-08-13
tags: marketing, engagement, qualification, handoff, notifications
related: marketing.overview, marketing.execution-safety, opportunities.overview
---

# Marketing engagement, qualification, and Opportunity handoff

**Status:** Engagement / analytics / qualification paths are implementable in **fixture** mode. Live ECM + Opportunity writes require `ENTERPRISE_MARKETING_HANDOFF_MODE=live` **and** Product Owner approval.

## Engagement

Open **Engagement** to review events recorded for dry-run or fixture campaigns (opens, clicks, replies — as implemented by adapters). Live ESP webhooks are not assumed while providers are disconnected.

## Analytics

**Analytics** surfaces funnel and campaign metrics. When live delivery is unavailable, metrics must remain honest (for example Unavailable / dry-run labels) — never fabricate production performance.

## Qualification

Use the qualification queue to mark or review prospects that meet handoff criteria defined by the engine. Qualification does not by itself create production Opportunities while handoff mode is fixture.

## Catalyst One Opportunity handoff

1. Review qualified rows.
2. Trigger handoff according to Command Center controls.
3. In **fixture** mode, identity and opportunity adapters record fixture outcomes without writing production CRM.
4. In **live** mode (PO only), handoff uses live identity / Opportunity adapters into ECM + Opportunity Registry.

## Assignment and notifications

Assignment policies and marketing notification attempts follow EME notification services. Operational ENCE/ECC communication remains a separate path — see Communication articles.

## Related articles

- [Opportunities](/admin/user-manual/opportunities/overview)
- [Execution and production safety](/admin/user-manual/marketing/execution-safety)
- [Troubleshooting](/admin/user-manual/marketing/troubleshooting)

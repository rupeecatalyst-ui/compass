---
id: marketing.overview
title: Marketing Command Center overview
summary: Enterprise Marketing Engine (EME) — full Command Center workflow in MARKETING TEST MODE; live bulk send separately gated.
categoryId: marketing
status: fixture
audience: admin
updated: 2026-08-13
tags: marketing, eme, command-center, activation
related: marketing.data-sources-audiences, marketing.campaigns-content-assets, marketing.execution-safety, communication.send-email
---

# Marketing Command Center overview

**Status:** MARKETING TEST MODE — Create → Configure → Design → Preview → Schedule → Publish → Controlled test execution → Engagement → Qualify → Handoff is operable. Live unrestricted bulk email/WhatsApp remain **OFF** until a separate Product Owner gate.

Marketing documentation is a **section of the central Administration User Manual** — not a Marketing-owned knowledge system.

## Purpose

The Marketing Command Center (`/admin/marketing`) is the operator UI for the **Enterprise Marketing Engine (EME)** — a bounded acquisition OS isolated from Partner Marketing, public website marketing, and operational Send Email.

## How to open Marketing

1. Sign in as Admin / Super Admin.
2. Administration → Administration Console → **Enterprise Configuration** → **Marketing Command Center**.
3. Or go to `/admin/marketing`.

## End-to-end test campaign path

1. **Data Sources** — select Google Sheet + worksheet (or fixture mode).
2. **Audiences** — bind audience to sheet/tab; preview counts (streamed — no 100k mirror).
3. **Campaigns** — create campaign; set audience, channel, sender, subject, content, CTA.
4. Configure **schedule + batch pacing** (default 100 / 2.5h; override allowed).
5. **Preview** — render only; Back to edit / then Approve → Schedule → Run.
6. **Controlled test** — run 5 / 10 / 20 recipient SIMULATED batch.
7. **Engagement / Analytics** — review dry-run events (Unavailable when provider cannot supply).
8. **Responses** — ingest / qualify → hand off to Catalyst One Opportunity (fixture by default).
9. **Assignment + notification** — routing policy + ENE in-app (email/WA dry-run).

## Channel honesty

| Channel | Typical test status |
| --- | --- |
| Email | dry_run · NOT CONNECTED for live |
| WhatsApp | dry_run · NOT CONNECTED for live |

Never treat SIMULATED as ACTUALLY SENT.

## Related articles

- [Data sources and audiences](/admin/user-manual/marketing/data-sources-audiences)
- [Campaigns, content, and assets](/admin/user-manual/marketing/campaigns-content-assets)
- [Execution and production safety](/admin/user-manual/marketing/execution-safety)
- [Engagement, qualification, and handoff](/admin/user-manual/marketing/engagement-qualification-handoff)
- [Troubleshooting](/admin/user-manual/marketing/troubleshooting)

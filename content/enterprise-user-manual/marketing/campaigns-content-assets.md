---
id: marketing.campaigns-content-assets
title: Marketing campaigns, content, and assets
summary: Campaign creation, Design Studio, assets, preview, schedule, batch pacing, publish, and controlled test.
categoryId: marketing
status: fixture
audience: admin
updated: 2026-08-13
tags: marketing, campaigns, content, assets, preview, pacing
related: marketing.overview, marketing.data-sources-audiences, marketing.execution-safety
---

# Marketing campaigns, content, and assets

## Before publish checklist

1. Audience bound to Sheet + worksheet
2. Channel selected (Email / WhatsApp)
3. Sender identity configured (Settings)
4. Subject + preview text + content blocks
5. Personalization uses only approved tokens (no `{{evil()}}`)
6. Preview reviewed
7. Pre-publish checks PASS
8. Batch / pacing saved (lease configured)

## Campaign creation fields

Name · Description · Objective · Audience · Channel · Sender · Subject · Preview text · Content · Images/Assets · CTA · Links · Personalization · Schedule · Batch size · Pacing · Qualification/Assignment/Notification placeholders (detailed policies on Responses).

## Content / Design Studio

Use content blocks, Marketing Asset Library (not Document Registry), CTA, hyperlinks, and approved personalization tokens. Preview before Approve.

## Preview

Shows sender, sample recipient personalization, subject, preview text, rendered HTML, CTA, audience, channel, batch policy, and schedule intent. Preview does **not** publish.

## Schedule · Publish · Controlled test

1. Save pacing / lease
2. Submit → Approve → Schedule → Run
3. Run **Controlled test (5/10/20) — SIMULATED**
4. Pause / Resume preserve pacing cursor and leases

## Before live campaign checklist

- Product Owner authorises live execution flag separately
- Provider connect authorised
- SPF/DKIM/DMARC verified (Deliverability panel must not claim certification early)
- Handoff mode reviewed (`fixture` vs `live`)

## Related articles

- [Execution and production safety](/admin/user-manual/marketing/execution-safety)
- [Marketing overview](/admin/user-manual/marketing/overview)

---
id: marketing.data-sources-audiences
title: Marketing data sources and audiences
summary: Google Sheets and fixture data sources, audience definition, and preview behaviour.
categoryId: marketing
status: fixture
audience: admin
updated: 2026-08-13
tags: marketing, sheets, audiences, fixtures
related: marketing.overview, marketing.campaigns-content-assets, marketing.execution-safety
---

# Marketing data sources and audiences

**Status:** Currently available in **test / fixture mode** for large synthetic audiences. Live Google Sheets mode requires Product Owner approval and service account configuration.

## Data sources

EME supports pluggable data-source adapters, including:

- **Fixture** adapters for certification and dry-run scale tests
- **Google Sheets** adapter paths when Sheets mode is explicitly enabled

Sheets mode defaults should remain `off` or `fixture` unless PO authorises `live`.

## How to review data sources

1. Open Marketing Command Center.
2. Open **Data sources**.
3. Confirm the active mode (fixture vs configured Sheets).
4. Do not switch to live Sheets without PO + credentials.

## Audience creation

1. Open **Audiences**.
2. Define or select an audience bound to an authorised data source.
3. Use **Preview** / paging controls — large fixture audiences may be generated streams (not persisted CRM rows).

### Scale note

Synthetic 1k / 10k / 100k fixture datasets are generated for verification. A 100,000 audience test must **not** write production records to Supabase.

## Warnings

> Do not invent a parallel MarketingProspect production table without architecture approval. Audience rows for scale tests belong in fixture adapters.

## Related articles

- [Marketing overview](/admin/user-manual/marketing/overview)
- [Campaigns, content, and assets](/admin/user-manual/marketing/campaigns-content-assets)

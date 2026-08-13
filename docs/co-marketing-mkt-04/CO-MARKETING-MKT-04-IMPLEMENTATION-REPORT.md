# CO-MARKETING-MKT-04 — Implementation Report

**Sprint:** CO-MARKETING-MKT-04  
**Title:** Campaign Builder — Content + Asset Foundation  
**Status:** Implementation complete — ready for BAT  
**Authority:** CO-MARKETING-ARCH-001 · MKT-01–MKT-03 approved  
**Date:** 2026-08-12

---

## 1. Objective

Deliver a reusable **Campaign Builder** foundation: block-document content authoring, email-safe preview, Marketing Asset Library (not Document Registry), templates/clone, content versioning, and personalization token prep — **without** real email / WhatsApp / digital send or test send.

---

## 2. What shipped

### 2.1 Campaign model (authoring)

Supported fields:

| Area | Fields |
|------|--------|
| Identity | name, objective, product, audience link, channel |
| Sender | fromName, fromAddress, replyTo |
| Content | subject, preview text, block document, CTA, disclaimer, tracking flag |
| Placeholders | schedule, routing, notification (notes only — not executable) |

Lifecycle: **SAVE ≠ SEND**. Approve freezes the current content version.

### 2.2 Content Builder (block document)

Extensible block types (`MARKETING_CONTENT_BLOCK_TYPES`):

header · logo · hero_image · text · image · image_text · product_card · offer_card · cta · divider · footer · disclaimer

Unknown future types are skipped safely by the renderer.

### 2.3 Email-safe rendering

`email-render.ts` produces table + inline CSS HTML for **desktop** (600px) and **mobile** (360px), plus plaintext. Designed for common email-client reliability — not a WYSIWYG that emits fragile absolute CSS.

### 2.4 Personalization (safe)

Allowlisted tokens only (`{{firstName}}`, `{{city}}`, `{{profession}}`, …).  
Unknown tokens are **rejected** — no arbitrary code / expression evaluation.

### 2.5 Marketing Asset Library

Separate from Document Registry:

- upload (HTTPS or data URL foundation)
- preview
- metadata · tags · categories
- archive
- permission scope `ORG_MARKETING`
- size cap for in-memory foundation

### 2.6 Templates & reuse

- Save campaign as template
- Create campaign from template
- Clone campaign
- Reusable content blocks (API + Content registry list)

### 2.7 Versioning

- Draft versions mutable until frozen
- **APPROVED** → version immutable (`frozenReason: APPROVED`)
- Further edits mint a **new** draft version
- Historical frozen subject/content is not silently overwritten

### 2.8 Preview

Desktop · mobile · personalization sample · subject · sender  
**Test Send** UI control present but **disabled**.

### 2.9 Safety (unchanged gates)

```
ENTERPRISE_MARKETING_EXECUTION_ENABLED = false
ENTERPRISE_MARKETING_HANDOFF_ENABLED = false
ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED = false
ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false
```

No real email / WhatsApp / digital publishing in this sprint.

---

## 3. Architecture

| Layer | Path |
|-------|------|
| Constants | `src/constants/enterprise-marketing-engine/content.ts` |
| Types | `src/types/enterprise-marketing-campaign.ts` |
| Personalization | `src/lib/enterprise-marketing-engine/personalization.ts` |
| Blocks | `src/lib/enterprise-marketing-engine/content-blocks.ts` |
| Email render | `src/lib/enterprise-marketing-engine/email-render.ts` |
| Campaign store/service | `server/services/enterprise-marketing-engine/campaign-store.ts` · `campaign.service.ts` |
| Asset store/service | `asset-store.ts` · `asset.service.ts` |
| Templates | `template-store.ts` |
| APIs | `/api/admin/marketing/campaigns` · `/api/admin/marketing/assets` |
| UI | Campaigns · Content · Assets panels under `/admin/marketing/*` |

Persistence for MKT-04 is **in-memory foundation** (org-scoped maps), consistent with MKT-02/03 binding/audience stores — no Prisma MarketingCampaign / Prospect mirror.

---

## 4. UI surfaces

| Route | Capability |
|-------|------------|
| `/admin/marketing/campaigns` | Registry + Campaign Builder + preview |
| `/admin/marketing/content` | Templates + reusable blocks list |
| `/admin/marketing/assets` | Marketing Asset Library |

Nav sections for campaigns / content / assets marked `foundationOnly: false`.

---

## 5. Explicitly out of scope (STOP)

- Test send / ESP connect
- WhatsApp / digital launch
- Schedule execution
- Routing / notification engines
- Prisma durability for campaigns/assets
- Operational Document Registry for marketing creatives
- MKT-05+

---

## 6. Verification

| Check | Result |
|-------|--------|
| `node --import tsx scripts/co-marketing-mkt-04-verify.mjs` | ✅ PASS |
| TypeScript `tsc --noEmit` (8GB heap) | ✅ PASS |
| ESLint (MKT-04 scoped paths) | ✅ PASS |
| `npm run build` | ✅ PASS |
| `verify:co-marketing-mkt-01` | ✅ PASS |
| `verify:co-marketing-mkt-02` | ✅ PASS |
| `verify:co-marketing-mkt-03` | ✅ PASS |

Script: `npm run verify:co-marketing-mkt-04`

Runtime coverage in verify: create → save → desktop/mobile preview → personalization → approve freeze → edit new draft → clone → template → reusable block → asset upload/archive → unknown block skip · safety flags · no send actions.

---

## 7. Manual / ops notes

- No database migration required for MKT-04.
- In-memory stores reset on process restart (foundation).
- Asset uploads use data URL / HTTPS only; max `MARKETING_ASSET_MAX_BYTES`.

---

## 8. Next sprint candidates (not started)

- Durable campaign/asset persistence
- Test send (gated)
- Richer block picker / reusable-block insert UX
- Schedule / routing / notification configuration beyond placeholders

---

## 9. Final status

**CO-MARKETING-MKT-04 implementation complete. STOP.**

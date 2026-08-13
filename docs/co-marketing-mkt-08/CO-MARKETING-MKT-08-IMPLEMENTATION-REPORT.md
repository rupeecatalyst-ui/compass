# CO-MARKETING-MKT-08 — Email Composer + Campaign Content Engine

**Sprint:** CO-MARKETING-MKT-08  
**Status:** Implementation complete · **STOP — awaiting Product Owner review**  
**Architecture:** CO-MARKETING-ARCH-001  
**Builds on:** MKT-04 builder · MKT-05 lifecycle · MKT-07 email delivery boundary  

---

## Summary

MKT-08 strengthens the **reusable campaign content and email composition layer**. Delivery continues to terminate at the MKT-07 `MarketingEmailDeliveryPort` (dry-run / no live bulk send). This sprint is about **content authoring, preview, versioning, and approval** — not bulk sending.

Existing MKT-04/05 foundation was extended (not rebuilt): block document model, asset library, personalization allowlist, email-safe HTML renderer, and legal lifecycle transitions remain the SSOT.

---

## Content model

| Field | Status |
|-------|--------|
| Campaign name | Existing |
| Internal description | **Added** (`internalDescription` — operator-only) |
| Subject | Existing |
| Preheader | Existing `previewText` — UI labeled Preheader |
| HTML / rich content | Block document |
| Plain text fallback | **Added** editable `plainTextOverride` + auto-derive |
| Images / assets | Marketing Asset Library (not Document Registry) |
| CTA buttons / links | `cta` blocks + campaign CTA fields |
| Personalization | Allowlisted tokens only |
| Footer / signature | `footer` + `disclaimer` blocks |
| UTM / tracking | **Added** `utm` config + CTA rewrite when tracking on |

---

## Block-based builder

Architecture remains **library-agnostic** (JSON block document + table/inline CSS renderer).

| Builder label | Block type |
|---------------|------------|
| Heading | `header` |
| Paragraph | `text` |
| Image | `image` (+ logo / hero) |
| Button | `cta` |
| Divider | `divider` |
| Spacer | **`spacer` (new)** |
| Highlight | **`highlight` (new)** |
| Offer | `offer_card` |
| Contact information | **`contact` (new)** |
| Footer | `footer` |

---

## Asset library

Reuses Marketing Asset Library (MKT-04):

- Upload · preview · reuse · metadata · archive
- **Active / inactive** via `set_active` API (`active = !archived`)
- Image assessment helper (`asset-optimize.ts`) — MIME validation, size warnings, suggested max width (no Document Registry)

---

## Personalization

Allowlisted tokens (no code execution):

`firstName` · `lastName` · `fullName` · `city` · `state` · `profession` · `company` · `companyName` · `product` · `senderName`

- Missing values use **safe fallbacks** (e.g. `firstName` → `there`)
- Unknown tokens are rejected at save/preview
- Preview UI supports editable sample values for test-recipient rendering **without send**

---

## Preview

- Desktop HTML (600px)
- Mobile HTML (360px)
- Plain text pane (override or auto-derived)
- Subject + preheader + sender strip
- Personalization sample editor

---

## Versioning

- Editing a frozen version **mints a new draft** (unchanged MKT-04/05 behaviour)
- Approve freezes draft and sets `activePublishedVersionId`
- **Version history UI** lists frozen / published / draft versions
- **Use as new draft** (`restore_version`) copies content into a new editable draft
- Restoring **never mutates** the published version used by a running campaign

---

## Approval / lifecycle

Preserved MKT-01/MKT-05 architecture terminology (not reinvented):

`DRAFT` → `PREVIEW` → `READY_FOR_REVIEW` → `APPROVED` → `SCHEDULED` → `RUNNING` → `PAUSED` → `COMPLETED`  
(+ `STOPPED` · `CANCELLED` · `FAILED`)

User-facing PUBLISHED / ARCHIVED map to existing **APPROVED / published version** and **STOPPED/CANCELLED** operational states.

SAVE never publishes. APPROVE requires permission. Test Send remains disabled.

---

## Hard safety

- `ENTERPRISE_MARKETING_EXECUTION_ENABLED = false`
- No real campaign sending
- MKT-07 delivery port remains the only email boundary (dry_run default)
- Contact / Opportunity workflows untouched
- Document Registry not used for marketing assets

---

## Components created / modified

### Created
| Path | Purpose |
|------|---------|
| `src/lib/enterprise-marketing-engine/utm.ts` | UTM append helper |
| `src/lib/enterprise-marketing-engine/asset-optimize.ts` | Image asset assessment |
| `scripts/co-marketing-mkt-08-verify.mjs` | Verification |
| `docs/co-marketing-mkt-08/CO-MARKETING-MKT-08-IMPLEMENTATION-REPORT.md` | This report |

### Modified (key)
| Path | Change |
|------|--------|
| `src/constants/enterprise-marketing-engine/content.ts` | New blocks, tokens, labels, fallbacks |
| `src/lib/enterprise-marketing-engine/content-blocks.ts` | Defaults for spacer/highlight/contact |
| `src/lib/enterprise-marketing-engine/email-render.ts` | New blocks + UTM on CTAs + plaintext override |
| `src/lib/enterprise-marketing-engine/personalization.ts` | companyName/senderName + safe fallbacks |
| `src/types/enterprise-marketing-campaign.ts` | internalDescription, plainTextOverride, utm, active assets |
| `server/.../campaign.service.ts` | Save/preview/restoreVersionAsDraft |
| `server/.../campaign-store.ts` | New version fields + clone |
| `server/.../asset-store.ts` / `asset.service.ts` | active/inactive + optimization metadata |
| `marketing-campaigns-panel.tsx` | Composer UX: UTM, plaintext, personalization, version history |
| `safety.ts` / foundation | Sprint → MKT-08 |

---

## Verification

```bash
npm run verify:co-marketing-mkt-08
```

**Result: PASS** — rich content blocks, mobile render, UTM, personalization fallbacks, unsafe token block, desktop/mobile/plaintext preview, approve freeze, restore-from-history without mutating published version, asset active/inactive.

Engineering gates:

- TypeScript: ✅
- Verify MKT-08: ✅
- Regression MKT-04/05/07 verify scripts updated for successor sprint marker

---

## Explicit non-goals

- No MKT-09
- No live ESP / bulk send
- No Document Registry coupling
- No operational Contact/Opportunity changes

---

## Final status

**Ready for Product Owner review** — content composition engine complete; delivery remains dry-run / disabled for live campaigns.

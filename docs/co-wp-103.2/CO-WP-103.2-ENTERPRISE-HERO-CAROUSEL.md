# CO-WP-103.2 — Enterprise Hero Carousel

**Status:** Deployed for Product Owner BAT  
**Stop:** Do not start CO-WP-103.3 until BAT passes.

## Live URL

- Wealth Partner App: https://wealth-partner-app.vercel.app (v0.3.5)
- Catalyst One API: https://catalyst-one-two.vercel.app (`GET /api/partner/home`)

BAT Demo: `wp-bat@rupeecatalyst.com` / `WpBat!388828969`

## Behaviour

- Auto-slide ≈ 5.5s with ease-in-out track animation (no remount flicker / layout jump)
- Manual swipe with momentum + soft rubber-band; stops current animation immediately
- Auto-slide resumes ~4.2s after inactivity
- Tap card · Tap CTA · Tap dots to jump
- Soft theme gradients + illustration / lazy `imageUrl`
- Empty carousel → one Enterprise empty-state card (never blank space)

## DTO (`PartnerHomeHeroCardDto`)

| Field | Notes |
|---|---|
| `id` | Stable card id |
| `contentType` | Extensible string (campaign, contest, training, …) |
| `title` / `subtitle` | Copy |
| `imageUrl` | CDN-ready; nullable |
| `illustrationKey` | Named glyph when no image |
| `theme` / `backgroundGradient` | Visual tokens |
| `ctaLabel` / `ctaAction` / `deepLink` | CTA + deep link |
| `badge` / `productCategory` | Optional chrome |
| `audience` | Audience metadata |
| `publishWindow` | `{ startsAt, endsAt }` |
| `priority` / `sortOrder` | Ordering |

Dashboard also returns `heroEmptyState`: `{ title, subtitle, theme, illustrationKey }`.

Source of truth: Catalyst One Experience Engine seed → Partner Gateway. Companion renders only.

## Empty state

When `heroCarousel` is `[]`, UI shows Enterprise card:

> **No announcements available.**  
> Enterprise will publish campaigns and updates here.

## Architecture

Reusable `EnterpriseHeroCarousel` — no Wealth Partner–specific business logic; consumer supplies `onCta(deepLink)`.

## Out of scope (untouched)

Business Feed · Recommended Actions · Today’s Highlights · Business Chips · Digital Visiting Card · Saarthi · Analytics · CO-WP-103.3


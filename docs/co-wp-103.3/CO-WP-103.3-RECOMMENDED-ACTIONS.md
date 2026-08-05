# CO-WP-103.3 — Recommended Actions (Premium Action Cards)

**Status:** Deployed for Product Owner BAT  
**Stop:** Do not start Today's Highlights / CO-WP-103.4 until BAT passes.

## Live URL

https://wealth-partner-app.vercel.app (v0.3.7)

## Behaviour

- Section title ⚡ Recommended Actions + optional View All →
- Horizontal swipe of equal square premium action cards
- Entire card tappable; scale + soft ripple on press
- Content from Catalyst One Experience Engine only

## DTO

`PartnerHomeRecommendedActionDto`: `id` · `title` · `icon` · `theme` · `deepLink` · `audience` · `priority` · `visibilityRule`  
`recommendedActionsMeta`: `title` · `viewAllLabel` · `viewAllDeepLink`

## Out of scope

Hero Carousel unchanged. Today's Highlights not started.

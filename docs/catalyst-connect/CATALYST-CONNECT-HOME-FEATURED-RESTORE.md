# Catalyst Connect — Home Featured Experience Restoration

Status: **Corrected** · Product Owner correction applied  
Sprint: CO-WP-HOME-FEATURED-001 (restores CO-WP-103.21 Featured Cards)

## Correction

Business Snapshot KPI tiles are **not** the approved primary Home cards.

The approved primary visual is the **Enterprise Hero Carousel** (large premium vertical feature cards with illustrations, gradients, badges, CTAs), plus certified Recommended Actions and Today’s Highlights.

## Hierarchy (PO)

1. Header  
2. Search  
3. Compact Partner Command Center  
4. **Featured Cards** — `EnterpriseHeroCarousel` (+ Recommended Actions · Today’s Highlights)  
5. Business Snapshot — supporting small KPIs only  
6. Quick Actions  
7. Recent Activity  

Timeline remains off Home (Opportunity / Customer workspaces).

## SSOT

- Hero / Actions / Highlights content: Catalyst One `GET /api/partner/home` catalogs  
- Components: existing `EnterpriseHeroCarousel`, `EnterpriseRecommendedActions`, `EnterpriseTodaysHighlights`  
- No companion-invented card catalogue  

## Related

- `docs/co-wp-103.21/CO-WP-103.21-HOME-CERTIFICATION-REPORT.md`  
- `docs/co-wp-103b/CO-WP-103B-UX-CONSTITUTION.md`  
- `docs/catalyst-connect/CATALYST-CONNECT-HOME-SNAPSHOT.md` (Snapshot = supporting only)

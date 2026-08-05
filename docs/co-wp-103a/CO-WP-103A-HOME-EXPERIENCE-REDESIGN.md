# CO-WP-103A — Home Experience Redesign

**Status:** Deployed for Product Owner visual review  
**Date:** 2026-08-01  
**Stop:** Do **not** begin CO-WP-104.

## Philosophy

Home = Daily Business Companion (not CRM / MIS).

Removed from Home: Business Snapshot, KPI cards, pipeline, deal/opportunity counters.

## Structure

1. Compact greeting + notification  
2. Hero carousel (Enterprise-configured, auto-slide + swipe)  
3. My Business Today (chips)  
4. Business Feed  
5. Recommended Actions  
6. Today’s Highlights  
7. Digital Visiting Card (title from Catalyst One)  
8. Compact Saarthi  
9. Bottom nav unchanged  

## Enterprise

- `GET /api/partner/home` returns companion DTO  
- Content catalogues live in Catalyst One (`enterprise-partner-home.ts`)  
- Companion is presentation-only  

## Version

Wealth Partner App **0.3.1** — Home Experience Redesign

## Review URL

https://wealth-partner-app.vercel.app

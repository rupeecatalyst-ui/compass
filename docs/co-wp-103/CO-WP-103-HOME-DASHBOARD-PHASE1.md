# CO-WP-103 — Home Dashboard (Phase 1)

**Status:** Implemented · Deployed for BAT  
**Date:** 2026-08-01  
**Stop:** Do **not** begin CO-WP-104 until Product Owner BAT.

## What shipped

### Catalyst One — Partner Home API

- `GET /api/partner/home`
- Zero-Trust: Partner JWT → Partner UUID → binding ownership → DTO
- Projection only — no companion calculations
- Honest zeros / empty activity when partner book has no operational data

### Wealth Partner App — Home command centre

1. Greeting header (salutation, name, professional title, photo/initials, notifications)  
2. Saarthi Live card (Enterprise copy + Ask Saarthi)  
3. Today’s Priorities (DTO counts)  
4. Business Snapshot (DTO counts + Enterprise pipeline label)  
5. Quick Actions (buttons → placeholders only)  
6. Recent Activity (Enterprise timeline)  
7. Existing bottom navigation retained  

### Not built (per sprint)

Customer / Opportunity workspaces · Business Centre · Feed · Communication · Training · Documents module · Commission logic · local business stores

## Version

Wealth Partner App **0.3.0** — Home Dashboard Phase 1

## URLs

- App: https://wealth-partner-app.vercel.app  
- API: https://catalyst-one-two.vercel.app/api/partner/home  

## BAT login

Use permanent demo identity (`WPDEMO001` / `wp-bat@rupeecatalyst.com`).

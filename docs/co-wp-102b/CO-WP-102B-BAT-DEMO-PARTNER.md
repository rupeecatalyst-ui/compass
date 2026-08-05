# CO-WP-102B — Permanent Wealth Partner BAT Identity

**Status:** Complete · Verified  
**Date:** 2026-07-31  

## Identity

| Field | Value |
|-------|--------|
| Partner UUID | `cms9apix90003wejcooyto6ij` |
| Partner Code | `WPDEMO001` |
| Display Name | Wealth Partner Demo |
| Purpose | BAT / UAT / Regression |
| Login Email | `wp-bat@rupeecatalyst.com` |
| Commercial status | `excluded_bat_demo` |

## Isolation

SSOT: `src/constants/enterprise-wealth-partner-bat.ts`

- Excluded from operational registry lists by default (`includeBatDemo` required to surface)
- Commission / network / bank mutations rejected for BAT partners
- Business sourcing KPIs return empty for BAT partners
- Network intelligence child resolution excludes BAT codes
- `profileJson.batIsolation` flags all analytics / marketing exclusions
- Zero commissions, network members, bank accounts at creation

## Production partner retirement

Neeraj Asrani (`WPT710118` / `cms6e1e540003ld04mk5u5ubz`):

- BAT activation stamp retired
- Activation restored to original user `cms94ov100000js04tstlodje`
- Identity / commercial fields not otherwise modified

## Verification

- Partner login → session Partner Code **WPDEMO001**
- `/api/partner/auth/me` → Wealth Partner Demo
- App https://wealth-partner-app.vercel.app → 200

## Future BAT

Use **WPDEMO001** / `wp-bat@rupeecatalyst.com` only. Do not re-link BAT to live Wealth Partners.

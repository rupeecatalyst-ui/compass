# Catalyst Connect — Expanded Identity Module

**Programme:** CO-WP-IDENTITY-002  
**Status:** Implementation complete (local) — no deploy unless PO requests  
**Constitution:** Connect is presentation only; Catalyst One owns profile & branding.

## Directive

Expand the Identity module to display:

- Official Profile  
- Digital Visiting Card  
- QR Code  
- Referral Link  
- Contact Details  
- Products  
- Languages  
- Office Details  
- Social Links  

Do **not** duplicate profile management or branding configuration inside Catalyst Connect.

Digital Visiting Card remains accessible from:

- Header Card icon  
- Profile / More  

## Architecture

| Layer | Responsibility |
|---|---|
| Catalyst One | Projects Identity Module + Visiting Card from Wealth Partner Registry / Experience branding |
| Connect | Renders `/app/identity` only |

## API

`GET /api/partner/identity` → `PartnerIdentityModuleDto`

## SSOT paths

| Concern | Path |
|---|---|
| Types | `src/types/enterprise-partner-identity-module.ts` |
| Compose | `server/services/partner-gateway/partner-identity-module.compose.ts` |
| Service | `server/services/partner-gateway/partner-identity.service.ts` |
| WP | `IdentityCardScreen` · `EnterpriseDigitalVisitingCard` |

## Honesty

- Uncaptured fields → **Not Specified**  
- Social links / languages / branch appear only when published on Enterprise partner profile  
- Products remain Catalyst One authorisation projection  

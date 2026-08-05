# CO-WP-IDENTITY-001 — Enterprise Professional Identity Card

Status: **Product Owner Design · Implementation Ready for BAT**  
Priority: **CRITICAL**  
Deployment: **None** — await Product Owner BAT  

## Purpose

Rename and elevate the Digital Visiting Card to the **Professional Identity Card** / **My Professional Identity** — the official digital identity of every Wealth Partner representing Rupee Catalyst.

This is not a decorative visiting card. It is brand-first professional identity.

## Ownership

| Concern | Owner |
|---------|--------|
| Partner Identity · Designation · Tier · Product Entitlements · Contact · QR data | **Catalyst One** |
| Card rendering (front / back) | **Wealth Partner App** |

Companion must not hardcode products, invent tier, or redraw the Rupee Catalyst logo.

## Branding (non-negotiable)

- Official Rupee Catalyst logo is mandatory at the top of the card.
- Asset: `Wealth Partner App/web/public/rupee-catalyst-logo-official.svg` (+ `.png`) — copied unmodified from Catalyst One brand pack.
- API projects `branding.brandMarkUrl` → `/rupee-catalyst-logo-official.svg`.
- Do not recreate, redraw, or stylize the mark.

## Look & feel

Premium luxury FinTech (CRED · Amex · Apple Wallet · Revolut): dark theme, premium gradients, soft lighting, glassmorphism, elegant typography.

## Surfaces

### Front

- Official logo  
- Partner photograph  
- Name · Designation · Tier badge (Gold / Platinum / Silver / Bronze)  
- Partner Code · Years of Experience · City · Languages (future)  
- Authorised products (Enterprise projection only)  
- Quick actions: Call · WhatsApp · Email · Share Card  

### Back

- Large QR · Scan to Connect  
- Company address · Website · Support  
- Corporate disclaimer  
- Powered by Rupee Catalyst  
- Future placeholders: Certifications · Awards · Social Links · Calendar Booking · Branch Details · Digital Signature  

## Architecture notes

- DTO: `PartnerHomeVisitingCardDto` (`src/types/enterprise-partner-gateway.ts`)
- Projection: `partnerHomeService.getHomeDashboard` → `visitingCard`
- Seed entitlements / default tier until Partner Entitlements + Tier Engine are authorised (BAT-002 still blocks those engines) — companion consumes DTO only.
- UI: `EnterpriseDigitalVisitingCard` (CSS class prefix `epic`)

## BAT-002 exception

CO-WP-BAT-002 freeze remains in force. **CO-WP-IDENTITY-001** is an explicit Product Owner design sprint.

- Do **not** implement Partner Tier Engine or Partner Entitlements engines in this sprint.
- Do **not** deploy to Vercel for IDENTITY-001.
- Await Product Owner BAT on local / review build.

## Manual verification

1. Sign in to Wealth Partner App (pointed at C1 with updated home DTO).  
2. Home → My Professional Identity.  
3. Confirm official logo at top, flip to back, authorised products from API only.  
4. Confirm no companion-hardcoded product list.

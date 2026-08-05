# Catalyst Connect — PO Directives Implementation Note

**Status:** Local implementation complete · **Awaiting PO BAT / deploy instruction**  
**Date:** 2026-08-02  
**Constitution:** `docs/catalyst-connect/CATALYST-CONNECT-SSOT-CONSTITUTION.md`

## What shipped locally (no deploy)

### Constitution
- Rule: `.cursor/rules/catalyst-connect-ssot-constitution.mdc`
- Doc: `docs/catalyst-connect/CATALYST-CONNECT-SSOT-CONSTITUTION.md`

### §5 Automatic Source Attribution
- Catalyst One stamps `sourceAttribution` on partner Opportunity create from authenticated partner binding.
- Type: `PartnerOpportunitySourceAttributionDto` (`hiddenFromPartnerUi: true`).
- Create Opportunity UI has **no** Source field (verified).
- Connect types mirror DTO but must never render it.

### §7 Digital Visiting Card as primary nav
- Header Card icon immediately beside Profile → `/app/identity`.
- Dedicated Identity screen projects Home `visitingCard` DTO.
- Profile hub also links to Identity.
- Quick actions: Share · WhatsApp · Copy Link · Save QR · Preview · Call · Email (C1 catalog + Connect handlers).

### Explicitly not done in this pass
- LOD / recommendations Partner API depth (separate programme).
- Deploy to Vercel (held per BAT-005 unless PO requests).

## Follow-on completed: CO-WP-IDC-001
See `docs/catalyst-connect/CATALYST-CONNECT-IDC-SYNC.md` — Enterprise IDC catalog + Connect dynamic render.

## Manual BAT checks
1. Header Card icon opens Professional Identity.
2. Create Opportunity shows no Source control.
3. After create, Catalyst One detail includes `sourceAttribution` with partner id/name (API/inspect).
4. Identity actions: Copy Link / Save QR / Preview / Share work from DTO values only.

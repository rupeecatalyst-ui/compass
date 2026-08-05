# Catalyst Connect — Partner Command Center

**Programme:** CO-WP-COMMAND-001  
**Status:** Implementation complete (local) — no deploy unless PO requests  
**Constitution:** Connect is presentation only; actionable projections from Catalyst One.

## Directive

Redesign the dashboard as a **Partner Command Center** that answers:

> What should I do next?

### Display

- Today's Priority  
- Opportunities Requiring Action  
- Pending Documents  
- Today's Follow-ups  
- Commission Snapshot  
- Monthly Target Progress  
- AI Suggestions  
- Recent Activity  
- Quick Actions  

Reduce decorative charts; increase actionable information.

## Architecture

| Layer | Responsibility |
|---|---|
| Partner Gateway | Compose `commandCenter` from Opportunity / LOD / activities / partner profile commercials |
| Connect Home | Render Command Center as primary surface; greeting + search + identity card remain |

## SSOT

| Concern | Path |
|---|---|
| Types | `src/types/enterprise-partner-command-center.ts` |
| Compose | `server/services/partner-gateway/partner-command-center.compose.ts` |
| Wire-in | `partnerHomeService.getHomeDashboard` → `commandCenter` |
| WP UI | `PartnerCommandCenter` · `HomeDashboard` |

## Honesty rules

- Commission / monthly target show **Not Specified** until enterprise commercial / target fields exist on the partner profile — never invent numbers.  
- AI Suggestions are operational prompts derived from open work — not a separate AI engine.  
- Hero carousel / experience feed removed from primary home layout.

## Acceptance

Dashboard communicates next actions without enterprise dashboard complexity.

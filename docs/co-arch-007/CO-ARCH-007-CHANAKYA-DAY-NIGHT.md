# CO-ARCH-007 — Enterprise Processing Architecture & CHANAKYA Intelligence

**Status:** OPEN — Engineering shipped; BAT/RUM pending  
**Date:** 2026-07-28  

> Complements **CO-ARCH-003** (tiers) and **preserves CO-ARCH-005** (Mission Control Snapshot).  
> Separate from the historical one-lender-one-deal programme also labelled CO-ARCH-007 in Deal docs.

---

## Principles

1. **Day Mode** — observe, record, advise from certified snapshots. No heavy scoring / analytics.  
2. **Night Mode** — default **02:00** (configurable) — Customer / Lender / Partner scoring, Portfolio Intelligence, Recommendation learning, Revenue / Executive KPIs, Radar + Enterprise Intelligence snapshots.  
3. **CHANAKYA Radar** is a **Tier 4 Snapshot Consumer** — never live enterprise aggregation on page load.  
4. **Manual lender selection** = Registry read + store lender ID (user intent). No Recommendation / Programme / Policy / Eligibility / AI engines on select.  
5. **Mission Control Snapshot (CO-ARCH-005)** remains unchanged as the MC consumer path.

---

## Tiers (extended)

| Tier | Role |
|------|------|
| 1 | Mission Critical Transaction Engine |
| 2 | Background Event Engine |
| 3 | Enterprise Intelligence Engine (Night Mode / Admin Force) |
| 4 | Snapshot Consumers (Mission Control, CHANAKYA Radar) |

SSOT: `src/constants/enterprise-processing-architecture.ts`  
Day/Night: `src/constants/chanakya-operating-model.ts`

---

## CHANAKYA Radar

- Read: `GET /api/enterprise-metrics/radar` → `mission_control.radar_dashboard` (full dial model)  
- UI: philosophy quote · Last Intelligence Refresh · Version · Next Scheduled Refresh  
- Manual refresh: **ADMIN / SUPER_ADMIN** only → Force Recalculate  
- Philosophy: *“I Observe by Day, Learn by Night, Advise Every Morning.”* — CHANAKYA

---

## Manual lender selection

Constants: `src/constants/manual-lender-selection.ts`  
Identify Additional Lender / Strategy select: Deal create + shortlist only.

---

## Admin

`/admin/enterprise-metrics`

- Mission Control Snapshot schedule (CO-ARCH-005 — unchanged contract)  
- CHANAKYA Night Mode hour (default 02:00)  
- Force Recalculate (Admin only)

---

## Files

- `src/constants/chanakya-operating-model.ts`
- `src/constants/manual-lender-selection.ts`
- `src/constants/enterprise-processing-architecture.ts` (Tier 4)
- `server/services/enterprise-metrics-engine/compose-mission-control-snapshot.ts` (full radar payload)
- `src/app/api/enterprise-metrics/radar/route.ts`
- `src/lib/chanakya-radar/load-certified-radar-snapshot.ts`
- `src/lib/chanakya-radar/snapshot-projection.ts`
- `src/components/catalyst-one/chanakya-radar/*`
- Admin panel + admin API Night Mode
- `scripts/co-arch-007-chanakya-intelligence-verify.mjs`

---

## Certification

**OPEN** until BAT confirms:

1. Radar opens from certified snapshot (no live book derive)  
2. Day Mode does not run heavy engines on interactive paths  
3. Manual lender select does not invoke recommendation/policy engines  
4. Mission Control still snapshot-driven (CO-ARCH-005 verify PASS)  
5. Ops Tier 1 journeys remain responsive  


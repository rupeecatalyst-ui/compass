# CO-ARCH-005 — Mission Control Snapshot & Executive Dashboard

**Status:** OPEN — Snapshot architecture shipped; BAT/RUM pending  
**Date:** 2026-07-28  

> Naming: This programme is **Mission Control Snapshot optimisation**.  
> Historical CO-ARCH-005 Lender/Deal docs elsewhere are a different workstream.

---

## Principle

Mission Control is the **Executive Intelligence Centre**.

It **consumes** scheduled Enterprise Intelligence snapshots.  
It **never** runs heavy analytics on page load.

Operational Tier 1 workflows (Contacts, Opportunity, Strategy, Deal, Accounting) always take priority (CO-ARCH-003).

---

## Before vs After

| | Before | After |
|--|--------|-------|
| Executive Briefing open | Live `composeBusinessIntelligenceSnapshot()` (Radar + ETE) | `GET /api/enterprise-metrics/mission-control` certified snapshot |
| Heavy derive on MC open | Yes | **No** (awaiting empty shell if no snapshot) |
| Manual refresh | Anyone refreshing page re-derives | **Administrators only** via Force Recalculate |
| Schedule | Display-only nightly note | Admin-configurable 2h / 4h / 6h / 12h / daily |
| Cron | Daily fixed | Daily Vercel cron (Hobby) + schedule gate; sub-daily via Admin Force or Pro/external cron |
| Metadata | Hidden | Banner: Last Updated · Version |

---

## Architecture

1. **EME** (`forceRecalculate` / cron when due) writes:
   - `mission_control.executive_snapshot`
   - `mission_control.radar_dashboard`
   - `mission_control.schedule_config`
2. **Mission Control UI** reads latest snapshot only (`awaiting_snapshot` if none).
3. Formulas remain SSOT: Radar + EBI derives inside EME compose (no duplicate engines).

```text
BEFORE:  Open MC → live EBI/Radar compose → slow + competes with ops
AFTER:   Open MC → GET snapshot row → paint (<2s target) · heavy work = Tier 3 only
```

---

## Performance comparison (engineering)

| Metric | Before (design) | After (design) |
|--------|-----------------|----------------|
| MC page load compute | Full EBI + Radar derive | Snapshot read only |
| Competing with ops DB | Yes on every MC open | No — Tier 3 scheduled/admin |
| Polling / widget refresh storms | Possible | Forbidden on MC open |
| Target open time | Unbounded | **< 2 seconds** (RUM pending) |

Production RUM evidence is required before certification close.

---

## Admin

Path: `/admin/enterprise-metrics` (ADMIN / SUPER_ADMIN)

- Configure Mission Control Snapshot schedule  
- Force Recalculate (includes Mission Control)  
- View last snapshot time / version  

Management / Executives: **view current snapshot only**.

---

## Ops

1. Ensure Vercel cron `POST /api/cron/enterprise-metrics` + `CRON_SECRET`  
2. Default Vercel cron: once daily `0 20 * * *` (Hobby plan limit). Cron **skips** when Admin schedule is not due.  
3. Sub-daily intervals (2h / 4h / 6h / 12h): use **Administrator Force Recalculate**, or call the cron endpoint from an external scheduler / Vercel Pro.  
4. Run Force Recalculate once to seed first MC snapshot  

---

## Files

- `src/constants/mission-control-snapshot.ts`
- `server/services/enterprise-metrics-engine/compose-mission-control-snapshot.ts`
- `server/services/enterprise-metrics-engine/index.ts`
- `src/app/api/enterprise-metrics/mission-control/route.ts`
- `src/app/api/admin/enterprise-metrics/route.ts`
- `src/app/api/cron/enterprise-metrics/route.ts`
- `src/mission-control/executive-briefing/*`
- `src/components/catalyst-one/admin/enterprise-metrics/enterprise-metrics-admin-panel.tsx`
- `src/config/navigation.ts` (Mission Control → Executive Briefing)
- `scripts/co-arch-005-mission-control-snapshot-verify.mjs`
- `vercel.json` (cron `0 20 * * *` daily — Hobby-compatible)

---

## Business Acceptance Test (evidence checklist)

| # | Case | Expected | Evidence |
|---|------|----------|----------|
| 1 | Open Mission Control (sidebar) | Lands on Executive Briefing; banner shows Last Updated / Version | ☐ |
| 2 | Network on open | Single snapshot GET; no live EBI compose / heavy SQL storm | ☐ |
| 3 | Non-admin | No Force Recalculate / schedule controls | ☐ |
| 4 | Admin | Can set 2h–daily schedule + Force Recalculate | ☐ |
| 5 | After Force Recalculate | Banner updates; KPIs from certified snapshot | ☐ |
| 6 | Ops during MC open | Contacts / Opportunity / Deal remain responsive | ☐ |
| 7 | Cron when not due | Returns `skipped: true` | ☐ |

---

## Certification

**CO-ARCH-005 remains OPEN** until:

1. Mission Control opens from certified snapshot in production  
2. No live heavy aggregation on MC page load (RUM)  
3. Manual refresh restricted to Administrators (BAT)  
4. Operational workflows unaffected  


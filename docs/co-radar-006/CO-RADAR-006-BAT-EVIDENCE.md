# CO-RADAR-006 — Product Owner BAT / Deployment Evidence

**Status:** Deployed · Snapshot refreshed · Awaiting Product Owner UI confirmation  
**No scoring / formula / architecture changes**

---

## Deployment

| Field | Value |
|-------|--------|
| Status | ● Ready (Production) |
| Deployment URL (alias) | https://catalyst-one-two.vercel.app |
| Deployment URL (unique) | https://catalyst-nu6hfhu8t-rupee-catalyst.vercel.app |
| Deployment ID | `dpl_2P3cH5rnA9BHKfEaEAwBeBx43e54` |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/2P3cH5rnA9BHKfEaEAwBeBx43e54 |
| Radar page | https://catalyst-one-two.vercel.app/chanakya-radar |
| Created | 2026-08-08 21:14 IST |

Also aliased as: `https://catalyst-one-rupee-catalyst.vercel.app`

---

## Post-deploy intelligence refresh

| Field | Value |
|-------|--------|
| Force recalculate | ✅ Succeeded |
| Run completed | 2026-08-08T15:51:42.629Z |
| Snapshots written | 16 |
| Failures | 0 |
| Metric keys | `mission_control.executive_snapshot` · `mission_control.radar_dashboard` |

---

## Certified Radar snapshot (post-refresh SSOT)

This is the EME payload CHANAKYA Radar Tier-4 UI consumes.

| Field | Value |
|-------|--------|
| Snapshot metric | `mission_control.radar_dashboard` |
| Snapshot asOf / version stamp | `2026-08-08T15:51:29.659Z` |
| Source modules | `buildChanakyaRadarDashboard` · `EnterpriseDeal` · **`EnterpriseDealTimelineEvent`** · **`CO-RADAR-005`** |
| Deal count (active Radar book) | **10** |
| Timeline events (hydrated projection) | **25** (same book as CO-RADAR-004/005; 10/10 deals populated) |
| Avg Deal Health | **50** |
| At Risk | **2** (20%) |
| Needs Attention | **5** (50%) |
| On Track | **3** (30%) |
| Direction | South-West |
| Health = 6 universal floor | **NOT present** (sample healths include 97, 38, 7 — not all 6) |

### Note on 56 → 50

CO-RADAR-005 certification measured Avg Health **56** at that moment.  
Post-deploy Force Recalc (later wall-clock) re-ran the **same frozen formula** on the same hydrated timelines; idle/ageing progressed → Avg Health **50**, On Track 3 / Needs Attention 5 / At Risk 2.  

This is expected data-path behaviour — **not** a scoring change and **not** a return to the empty-timeline floor (**6** / At Risk 100%).

---

## Stale Health = 6 check

| Check | Result |
|-------|--------|
| Universal Avg Health = 6 | ❌ Gone |
| At Risk = 100% | ❌ Gone (now 20%) |
| Snapshot includes CO-RADAR-005 timeline modules | ✅ Yes |

---

## Live UI open check

Unauthenticated GET `https://catalyst-one-two.vercel.app/chanakya-radar` correctly presents **Sign In** (expected).

Automated authenticated BAT against production login was **not completed** in this wave: production Super Admin password for `admin@rupeecatalyst.com` is rotated; `VERIFY_ADMIN_PASSWORD` / `CO_BAT_ADMIN_PASSWORD` are unset in this environment. Frozen demo pair `admin@compass.com` / `Admin@123` returns `INVALID_CREDENTIALS` on production prisma auth (expected).

### Product Owner BAT steps (manual, ~2 minutes)

1. Open https://catalyst-one-two.vercel.app/chanakya-radar  
2. Sign in as production Super Admin (`admin@rupeecatalyst.com` + current password)  
3. Confirm Avg Deal Health is **not** 6 (expect ~50-class from refreshed snapshot)  
4. Confirm At Risk is **not** 100% (expect 2)  
5. Confirm Needs Attention / On Track show non-zero split  
6. Confirm snapshot is current (post Force Recalc time)

---

## BAT evidence artefacts

- `docs/co-radar-006/CO-RADAR-006-BAT-EVIDENCE.md` (this file)
- `docs/co-radar-005/CO-RADAR-005-STORED-SNAPSHOT.json` (refreshed post-deploy)
- Deploy JSON: Ready `dpl_2P3cH5rnA9BHKfEaEAwBeBx43e54`

---

## Summary for PO

| Item | Evidence |
|------|----------|
| Deployment URL | https://catalyst-one-two.vercel.app |
| Deployment/build identifier | `dpl_2P3cH5rnA9BHKfEaEAwBeBx43e54` |
| Snapshot version / asOf | `2026-08-08T15:51:29.659Z` (+ CO-RADAR-005 modules) |
| Timeline events in live Radar path | **25** |
| Avg Deal Health | **50** (was stale **6**) |
| At Risk | **2** |
| Needs Attention | **5** |
| On Track | **3** |

**STOP — awaiting Product Owner confirmation after live UI sign-in.**

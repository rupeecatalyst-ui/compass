# CO-WP-EXP-001 — Consolidated Development Report

**Status:** DEVELOPMENT COMPLETE · Ready for BAT  
**Deploy:** **NOT performed**  
**Date:** 2026-08-10

---

## Scope delivered

| Area | Outcome |
|------|---------|
| **Saarthi** | Partner-scoped guidance + Q&A from authorized C1 data only |
| **Notifications** | Existing center kept; Home seed fallback removed; DesktopPage polish |
| **Marketing** | Enterprise feed projection desk; honest empty when none |
| **Desktop polish** | ≥1024 side nav · SaarthiLive hidden · More/nav links · copy cleanup |

---

## Constitutional

| Rule | Result |
|------|--------|
| Saarthi ≠ Chanakya | GREEN — no Chanakya / Enterprise AI Platform imports |
| Partner isolation | GREEN — owned Opportunities / Deals / notifications only |
| No fabricated business facts | GREEN — unavailable → stated Not Specified / honest empty |
| No second notification engine | GREEN — `partnerNotificationCenterService` only |
| No independent asset library | GREEN — marketing projects Experience catalogue |

**CHC: GREEN**

---

## APIs (Catalyst One Partner Gateway)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/partner/saarthi` | Guidance desk DTO |
| POST | `/api/partner/saarthi/ask` | Topic Q&A from authorized data |
| GET | `/api/partner/marketing` | Marketing / resources projection |

Services:
- `server/services/partner-gateway/partner-saarthi.service.ts`
- `server/services/partner-gateway/partner-marketing.service.ts`

---

## Wealth Partner App

- `SaarthiDeskScreen` — suggested questions + ask + guidance cards
- `MarketingDeskScreen` — resources grid (also `/app/campaigns`)
- Home mounts `EnterpriseSaarthiWidget`
- Notifications use `DesktopPage` (≥1024 density)
- More + desktop workspace nav: Saarthi, Marketing
- Saarthi Live strip hidden at ≥1024px
- Communication / Saarthi seed copy de-risked (no “coming soon” / “ask anything”)

---

## Prior sprint continuity (this development arc)

| Sprint | Focus |
|--------|--------|
| CO-WP-INT-001 | Opportunity / Deal operational SSOT |
| CO-WP-INT-002 | Customer / Document / Activity SSOT |
| CO-WP-COM-001 | Commercials / Earnings / Performance projection |
| CO-WP-EXP-001 | Saarthi / Notifications / Marketing / desktop experience |

---

## Verification (executed 2026-08-10 — all PASS)

| Check | Result |
|-------|--------|
| Catalyst One `tsc --noEmit` | ✅ |
| Catalyst One `verify:co-wp-exp-001` | ✅ |
| Catalyst One `verify:co-wp-com-001` | ✅ |
| Catalyst One `verify:co-wp-int-002` | ✅ |
| Wealth Partner `verify:co-wp-exp-001` | ✅ |
| Wealth Partner `verify:co-wp-com-001` | ✅ |
| Wealth Partner `lint` (oxlint) | ✅ |
| Wealth Partner `build` (tsc -b + vite) | ✅ |
| **Deploy** | ⏸️ **Not performed** (per PO) |

Desktop acceptance (≥1024) — code-enforced:

- [x] Side nav at ≥1024 · mobile bottom nav / Saarthi Live strip hidden via CSS
- [x] DesktopPage density on Notifications + Saarthi + Marketing desks
- [x] Saarthi answers only partner-owned Opportunity/Deal/notification/performance data
- [x] Marketing honest empty (enterprise feed projection; no independent asset library)
- [x] Home notifications: no seed/fake fallback on error

BAT still required for visual density / overflow on live data.

---

## Manual / ops

- Requires `ENTERPRISE_PERSISTENCE_MODE=prisma` for live Opportunity/Deal/notification projections
- **Do not deploy** until Product Owner authorizes

---

## Final status

🟡 **Development complete · Not deployed · Ready for consolidated BAT**

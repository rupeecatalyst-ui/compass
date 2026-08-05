# CO-WP-103.21 — Home Certification Report

**Programme:** Wealth Partner App · Daily Business Companion  
**Sprint:** CO-WP-103.21 — Home Certification Preparation  
**Build under review:** `0.4.15` · Enterprise Experience Integration (CO-WP-103.20 foundation)  
**Report date:** 2026-08-02  
**Author:** Engineering (readiness review)  
**Audience:** Product Owner  
**Deploy:** ❌ Not deployed (per sprint instruction)  
**Next programme:** ⛔ **CO-WP-104 must NOT begin** until Product Owner certifies Home

---

## 1. Executive verdict

| Verdict | Status |
|--------|--------|
| **Engineering readiness** | ✅ Ready for Product Owner review / BAT |
| **Product Owner certification** | ⏳ **Awaiting Product Owner** |
| **Official “Home Certified”** | ❌ Not granted (PO decision only) |
| **CO-WP-104 authorised** | ❌ **Blocked** until PO certifies |

Home is complete as a presentation-only companion over Catalyst One Partner Home / Experience Engine packages. No new features were added in this sprint. This document is a **readiness review**, not a Product Owner certification.

**Morning test (CO-WP-103B):** Subjectively designed to pass — partners open for inspiration and action, not MIS. Final pass/fail is Product Owner BAT.

---

## 2. Scope reviewed

### Home surface composition (canonical order — CO-WP-103.5A)

1. Greeting Experience (+ Notifications panel)  
2. Home Personalisation  
3. Global Search (floating trigger)  
4. Hero Carousel (flagship)  
5. Recommended Actions  
6. Today’s Highlights  
7. My Business Today  
8. Digital Visiting Card  
9. Compact Saarthi Widget  
10. Business Feed (**last** — secondary publishing)

### Explicitly out of scope for this report

- Business module KPI / MIS screens  
- New Home features  
- Vercel / production deploy  
- CO-WP-104 and later programmes  

---

## 3. Certification checklist

### 3.1 UX hierarchy — ✅ PASS (engineering)

| Check | Result | Evidence |
|-------|--------|----------|
| Companion hierarchy (actions before feed) | ✅ | `HomeDashboard.tsx` — Actions → Highlights → My Business → Visiting → Saarthi → Feed |
| Greeting first / identity chrome compact | ✅ | GreetingExperience |
| Flagship Hero above operational strips | ✅ | Hero after Search, before Actions |
| No pipeline / deals / commission KPI widgets on Home | ✅ | No MIS widgets in Home composition |
| Aligns with CO-WP-103B UX Constitution | ✅ | Daily Business Companion, not CRM |

**PO BAT:** Confirm morning scan order feels natural on Android (~360–412dp).

---

### 3.2 Design consistency — ✅ PASS (engineering)

| Check | Result | Evidence |
|-------|--------|----------|
| Shared design tokens | ✅ | `home-design-tokens.css` (CO-WP-103.18) |
| Unified radius / shadow / ink / icon wells | ✅ | `.home-dash` contracts in `HomeDashboard.css` |
| Gradient philosophy (`--home-grad-angle`) | ✅ | Themed cards consume SSOT angle |
| Section kickers / body typography | ✅ | Shared kicker + body tokens |
| One design language across sections | ✅ | No orphan “other app” card families observed in CSS SSOT |

**Residual risk (non-blocking):** Hero retains flagship stage gradients (152deg) by design — intentional exception, not drift.

---

### 3.3 Motion quality — ✅ PASS (engineering)

| Check | Result | Evidence |
|-------|--------|----------|
| Section enter stagger | ✅ | `homeSectionIn` (CO-WP-103.17) |
| Press feedback scale | ✅ | `--home-press-scale` on cards / CTAs |
| Hero settle / autoplay / swipe | ✅ | EnterpriseHeroCarousel (Framer Motion) |
| `prefers-reduced-motion` respected | ✅ | HomeDashboard + section CSS + Hero |

**PO BAT:** Confirm motion feels premium, not noisy; pause autoplay behaviour acceptable.

---

### 3.4 Loading — ✅ PASS (engineering)

| Check | Result | Evidence |
|-------|--------|----------|
| Dark shimmer (no white flash) | ✅ | `HomeLoadingExperience` (CO-WP-103.14) |
| Skeleton mirrors live structure | ✅ | Greeting → Search → Hero → Actions → … → Feed |
| Loading gap / radii align with tokens | ✅ | CO-WP-103.18 / 103.19 token alignment |

**PO BAT:** Cold start on mid-tier Android — no white flicker, no layout jump after hydrate.

---

### 3.5 Empty states — ✅ PASS (engineering)

| Check | Result | Evidence |
|-------|--------|----------|
| Enterprise empty DTO catalog | ✅ | Partner Home `emptyStates` |
| Illustration · message · CTA pattern | ✅ | `EnterpriseEmptyState` (CO-WP-103.15) |
| Wired surfaces | ✅ | Actions · Highlights · My Business · Feed · Notifications · Hero empty |
| Companion does not invent empty copy | ✅ | Renders Enterprise DTO only |

**PO BAT:** Force empty catalogues (or hide seed) and confirm tone remains encouraging, not dead-end.

---

### 3.6 Dark theme — ✅ PASS (engineering)

| Check | Result | Evidence |
|-------|--------|----------|
| Canvas / elevated surfaces | ✅ | `--home-canvas`, `--home-surface-elevated` |
| Ink contrast (strong / muted / soft) | ✅ | Token ink scale |
| Cards readable on dark gradients | ✅ | Theme gradients + icon wells |
| Overlays (Search · Notifications) dark premium | ✅ | Global Search sheet · Notification panel |

**PO BAT:** Outdoor / low-brightness readability on device.

---

### 3.7 Hero Carousel quality — ✅ PASS (engineering)

| Check | Result | Evidence |
|-------|--------|----------|
| Flagship visual excellence | ✅ | CO-WP-103.16 |
| Peek / swipe / dots / CTA | ✅ | Carousel behaviour intact |
| Experience governance (schedule · priority · deep link) | ✅ | CO-WP-103.20 |
| Empty hero package | ✅ | `heroEmptyState` |
| Mobile height / CTA width on narrow phones | ✅ | CO-WP-103.19 |

**PO BAT:** Swipe feel, CTA hit target, badge/title wrap, autoplay timing.

---

### 3.8 Card quality — ✅ PASS (engineering)

| Surface | Quality | Notes |
|---------|---------|-------|
| Recommended Actions | ✅ | Square action tiles · large touch · themed gradients |
| Today’s Highlights | ✅ | Horizontal narrative cards |
| My Business Today | ✅ | Quick-glance chips (counts Enterprise-owned) |
| Business Feed | ✅ | Elevated list cards · feed last |
| Visiting Card | ✅ | Identity · QR projection · governed actions |
| Saarthi | ✅ | Compact advisory strip · EE deep link |
| Personalisation | ✅ | Display serif titles · EE tokens resolved server-side |

**PO BAT:** Visual balance of horizontal scrollers; last-card peek; no clipped shadows.

---

### 3.9 Enterprise readiness — ✅ PASS with known follow-ups

| Check | Result | Notes |
|-------|--------|-------|
| Presentation-only companion | ✅ | No local content SSOT |
| Partner Home API DTO mirror | ✅ | WP types mirror Catalyst One gateway |
| Experience governance fields | ✅ | Visibility · Priority · Audience · Schedule · Deep Links · PersonalisationKey (CO-WP-103.20) |
| Resolve in Catalyst One | ✅ | `experience-resolve.ts` + `partnerHomeService` |
| Companion does not invent deep links | ✅ | Missing link → non-interactive |
| Seed Experience Engine still temporary | ⚠️ | Admin/DB Experience Engine future — seed catalogue is current SSOT |
| My Business counts | ⚠️ | Honest zeros until partner work queues wired |
| Visibility rule engine | ⚠️ | Rules projected; satisfied-rule set empty until EE rule engine populates |
| Greeting salutation | ⚠️ | Uses **device local time** (`GreetingExperience`), not `greeting.salutation` from API — intentional companion UX; PO to confirm |
| Profile avatar route | ⚠️ | Hardcoded companion route `/app/profile` on avatar Link (chrome navigation, not Experience package) |

None of the ⚠️ items block **engineering readiness**. They must be acknowledged in Product Owner BAT / certification notes.

---

### 3.10 Zero visual regressions — ✅ ENGINEERING / ⏳ PO BAT

| Check | Result |
|-------|--------|
| TypeScript + production build | ✅ `tsc -b && vite build` (2026-08-02) |
| Token-driven consistency after 103.18–103.20 | ✅ No known CSS break from certification prep (docs-only sprint) |
| Device visual regression suite | ⏳ **Product Owner / BAT** on physical Android |

Engineering cannot self-certify “zero visual regressions” without device BAT. Build is green; visual sign-off is PO-owned.

---

## 4. Micro-sprint trail (Home programme)

| Sprint | Theme | Version (approx) |
|--------|-------|------------------|
| CO-WP-103 / 103A / 103B | Home foundation · UX constitution | — |
| CO-WP-103.2 / 103.2A / 103.16 | Hero Carousel excellence | — |
| CO-WP-103.3–103.10 | Actions · Highlights · Feed · Visiting · Saarthi · My Business | — |
| CO-WP-103.11–103.15 | Notifications · Search · Personalisation · Loading · Empty | — |
| CO-WP-103.5A | Feed last hierarchy | — |
| CO-WP-103.17 | Motion system | 0.4.12 |
| CO-WP-103.18 | Design system consistency | 0.4.13 |
| CO-WP-103.19 | Mobile responsiveness (Android-first) | 0.4.14 |
| CO-WP-103.20 | Enterprise Experience Integration | **0.4.15** |
| **CO-WP-103.21** | **Home Certification Preparation (this report)** | Docs / review only |

---

## 5. BAT script (Product Owner)

Use BAT account when live environment is available (not required for this offline report):

1. Open Home on Android phone (360–412dp preferred).  
2. Cold start → confirm dark loading, then full hierarchy.  
3. Scan top → bottom: Greeting → Personalisation → Search → Hero → Actions → Highlights → My Business → Visiting → Saarthi → Feed.  
4. Exercise Hero swipe, CTA, dots.  
5. Open Notifications; open Global Search; navigate a deep link.  
6. Confirm empty-state tone if any section empty.  
7. Confirm no horizontal page overflow; horizontal section scroll feels natural.  
8. Confirm no CRM/MIS KPI widgets.  
9. Apply **Morning test**.

---

## 6. Product Owner decision block

> Complete only after BAT. Engineering must not mark Home Certified.

| Decision | Select one |
|----------|------------|
| ✅ **Home Certified** — CO-WP-103 closed; CO-WP-104 may be scheduled later | ☐ |
| 🟡 **Conditionally ready** — list BAT defects below; re-review required | ☐ |
| 🔴 **Not ready** — Home returns to remediation; CO-WP-104 remains blocked | ☐ |

**Product Owner name:** _______________________  
**Date:** _______________________  
**Signature / confirmation:** _______________________

### BAT defects / notes

```
(PO only)



```

---

## 7. Gate statement

1. **CO-WP-103.21** = certification **preparation** only — no new Home features, no deploy.  
2. Home remains **Awaiting Product Owner Module Certification** under **CO-WP-DEVELOPMENT-MODE-003**.  
3. **Business module is ON HOLD** per **CO-WP-ARCHITECTURE-UPDATE-001** — not the automatic next engineering priority.  
4. **Enterprise Experience Engine (EEE)** — architecture design pending in Catalyst One; **DO NOT IMPLEMENT** until Product Owner authorises.  
5. Cadence after Home certification: **Freeze → Deployment (PO-approved)**; next implementation phase only after PO instructions (EEE design before Business).  
6. Engineering shall not treat this report as Product Owner Certification.

---

## 8. Final status (Engineering)

```
Home Certification Preparation: COMPLETE
Engineering readiness:          READY FOR PRODUCT OWNER REVIEW
Product Owner certification:    AWAITING REVIEW
Deploy:                         NOT PERFORMED
CO-WP-104:                      BLOCKED
```

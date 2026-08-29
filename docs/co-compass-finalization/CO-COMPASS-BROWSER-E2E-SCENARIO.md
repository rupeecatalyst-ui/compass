# COMPASS Browser E2E Scenario Pack — Staging

**Scenario ID:** `CO-COMPASS-BROWSER-E2E-001`  
**Status:** Prepared — **do not run against production**  
**Target:** Staging Vercel deployment after gateway secrets and master-data checklist are complete.

---

## Preconditions

- Staging `COMPASS` URL (customer site) and `Catalyst One` gateway URL configured
- `COMPASS_GATEWAY_API_KEY` + `COMPASS_JOURNEY_SESSION_SECRET` set on both sides
- Staging configuration checklist (`CO-COMPASS-STAGING-CONFIGURATION-CHECKLIST.md`) reviewed
- Synthetic test mobile numbers only — never production customer data

---

## Viewports

| Profile | Dimensions | Notes |
|---------|------------|-------|
| Desktop | 1440×900 | Primary review |
| Android / PWA | 390×844 | PWA install prompt, `mobile-file-input` capture |
| iPhone / Add to Home Screen | 393×852 | Safari standalone guidance, safe-area chrome |

---

## Scenario A — New Home Loan (Fresh)

1. Open `/personal-loan` or canonical HL entry → start Home Loan journey
2. Accept consent → enter synthetic mobile + city
3. Complete IDC fields (loan amount, property, income, employment)
4. **Reload page** — session continuity via journey token / resume path
5. Analyze — observe Chanakya recommendations (`ready` or truthful `pending`)
6. Advantage — `not_available` or configured indicative amount (no COMPASS-local math)
7. LOD — checklist renders from enterprise projection; empty state if unconfigured
8. **Document-wise upload** — camera/gallery PDF or image (mobile viewport)
9. **Folder / multi-file upload** — where UI supports relative paths
10. Review + consent declarations
11. Submit → confirmation with `OPP-` reference
12. Repeat submit — idempotent message, no duplicate reference churn
13. **Accessibility** — modal focus trap, consent controls keyboard reachable
14. **Back / close / resume** — no data loss on intentional exit and return

---

## Scenario B — Home Loan Balance Transfer

Repeat Scenario A with:

- `home-loan-balance-transfer` product entry
- BT fields: current lender, outstanding loan amount
- Separate opportunity reference from Scenario A (same mobile allowed only if lifecycle permits — prefer distinct mobile)
- Verify `HOME_LOAN_BT` product label and BT transaction type in review

---

## Negative paths (browser)

| Case | Expected |
|------|----------|
| Unsupported file (`.exe`) | Inline or API error; no success toast |
| Missing consent on submit | Blocked with clear message |
| Post-submit new start | Active-application guard message |

---

## PWA-specific (Android / iOS)

- Manifest + service worker register without console errors
- Install prompt / Add to Home Screen guidance visible where configured
- Offline shell shows `offline.html` when network unavailable (no false journey success)

---

## Evidence to capture

- Screenshots per step (desktop + one mobile viewport per journey)
- Network tab: all `/api/journey/*` or gateway calls return enterprise DTO sources
- Submitted opportunity reference recorded for Catalyst One registry verification (employee auth — BAT account only)

---

## Related API scenario

Isolated API E2E (`scripts/co-compass-e2e-full.mjs`) must pass before browser staging run is considered authoritative for backend boundaries.

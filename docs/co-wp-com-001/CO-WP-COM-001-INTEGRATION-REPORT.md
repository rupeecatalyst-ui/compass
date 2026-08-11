# CO-WP-COM-001 — Wealth Partner Commercials, Earnings & Performance

**Status:** DEVELOPMENT COMPLETE · Ready for BAT  
**Deploy:** **NOT performed**  
**Date:** 2026-08-10

---

## Objective

Partner-facing commercials and performance using **Catalyst One as SSOT**.  
The Partner App **does not** calculate commission splits, partner/company/CA shares, or payout eligibility.

---

## Constitutional Health Check

| Principle | Result |
|-----------|--------|
| No Partner commission engine | GREEN |
| Commercial terms from WPR profile | GREEN |
| Earnings only if C1-authored | GREEN — honest empty otherwise |
| Performance targets from C1 profile | GREEN — no hardcoded thresholds |
| Partner isolation | GREEN — binding + owned Opportunities |
| Module entitlements | GREEN — `commercials` / `performance` |
| Single Implementation (metrics) | GREEN — reuse WPR + ownership inventory |

**CHC: GREEN**

---

## Delivered

### Catalyst One Partner Gateway

| Endpoint | Projects |
|----------|----------|
| `GET /api/partner/commercials` | Commercial share % by role · commission structures · earnings (if projected) · transaction commercial stamps · period earnings (if projected) |
| `GET /api/partner/performance` | Target · achievement · pipeline counts · product mix · business volume · conversion (if projected) · period comparison (if projected) |

Services:
- `server/services/partner-gateway/partner-commercials.service.ts`
- `server/services/partner-gateway/partner-performance.service.ts`

Entitlements: module keys `commercials` and `performance` (default visible; Gateway 403 when false).

### Wealth Partner App

- Commercials and Performance desks load Gateway DTOs only
- Module-gated nav + honest empties when data or entitlement missing
- No local commission formulas

---

## What is intentionally Not Specified

Until Catalyst One authors values on the Wealth Partner commercial profile / `profileJson`:

- MTD / pending / paid earnings
- Period-wise earnings arrays
- Per-opportunity payout status map
- Conversion % and period comparison amounts

Pipeline open/closed counts and product mix shares are **inventory projections** of Opportunities the partner sourced — not a second scoring engine.

---

## Verification

```bash
# Catalyst One
npm run verify:co-wp-com-001
npx tsc --noEmit

# Wealth Partner App
npm run verify:co-wp-com-001
npm run lint
npm run build
```

Prove in BAT:

- [ ] Commercial share labels match WPR Commercial Profile
- [ ] Structure rates match WPR commission records (display only)
- [ ] Cross-partner token cannot see another partner’s desk
- [ ] Module denied → 403 + WP honest empty
- [ ] Empty earnings when profile has no commission fields

---

## Final status

🟡 **Development complete · Not deployed · Ready for BAT**

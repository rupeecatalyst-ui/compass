# CO-WP-OPP-REFINEMENT-001 — Opportunity Registry Wealth Partner Source Selection

**Status:** Implementation complete · **No Vercel deploy** · Awaiting Product Owner approval  
**Date:** 2026-08-11

---

## 1. Root cause

When Business Source = Wealth Partner, Source Name was restricted by **two** Active-only gates:

1. **API query** — `wealthPartnerApiClient.queryPartners({ status: "active" })` filtered `RegistryStatus = active` only (excluded Registry `draft` rows).
2. **Selectability** — `resolveWealthPartnerOpportunitySelectability` returned `not_selectable` for any lifecycle other than `active`, so **Draft** and **Onboarding** partners never appeared even when returned by the API.

Payout was already separate (`commercialStatus` via `resolveCommercialRevenueSharePercent`) and was not the cause of the lookup restriction.

---

## 2. Existing Registry statuses discovered

### Lifecycle (`WealthPartnerLifecycleStatus`) — canonical business lifecycle

| Value | Role |
|-------|------|
| `draft` | Pre-activation registration |
| `onboarding` | Registration in progress (Prisma default on create) |
| `active` | Activated |
| `suspended` | Non-operational terminal for sourcing |
| `retired` | Terminal / permanently out of sourcing |

### Operational (`WealthPartnerOperationalStatus`)

`inactive` | `active` | `restricted`

### Registry row status (`RegistryStatus`)

`draft` | `active` | `inactive` | `archived`

Plus soft-delete: `isDeleted` (already excluded by list API).

**No new statuses invented.** There is no separate “Rejected” lifecycle; rejected sits on `approvalStatus` where used elsewhere. Terminal sourcing exclusions use existing `suspended` / `retired` / `inactive` / `archived` / `enabled: false` / agreement expired|suspended.

---

## 3. Source selection rule implemented

**Include (Opportunity Source Name):**

- Lifecycle: **Draft**, **Onboarding**, **Active**
- Registry status: not `inactive` / not `archived`
- `enabled: true`
- Not soft-deleted (API default)
- Agreement not `expired` / not `suspended`
- Operational not `inactive`

**Exclude:**

- Lifecycle: **Suspended**, **Retired**
- Registry: **inactive**, **archived**
- Disabled partners
- Agreement expired / suspended (existing CO-WP-007 rule unchanged)

**Display:** Sublabel leads with Registry lifecycle terminology, e.g. `Draft · WPT… · DSA`.

**Persistence:** Unchanged — `sourceWealthPartnerId` = Registry id; display name denormalized; no free-text Partner master.

**Payout:** Unchanged — share resolve still requires `commercialStatus === "active"`; no lifecycle shortcut for payout.

---

## 4. Files changed

| File | Change |
|------|--------|
| `src/lib/enterprise-wealth-partner-legal-docket/compose.ts` | Allow draft/onboarding selectable; exclude retired/archived/inactive/disabled |
| `src/components/catalyst-one/lead-information/business-source-contact-lookup.tsx` | Drop `status: "active"`; show lifecycle label; pass registry status into selectability |
| `src/constants/enterprise-wealth-partner-registry/index.ts` | Lifecycle labels + source-eligibility helpers |
| `scripts/co-wp-opp-refinement-001-verify.mjs` | Verification A–M (static + selectability matrix) |
| `docs/co-wp-opp-refinement-001/CO-WP-OPP-REFINEMENT-001-REPORT.md` | This report |

---

## 5. Payout protection verification

| Check | Result |
|-------|--------|
| `resolveCommercialRevenueSharePercent` still gates on `commercialStatus === "active"` | ✅ Unchanged |
| No `lifecycleStatus` in commercial participation module | ✅ |
| Opportunity service still loads `commercialStatus` for share snapshot | ✅ |
| Draft/Onboarding selectability message explicitly notes payout remains subject to commercial/KYC | ✅ |
| Commission Engine / payout engine code not modified | ✅ |

---

## 6. Test results

| Suite | Result |
|-------|--------|
| `node --import tsx scripts/co-wp-opp-refinement-001-verify.mjs` | ✅ PASS (A–J matrix + SSOT checks) |
| `node scripts/co-wp-007-verify.mjs` | ✅ PASS |
| TypeScript `tsc --noEmit` | ✅ |
| ESLint (changed files) | ✅ |
| Production `npm run build` | ✅ PASS |
| Deploy | ❌ Not performed |
| Production data | ❌ Not modified |

Verification coverage:

- A–C Draft / Onboarding / Active → selectable  
- D Suspended / Retired / archived / inactive / disabled / expired → not selectable  
- E–I Draft/Onboarding/Active sourcing allowed (selectability)  
- J Payout commercialStatus-only  
- K Historical refs untouched (no migration)  
- L–M Registry id SSOT; no duplicate partner create path

---

## 7–9. TypeScript / Lint / Build

| Gate | Status |
|------|--------|
| TypeScript | ✅ |
| Lint | ✅ |
| Build | ✅ |

---

## STOP

Awaiting Product Owner approval. **No Vercel deployment.**

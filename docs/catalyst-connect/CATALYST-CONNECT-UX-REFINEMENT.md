# Catalyst Connect — UX Refinement (CO-WP-UX-001)

Status: **Implementation complete (local)** · Presentation only · No business-rule changes  
BAT: Authorised under CO-WP-BAT-005 Connect constitution exception · **No deploy** unless Product Owner asks

## Objective

Deliver a consistent premium fintech experience for Wealth Partners across navigation, loading, empty, success, errors, responsive layout, touch, typography, colour, accessibility, and motion — without altering enterprise business rules or Partner Gateway contracts.

## Shared presentation layer

| Concern | Path |
|--------|------|
| Tokens / motion / touch / a11y | `web/src/styles/ux-refinement.css` (imported from `global.css`) |
| Loading | `UxLoadingBlock` |
| Error | `UxErrorCard` |
| Empty | `UxEmptyState` (+ existing `PremiumEmptyState` / enterprise empty DTOs) |
| Success | `UxSuccessToast` |

## Surfaces refined

- App shell bootstrap + sticky top bar / blurred bottom nav
- Home (Command Center) error presentation
- Notification Center (loading / error / empty)
- Identity Module (loading / error / copy success toast)
- My Business pipeline
- Opportunity Workspace + Create Opportunity journey loading
- Customer directory + Customer Workspace
- Enterprise empty-state routes

## Hard boundaries (unchanged)

- Catalyst One remains SSOT for business data, LOD, recommendations, identity branding, notifications projection, and metrics.
- Connect remains a **presentation projection** — no parallel formulas, workflows, or local profile/branding ownership.
- Enterprise empty / unavailable copy continues to come from Partner Gateway DTOs where projected.

## Verification

```bash
cd "C:\Wealth Partner App\web"
npm run build
```

Deploy only when Product Owner explicitly requests.

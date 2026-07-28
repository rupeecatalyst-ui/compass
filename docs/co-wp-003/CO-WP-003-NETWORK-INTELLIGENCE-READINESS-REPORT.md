# CO-WP-003 — Enterprise Wealth Partner Network Intelligence

## Scope

Replace the list-first Network tab with an interactive Business Network over existing Wealth Partner relationship records.

## Safety

- No Contact / Company / Opportunity / Deal writes
- No Commission Engine changes
- No routing changes
- No production data migration
- Additive API + UI only

## Delivery

| Layer | Path |
|-------|------|
| Compose | `server/services/wealth-partner-registry/network-intelligence.service.ts` |
| API | `GET /api/wealth-partner-registry/partners/:id/network-intelligence` |
| Client | `wealthPartnerApiClient.getNetworkIntelligence` |
| UI | `wealth-partner-network-intelligence.tsx` (Network tab) |

## Capabilities

- Root Wealth Partner node with expandable hierarchy (linked WP networks recurse)
- Node metrics: name, relationship, status/health, volume, opportunities, deals, conversion, last activity
- Bottom-up roll-up (includes descendants)
- Summary cards + period/product/branch/region/type filters
- Click → Contact / Company / Wealth Partner workspace
- Add Network Member form retained; ledger collapsed under details

## Commission Payable

Read-only sum of Deal `revenueReceived` in filtered scope. Does **not** call or modify Commission Engine.

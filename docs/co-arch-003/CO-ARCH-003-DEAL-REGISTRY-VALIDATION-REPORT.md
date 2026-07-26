# CO-ARCH-003 — Deal Registry Validation Report

**Status:** Validation complete (no rebuild)  
**Date:** 2026-07-24  
**Surface:** My Deals (`/my-deals`) = Enterprise Deal Registry

---

## Verdict

Deal Registry **exists and is operational**. Do **not** rebuild.

BAT visibility gaps found and classified below. Minimal visibility fixes applied in the same sprint are listed under **Fixes applied**. Remaining items stay deferred.

---

## What works

| Check | Result |
|-------|--------|
| Route `/my-deals` | ✅ Operational Deal Registry |
| Primary nav entry | ✅ “My Deals” |
| SSOT when Port / Prisma ON | ✅ `GET /api/enterprise-deals` |
| Deal Reference Number | ✅ Column “Deal ID” = `dealNumber` |
| Customer Name | ✅ “Borrower Name” |
| Deal Stage | ✅ “Gross Stage” (+ Sub Stage) |
| Lender | ✅ “Selected Lender” |
| Remount / navigate refresh after Deal write | ✅ Fresh API list |

---

## Inconsistencies (before fixes)

| # | Issue | Impact on BAT |
|---|--------|---------------|
| D1 | My Deals listened to `storage` only — **not** `compass:loan-files-updated` | Same-tab: new Deal may not appear until remount/navigate |
| D2 | `opportunityNumber` on API row mapped from `opportunityId` (UUID) | Opportunity relationship not human-readable |
| D3 | No Opportunity column in Deal Registry table | Cannot verify Opp↔Deal link on the grid |
| D4 | Row click opens `/credit-bench` (Opportunity Workspace), not Loan Workspace | BAT “Open Deal Workspace” does not match current open path |
| D5 | Opportunity-only create (no `lenderRegistryId`) never creates a Deal row | Expected: Deal Registry shows **Deals only** (BI-3). Opportunities belong in Opportunity Registry |
| D6 | Hard pageSize 100 | Fine for BAT; watch at scale |

---

## Fixes applied (visibility only — not a rebuild)

1. **D1** — Subscribe to `subscribeLoanFilesUpdated` so Deal Registry refreshes in the same tab after create.
2. **D2 / D3** — Include `opportunity.opportunityNumber` on Deal search serialize; map correctly; show **Opportunity** column.
3. **D4** — **Deferred** (documented). Open path remains `/credit-bench` until a dedicated Deal Workspace open decision is certified. Do not change Loan Journey in this sprint.
4. **D5** — By design. BAT step 3 verifies Opportunity Registry; step 5 verifies Deal Registry only after a real Deal (with lender) is created.

---

## BAT guidance (Deal Registry)

1. Create Contact → Start Journey → confirm Opportunity in **My Opportunities**.
2. Create Deal with a resolved Enterprise Lender (registry id present).
3. Open **My Deals** — Deal ID, borrower, stage, lender, and Opportunity number must appear (Refresh if needed).
4. Row open currently → Opportunity Workspace (`/credit-bench`) — note D4 until certified change.

---

## Key files

- `src/app/(dashboard)/my-deals/page.tsx`
- `src/components/catalyst-one/my-deals/my-deals-workspace.tsx`
- `src/components/catalyst-one/my-deals/deal-registry-table.tsx`
- `src/lib/enterprise-deal/deal-registry-port.ts`
- `src/lib/enterprise-deal/map-deal-to-registry-row.ts`
- `src/app/api/enterprise-deals/route.ts`

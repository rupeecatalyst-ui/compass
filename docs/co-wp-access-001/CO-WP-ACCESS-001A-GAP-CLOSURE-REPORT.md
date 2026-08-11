# CO-WP-ACCESS-001A — Wealth Partner Access & Entitlements Gap Closure

**Status:** Development gap closure complete — awaiting Product Owner certification instruction  
**NOT** production certified · **NOT** deployed to Vercel

Closes the four deferred items from CO-WP-ACCESS-001.

---

## A. Ownership path completed

```
Enterprise Opportunity / Deal
  → Opportunity.sourceWealthPartnerId
  → Partner Gateway partnerOwnershipService.requireOwnedOpportunity / requireOwnedDeal
  → effective entitlement assert
  → Partner App visibility
```

- Production authorization no longer depends on the placeholder Partner Business store.
- Placeholder store may still enrich Opportunity DTO projection after ownership is proven.
- Partner Opportunity create now persists to Opportunity Registry with `sourceWealthPartnerId`.
- Deal ownership = Deal → Opportunity.sourceWealthPartnerId (no parallel Deal ownership field; additive join only).

## B. Deal API completed

| Method | Route | Entitlement |
|--------|-------|-------------|
| GET | `/api/partner/deals` | view + owned |
| GET | `/api/partner/deals/:dealId` | view + owned |
| PATCH | `/api/partner/deals/:dealId` | edit + owned |
| POST | `/api/partner/deals/:dealId/stage` | stage_change + owned |
| GET/POST | `/api/partner/deals/:dealId/activities` | view / activity_add + owned |

Unauthorized → **403**. Forged partner IDs rejected.

## C. Partner App entitlement wiring completed

Wealth Partner App (`C:\Wealth Partner App\web`):

- `partner-entitlements.ts` — consume Gateway projections (default-deny)
- Session + Opportunity detail types carry `entitlements`
- UI gates: Save Draft / Save & Exit (edit), Add Note → activities API (`activity_add`), Upload (document_*), Create Opportunity (`create`)
- No hardcoded Referral/Joint/Solo permission matrices in React

## D. Migration status by environment

Migration (additive, no reset):  
`prisma/migrations/20260809120000_co_wp_access_001_partner_entitlements/`

| Environment | Status |
|-------------|--------|
| Local (this machine / linked Postgres) | ✅ `prisma migrate deploy` applied `20260809120000_co_wp_access_001_partner_entitlements` · `prisma generate` OK · persistence smoke: 3 templates + audit rows |
| Shared / Vercel | **Not applied by this sprint** (no deploy). Apply with migrate deploy when PO authorizes environment cutover |

Does **not** drop tables or seed demo data. Template seed remains admin/runtime `ensureSystemTemplates` (idempotent).

## E. End-to-end test results

Automated development verify: `npm run verify:co-wp-access-001a` ✅  
Persistence smoke: templates + audits durable ✅  

Controlled live partner/transaction HTTP BAT against Partner Gateway + Wealth Partner App UI is **deferred to Product Owner certification** (this sprint: no Vercel deploy).

## F. Cross-partner security results

Server-side: `requireOwnedOpportunity` / `requireOwnedDeal` require `sourceWealthPartnerId === token partner`. Cross-partner ID manipulation → **403**.  
Static verify confirms ownership helpers and Deal gate. Live two-partner HTTP BAT deferred to certification.

## G. Files changed (primary)

**Catalyst One**

- `server/services/partner-gateway/partner-ownership.service.ts` (new)
- `server/services/partner-gateway/partner-deal.service.ts` (new)
- `server/services/partner-gateway/partner-business.service.ts` (ownership + Registry create + Business Notes)
- `src/app/api/partner/deals/**` (new)
- `server/repositories/enterprise-opportunity/enterprise-opportunity.repository.ts` (`sourceWealthPartnerId` search)
- `scripts/co-wp-access-001a-verify.mjs` · `scripts/co-wp-access-001a-persistence-smoke.mjs`
- this report

**Wealth Partner App**

- `src/lib/partner-entitlements.ts`
- `src/lib/enterprise-api.ts` / `use-partner-business.ts`
- Opportunity detail / overview / documents / create screens

## H. Database changes

No new migration beyond CO-WP-ACCESS-001 entitlement tables. Ownership uses existing `enterprise_opportunities.source_wealth_partner_id`.

## I. API changes

Partner Deal surface (above). Opportunity create/list/get/patch/submit/docs/activity now ownership-gated via Registry. Activity writes Enterprise Business Notes → EAR.

## J. Verification results

| Check | Result |
|-------|--------|
| `prisma migrate deploy` (local) | ✅ Applied entitlement migration |
| `prisma generate` | ✅ |
| Template/audit persistence smoke | ✅ 3 system templates · audits written |
| `npm run verify:co-wp-access-001a` | ✅ |
| TypeScript (`tsc --noEmit`) | ✅ |
| Vercel deploy | ⏸️ Not performed (per PO) |
| Production certification | ⏸️ Not claimed |

---

## STOP

Gap closure complete for Product Owner review.  
Do **not** treat as Production Certified. Await separate certification instruction.
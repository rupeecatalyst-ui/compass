# CO-WP-ACCESS-001 — Wealth Partner Access & Entitlements

**Status:** Development complete — awaiting Product Owner review  
**NOT** production certified · **NOT** deployed to Vercel · BAT not claimed

---

## A. Architecture implemented

```
Catalyst One (entitlement SSOT + Admin)
        ↓
Partner Gateway (auth · partner identity · ownership · effective entitlement)
        ↓
Wealth Partner App (presentation only)
```

- Configurable templates: Referral / Joint Execution / Solo  
- Partner-level profiles + transaction overrides  
- Persistent audit  
- Gateway enforcement on Opportunity view/create/edit/stage/document/activity  

## B. Files changed (primary)

- `prisma/schema.prisma` + migration `20260809120000_co_wp_access_001_partner_entitlements`
- `src/constants/enterprise-partner-entitlements/`
- `src/types/enterprise-partner-entitlements.ts`
- `src/lib/enterprise-partner-entitlements/`
- `server/services/partner-entitlements/`
- `server/services/partner-gateway/partner-entitlement-gate.ts`
- `server/services/partner-gateway/partner-business.service.ts` (enforcement + activity)
- `server/services/partner-gateway/partner-auth.service.ts` (session entitlements)
- `src/lib/api/partner-route-utils.ts`
- `src/app/api/admin/partner-entitlements/route.ts`
- `src/app/api/partner/opportunities/[opportunityId]/activities/route.ts` (POST)
- `src/app/(dashboard)/admin/partner-entitlements/page.tsx`
- `src/components/catalyst-one/admin/partner-entitlements/partner-entitlements-admin-panel.tsx`
- Routes / navigation / administration console
- `.cursor/rules/enterprise-partner-entitlements.mdc`
- `scripts/co-wp-access-001-verify.mjs`

## C. Database / migration

Tables:

- `partner_entitlement_templates`
- `partner_entitlement_profiles`
- `partner_transaction_entitlements`
- `partner_entitlement_audits`

**Manual step required before runtime DB use:** apply migration (`prisma migrate deploy` / approved migration process) and `prisma generate`.

## D. APIs created / modified

| API | Change |
|-----|--------|
| `GET/POST /api/admin/partner-entitlements` | New admin CRUD / resolve / audit |
| `GET /api/partner/auth/me` | Session includes partner-level `entitlements` |
| Partner opportunity GET/PATCH/POST/submit/documents | Entitlement asserts |
| `POST /api/partner/opportunities/:id/activities` | Activity/Notepad (ACTIVITY_ADD) |

## E. Catalyst One admin UI

Route: `/admin/partner-entitlements`  
Select partner · template · capabilities · effective rights · transaction overrides · audit history

## F. Entitlement model

Actions: `view` · `create` · `edit` · `stage_change` · `document_upload` · `document_edit` · `activity_add`  
Modules (presentation flags): home · business · customers · documents · saarthi · notifications · private

## G. Template model

System-seeded (editable): `REFERRAL_PARTNER` · `JOINT_EXECUTION_PARTNER` · `SOLO_PARTNER`

## H. Effective-permission resolution

1. Template defaults for execution mode  
2. Partner profile overlay  
3. Transaction override (mode + partial permissions)

Pure function: `resolveEffectiveEntitlements`  
Runtime: `partnerEntitlementsService.resolveForPartner` / `assertEntitlement`

## I. Referral behaviour

Default: View + Create + Activity · Edit / Stage / Documents **denied** unless explicitly granted

## J. Joint Execution behaviour

Configurable; seed defaults grant broad execution rights — must still be represented explicitly on profile

## K. Solo behaviour

Configurable; seed grants execution rights except `document_edit` by default — still subject to entitlements + enterprise workflow

## L. Transaction override behaviour

Per `(wealthPartnerId, entityKind, entityId)` row; overlays partner defaults; stored in Catalyst One — no parallel partner DB

## M. Partner Gateway enforcement

`assertPartnerAction` on business mutations; `assertTokenPartnerIdentity` rejects forged partner IDs; unauthorized → **403**

## N. Activity / Notepad behaviour

`ACTIVITY_ADD` independent of `EDIT`; stamps author · partner · timestamp · entity; uses opportunity activity / note projection (no partner-only activity store)

## O. Audit behaviour

Every template / profile / override write → `PartnerEntitlementAudit` (who · partner · previous · new · reason · timestamp)

## P. Security test results

Covered by `npm run verify:co-wp-access-001` (resolve + static enforcement markers). Live cross-partner HTTP BAT deferred to certification.

## Q–T. Verification

| Check | Result |
|-------|--------|
| Q. TypeScript (`tsc --noEmit`) | ✅ Pass |
| R. Lint (entitlement surfaces) | ✅ Pass |
| S. Build (`npm run build`) | ✅ Pass |
| T. `npm run verify:co-wp-access-001` | ✅ Pass |

## U. Limitations / deferred

- Partner Business still uses placeholder opportunity store (ownership via partner-scoped store); enterprise Opportunity Registry `sourceWealthPartnerId` ownership hardening remains a follow-on when Registry is Partner Gateway SSOT  
- Deal-level Partner APIs not fully present — override model supports `deal` entityKind for future  
- Wealth Partner App UI consumption of `entitlements` projection is presentation follow-on (Gateway already returns effective maps)  
- Migration must be applied to each environment before admin/runtime DB paths  
- **Not deployed · Not production certified**

---

## STOP

Development sprint complete. Awaiting separate Product Owner review / certification.  
Do **not** treat this as Production Certified.

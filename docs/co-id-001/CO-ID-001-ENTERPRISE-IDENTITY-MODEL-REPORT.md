# CO-ID-001 — Enterprise Identity Model & Contact Registry SSOT Enforcement

**Status:** Implementation Complete (code) · **No migrate** · **No deploy** · **No live-data mutation**  
**Date:** 2026-07-29

## 1. Files Modified / Created

| Path | Change |
|------|--------|
| `src/constants/enterprise-identity-model/index.ts` | Frozen principles + business role catalogue + WP onboard copy |
| `src/types/enterprise-identity-model.ts` | Role assignment types |
| `src/lib/enterprise-identity-model/index.ts` | Derive Contact roles; merge partner role |
| `.cursor/rules/enterprise-identity-model.mdc` | Constitutional freeze |
| `.cursor/rules/enterprise-wealth-partner.mdc` | Onboard-from-Contact rule |
| `server/services/ecm/contact.service.ts` | `roleProfiles` + `assignPartnerRoleForWealthPartner` |
| `server/services/wealth-partner-registry/wealth-partner-registry.service.ts` | Assign partner role on WP create + audit |
| `src/app/api/ecm/contacts/[contactId]/route.ts` | Accept `roleProfiles` on PATCH |
| `src/components/.../create-wealth-partner-wizard.tsx` | Onboard Wealth Partner UX; Create Contact returns to wizard |
| `src/components/.../wealth-partner-registry-view.tsx` | CTA rename |
| `src/components/.../progressive-contact-create-modal.tsx` | `identityIntent` for WP onboarding |
| `src/components/.../contact-identity-roles-section.tsx` | Contact Profile Roles table |
| `src/components/.../contact-workspace-modal.tsx` | Mount Roles section |
| `scripts/co-id-001-verify.mjs` | Static verify |

## 2. Architecture Changes

- Contact Registry = only Person identity creation point (Company Registry for orgs).
- Wealth Partner Registry = commercial / KYC / commission module extending Contact.
- Onboard flow: Search Contact → optional Create Contact (ECM) → Create WP Profile → additive `partner` role.
- Contact Profile shows enterprise business roles (assigned / not assigned / reserved).
- Duplicate conversion continues to use CO-WP-006 Open Existing panel.

## 3. Identity Model Summary

```text
Contact (SSOT)
  ├─ Customer (ECM customer)
  ├─ Wealth Partner (ECM partner + WP profile)
  ├─ Employee (ECM employee)
  ├─ Lender Contact (ECM lender_employee)
  ├─ Director / Authorised Signatory (company relations)
  ├─ Guarantor (journey projection)
  └─ Vendor (reserved — future registry extends Contact)
```

## 4. Regression Report

| Area | Expectation |
|------|-------------|
| Existing WPs | Continue; partner role stamped on new creates |
| Existing Customers | Unaffected |
| WP search | Still Contact/Company registry search |
| Duplicate convert | CO-WP-006 panel preserved |
| Migrations | None |
| Deploy | None |

## 5. Verify

```bash
npm run verify:co-id-001
```

## Change-control attestation

| Action | Done? |
|--------|-------|
| Live data modified | No |
| Migrations executed | No |
| Vercel deploy | No |

---

*End of CO-ID-001 report*

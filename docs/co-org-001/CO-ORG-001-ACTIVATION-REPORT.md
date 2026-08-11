# CO-ORG-001 — Organization Workspace Activation Report

**Sprint:** CO-ORG-001  
**Status:** UI activation complete · Ready for Product Owner review (not Certified)  
**Date:** 2026-08-07

---

## 1. Root Cause Analysis

Organization Workspace screens were implemented as **presentation-only demos** backed by seed data under `src/data/catalyst-one/organization/`. Forms showed a “saved locally (demo mode)” message, document registries wrote to browser `localStorage`, and new configuration surfaces (business config, settings, security) had no routes or UI.

The **durable backend** (Prisma models, REST APIs, `organizationWorkspaceApi`, API-backed `hydrateOrgDocumentsRegistry`) was delivered in CO-ORG-001 Phase A but **not connected** to the existing Organization shells. Users could not persist company profile, directors, bank accounts, signatures, seal, or documents against Postgres even when `ENTERPRISE_PERSISTENCE_MODE=prisma`.

---

## 2. Fix Summary

| Area | Change |
|------|--------|
| **Company Profile** | Load/save via `getProfile` / `updateProfile`; all PO fields enabled; logo upload via branding `brand_logo` document + `logoDocumentId` patch |
| **Directors** | Load from `listDirectors`; Add Director (name + designation); soft-delete via API |
| **Bank Accounts** | Load + Add Bank Account dialog → `createBankAccount` |
| **Digital Signatures** | Load + Add Signature dialog → `createDigitalSignature` |
| **Company Seal** | Load + Save initials/version → `updateSeal` |
| **Corporate Repository** | Read-only projection from `listDocuments`; dual-authoring disabled; link to Organization Documents |
| **Organization Documents** | Mount effect calls `hydrateOrgDocumentsRegistry()` with toast on failure |
| **Dashboard** | Activity from `listActivity`; KPI document count from `listDocuments`; category stats from live documents |
| **New pages** | `/organization/business-config`, `/organization/settings`, `/organization/security` |
| **Admin Console** | Three new modules under Organization category |
| **Verify script** | `npm run verify:co-org-001` |

Shell layouts (`OrganizationPageShell`, card grids, tables) were **preserved** — no redesign.

---

## 3. Activation Report

### API client (unchanged SSOT)

- `src/lib/enterprise-organization-workspace/api-client.ts` — `organizationWorkspaceApi`

### UI components wired

- `src/components/catalyst-one/organization/company-profile-form.tsx`
- `src/components/catalyst-one/organization/directors-table.tsx`
- `src/components/catalyst-one/organization/bank-accounts-grid.tsx`
- `src/components/catalyst-one/organization/digital-signatures-grid.tsx`
- `src/components/catalyst-one/organization/company-seal-view.tsx`
- `src/components/catalyst-one/organization/corporate-repository-table.tsx`
- `src/components/catalyst-one/organization/business-config-form.tsx` *(new)*
- `src/components/catalyst-one/organization/organization-settings-form.tsx` *(new)*
- `src/components/catalyst-one/organization/organization-security-form.tsx` *(new)*
- `src/components/catalyst-one/organization/organization-dashboard-panels.tsx`
- `src/components/catalyst-one/organization/organization-kpi-grid.tsx`
- `src/components/catalyst-one/organization-documents/organization-documents-workspace.tsx`

### Routes & navigation

- `src/constants/routes.ts` — `ORGANIZATION_BUSINESS_CONFIG`, `ORGANIZATION_SETTINGS`, `ORGANIZATION_SECURITY`
- `src/constants/administration-console.ts`
- `src/config/navigation.ts`
- `src/app/(dashboard)/organization/business-config/page.tsx` *(new)*
- `src/app/(dashboard)/organization/settings/page.tsx` *(new)*
- `src/app/(dashboard)/organization/security/page.tsx` *(new)*

### Engineering gate

- `scripts/co-org-001-verify.mjs`
- `package.json` → `verify:co-org-001`

---

## 4. Business Certification

| Gate | Status |
|------|--------|
| Static verify (`verify:co-org-001`) | Ready to run |
| Build / TypeScript | Pending PO environment |
| E2E Business Scenario | **Not run** — module **OPEN** per CO-QA-001 |
| Product Owner acceptance | **Not Certified** |

**Claim:** Ready for Product Owner review — **not** Business Certified.

Recommended BAT path: enable prisma mode → migrate → login as Super Admin → Company Profile save/reload → Add Director → upload Organization Document → confirm Corporate Repository projection → Business/Settings/Security PATCH → dashboard activity refresh.

---

## 5. Remaining Gaps

1. **Director drawer** — view-only; Add Director + soft-delete work; inline edit/PATCH in drawer not wired.
2. **Bank / signature edit** — create dialogs wired; in-place edit of existing rows not yet in UI (PATCH APIs exist).
3. **Company seal** — initials/version Save wired; seal binary document upload optional follow-up.
4. **Storage usage KPI** — still placeholder GB values (not derived from blob storage).
5. **Compliance / Document Studio** — dashboard KPI placeholders unchanged (not blocking profile/docs).
6. **E2E Scenario Pack** — live BAT after migrate + prisma (no deploy in this sprint per PO).
7. **Logo preview** — upload sets `logoDocumentId`; image render from content URL is optional polish.
8. **Migration not applied** until ops runs `prisma migrate deploy` on target DB.

---

## 6. Manual Steps (ops)

1. Apply CO-ORG-001 Prisma migration on the target database.
2. Set environment variables:
   - `ENTERPRISE_PERSISTENCE_MODE=prisma`
   - `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma` (client bundles)
3. **Do not deploy** until Product Owner approves this activation (PO instruction).
4. Run `npm run verify:co-org-001` locally before PO BAT.
5. After PO approval + migrate + prisma flags: execute live E2E — engineering verify alone does not certify.

---

*End of CO-ORG-001 Activation Report*

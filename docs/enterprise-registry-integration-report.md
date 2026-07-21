# CO-HOTFIX-006 — Enterprise Registry Integration Report

**Date:** 2026-07-21  
**Status:** Ready for Business Certification  
**SSOT Layer:** `src/lib/enterprise-registry/` + `src/hooks/use-enterprise-registry.ts`

---

## 1. Architecture

### Platform SSOT flow

```
PostgreSQL (Prisma) → ECM REST API → ensureEnterpriseRegistryHydrated()
  → in-memory ECM Maps → listOperationalContacts / listOperationalCompanies
  → pickers + search (via useEnterpriseRegistry hooks)
```

### Unified hooks (required for all pickers)

| Hook | Purpose |
|------|---------|
| `useEnterpriseRegistry()` | Hydration + live version + refresh |
| `useEnterpriseContacts()` | Operational contact options |
| `useEnterpriseCompanies()` | Operational company options |
| `useEnterpriseParticipantEntities()` | Loan participant entities |
| `useEnterpriseEntitySearch()` | Unified cross-entity search |
| `useEnterpriseContactSearch()` | Contact-only search |
| `useEnterpriseCompanySearch()` | Company-only search |

### Live update mechanism

- **Change bus:** `notifyEcmContactRegistryChanged()` / `useEcmContactRegistryVersion()`
- **Global warm cache:** `dashboard-layout.tsx` hydrates on mount
- **Dialog refresh:** `refreshOnOpen: true` on workspace modals
- **Soft delete/restore:** `softDeleteApi` re-hydrates registry after contact/company mutations
- **Hydration notify:** `ensureEnterpriseRegistryHydrated()` emits change bus after PostgreSQL sync

### Search algorithm (identical everywhere)

- Contacts: name, mobile, email, roles — case-insensitive substring (`searchOperationalContacts`)
- Companies: companyName, PAN, GST, CIN, industry, constitution (`searchOperationalCompanies`)
- Soft-deleted / archived excluded via `enabled !== false` + status filters

---

## 2. Audit — Components & Data Sources

| Component | Prior Source | Migrated | New Source |
|-----------|-------------|----------|------------|
| `loan-create-form-dialog.tsx` | ECM + CUSTOMER_SEED fallback | ✅ | `useLoanJourneyEcm` → enterprise-registry |
| `loan-files-workspace.tsx` | ECM cache | ✅ | `useLoanJourneyEcm` |
| `loan-workspace-modal.tsx` | ECM + ORGANIZATION_REGISTRY | ✅ | `buildDefaultParticipantEntityOptions` → enterprise-registry |
| `loan-participants-panel/table.tsx` | Parent `entityOptions` | ✅ | Parent uses enterprise-registry |
| `organization-registry-select.tsx` | **ORGANIZATION_REGISTRY mock** | ✅ | `useEnterpriseCompanies` + `searchOperationalCompanies` |
| `existing-loan-information-section.tsx` | Via OrganizationRegistrySelect | ✅ | Inherited |
| `business-completion-dialog.tsx` | Via OrganizationRegistrySelect | ✅ | Inherited |
| `reporting-manager-picker.tsx` | `listEcmContacts` + banker search | ✅ | `useEnterpriseRegistry` + `searchOperationalContacts` |
| `company-workspace-modal.tsx` | Direct `listEcmContacts` | ✅ | `listOperationalEcmContacts` + `searchOperationalContacts` |
| `contact-workspace-modal.tsx` | Direct `listEcmContacts` | ✅ | `findOperationalEcmContactById` |
| `directory-workspace.tsx` | ECM + hydrate | ✅ | Reference (already ECM) |
| `contact-strategy-workspace.tsx` | Direct `listEcmContacts` | ✅ | `listOperationalEcmContacts` |
| `eum-user-list.tsx` (Grant Access) | Direct `listEcmContacts` | ✅ | `listOperationalEcmContacts` |
| `opportunity-workspace-context.tsx` | ECM + demo register | ⚠️ Partial | ECM SSOT; demo contact bootstrap gated |

### Read-only derive engines (not pickers — acceptable)

| Module | Usage |
|--------|-------|
| `chanakya-live-intelligence/build-messages.ts` | Operational contact counts |
| `chanakya-briefing-dashboard/derive-briefing.ts` | Provisional gap metrics |
| `enterprise-phase-readiness/derive.ts` | Participant readiness |
| `relationship-heat-map/build-entities.ts` | Heat map entities |
| `lead-opportunity-journey/stated-draft.ts` | Draft resolution |

### Demo seed (dev-only, never in Prisma mode)

| Location | Gated by |
|----------|----------|
| `entity-search.ts` CUSTOMER_SEED / ORGANIZATION_REGISTRY | `isDemoSeedEnabled() && !isEnterprisePersistencePrisma()` |
| `loan-create-form-dialog.tsx` CUSTOMER_SEED fallback | `isDemoSeedEnabled()` only |

---

## 3. Files Changed

### New

- `src/lib/enterprise-registry/index.ts`
- `src/lib/enterprise-registry/contacts.ts`
- `src/lib/enterprise-registry/companies.ts`
- `src/lib/enterprise-registry/entity-search.ts`
- `src/lib/enterprise-registry/hydrate.ts`
- `src/lib/enterprise-registry/legacy-loan-journey.ts`
- `src/hooks/use-enterprise-registry.ts`
- `scripts/co-hotfix-006-verify.mjs`
- `docs/enterprise-registry-integration-report.md`

### Modified

- `src/hooks/use-loan-journey-ecm.ts` — delegates to `useEnterpriseRegistry`
- `src/lib/loan-journey/ensure-ecm-hydrated.ts` — re-exports hydrate SSOT
- `src/lib/loan-journey/ecm-registry-options.ts` — re-exports legacy-loan-journey
- `src/lib/loan-journey/source-contact-filter.ts` — fixed source param bug
- `src/lib/loan-participants.ts` — uses `buildParticipantEntityOptions`
- `src/lib/enterprise-soft-delete/index.ts` — re-hydrate after contact/company mutations
- `src/layouts/dashboard-layout.tsx` — global registry warm cache
- `src/components/catalyst-one/shared/organization-registry-select.tsx`
- `src/components/catalyst-one/loan-files/loan-create-form-dialog.tsx`
- `src/components/catalyst-one/contacts/reporting-manager-picker.tsx`
- `src/components/catalyst-one/companies/company-workspace-modal.tsx`
- `src/components/catalyst-one/contacts/contact-workspace-modal.tsx`
- `src/components/catalyst-one/contact-strategy/contact-strategy-workspace.tsx`
- `src/components/catalyst-one/enterprise-user-management/eum-user-list.tsx`

---

## 4. Components Migrated to Enterprise Registry

✅ Loan Create Dialog (primary applicant, source contact, company, participants)  
✅ Loan Files Workspace  
✅ Loan Workspace Modal  
✅ Organization / BT Institution Select  
✅ Existing Loan Information Section  
✅ Business Completion Dialog  
✅ Reporting Manager Picker  
✅ Company Workspace Modal (contact link search)  
✅ Contact Workspace Modal (manager lookup)  
✅ Contact Strategy Workspace  
✅ Enterprise User Management — Grant Platform Access  
✅ Dashboard global hydration  

---

## 5. Pending / Notes

| Item | Status |
|------|--------|
| `opportunity-workspace-context.tsx` demo contact bootstrap | Acceptable — demo-only path; production uses ECM |
| Derive/analytics libs calling `listEcmContacts()` directly | Read-only; not pickers |
| `generate-loan-files.ts` seed data | Dev seed generator only |
| `.cursor/rules/enterprise-registry-integration.mdc` | Recommended follow-up |

---

## 6. Verification

Run against production (requires current Super Admin password):

```bash
VERIFY_ADMIN_PASSWORD=<current-password> node scripts/co-hotfix-006-verify.mjs https://catalyst-one-two.vercel.app
```

**Production authentication:** `admin@rupeecatalyst.com` · `SUPER_ADMIN` · Rupee Catalyst (not `admin@compass.com`, which is demo-auth fallback only).

**Manual UI checklist:**

1. Create Company in Contacts → appears in Loan Create company picker without refresh
2. Edit Company → updated name in BT institution search + loan company picker
3. Soft delete Company → disappears from all pickers
4. Restore from Recovery Center → reappears everywhere
5. Repeat for Contact (primary applicant, source contact, participant search)
6. Search "jai" / "rahul" returns same results in Loan Create and Contacts directory

---

## 7. Architectural Decision

All module-specific contact/company lookup paths are consolidated under **`src/lib/enterprise-registry/`**. Legacy `loan-journey/*` paths remain as thin re-export aliases for backward compatibility (CO-HOTFIX-005). New code must import from `@/lib/enterprise-registry` or `@/hooks/use-enterprise-registry` only.

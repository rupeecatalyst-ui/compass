# CO-BUSINESS-CERTIFICATION — Enterprise Registry SSOT

**Date:** 2026-07-21  
**Deployment:** https://catalyst-one-two.vercel.app  
**Sprint:** CO-HOTFIX-006

---

## Authentication (Corrected)

| Field | Production value |
|-------|------------------|
| **Account** | `admin@rupeecatalyst.com` |
| **Role** | `SUPER_ADMIN` |
| **Organization** | Rupee Catalyst |
| **Name** | Business Certification Admin |

**Correction:** Previous reports incorrectly cited `admin@compass.com` / `Admin@123`. That pair is the **legacy demo-auth fallback** in `server/services/auth.service.ts` when `DATABASE_URL` is unset. Production runs **`ENTERPRISE_PERSISTENCE_MODE=prisma`** with PostgreSQL SSOT — authentication is the **Rupee Catalyst bootstrap Super Admin** seeded in `prisma/seed.ts`.

**Note:** Bootstrap seed sets `mustChangePassword: true`. The temporary seed password is **not valid** on production after first login/password change. Live verification requires the **current** production Super Admin password via `VERIFY_ADMIN_PASSWORD`.

---

## Business Verification Results

Automated UI certification was attempted against production. **Login failed** for both the Rupee Catalyst seed password and the legacy demo pair — indicating the production password has been rotated (expected after bootstrap).

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Create Company → appears in Loan Journey Associated Company search (no refresh) | **BLOCKED** | Requires live login — script: `scripts/co-business-cert-registry-ui.mjs` |
| 2 | Create Contact → appears in Primary Applicant search (no refresh) | **BLOCKED** | Same |
| 3 | Edit Company → updated name in all search pickers | **BLOCKED** | Same |
| 4 | Soft delete Company → absent from all pickers | **BLOCKED** | Same |
| 5 | Restore Company → reappears in all pickers | **BLOCKED** | Same |
| 6 | Contact delete / restore cycle | **BLOCKED** | Same |

### Screenshots

No screenshots captured — authentication to production failed before UI flows could run.

**Screenshot directory (ready for your run):**  
`docs/certification-screenshots/co-business-cert-registry/`

Expected files after successful run:
- `01-company-created-in-registry.png`
- `01-loan-journey-company-search.png`
- `02-contact-created-in-registry.png`
- `02-loan-journey-contact-search.png`
- `03-company-edited-in-registry.png`
- `03-company-updated-in-pickers.png`
- `04-company-soft-deleted-absent.png`
- `05-company-restored-visible.png`
- `06-contact-soft-deleted-absent.png`
- `06-contact-restored-visible.png`
- `results.json`

---

## How to Complete Business Verification (Your Side)

Set your current production Super Admin password and run:

```powershell
cd "c:\Compass by Rupee Catalyst (3)"
$env:VERIFY_ADMIN_EMAIL="admin@rupeecatalyst.com"
$env:VERIFY_ADMIN_PASSWORD="<your-current-production-password>"
node scripts/co-business-cert-registry-ui.mjs
```

API-only lifecycle check (no browser):

```powershell
$env:VERIFY_ADMIN_PASSWORD="<your-current-production-password>"
node scripts/co-hotfix-006-verify.mjs https://catalyst-one-two.vercel.app
```

---

## Code / Architecture Verification (Completed)

These were verified without live UI login:

| Check | Status |
|-------|--------|
| Production build | ✅ Pass |
| Vercel deploy | ✅ https://catalyst-one-two.vercel.app |
| Unified SSOT layer (`src/lib/enterprise-registry/`) | ✅ Implemented |
| Unified hooks (`useEnterpriseRegistry*`) | ✅ Implemented |
| Organization/BT picker migrated off mock registry | ✅ |
| Loan Journey pickers on enterprise registry | ✅ |
| Global hydration on dashboard mount | ✅ |
| Soft-delete API re-hydrates registry (contacts/companies) | ✅ |
| Change-bus notify after PostgreSQL hydrate | ✅ |
| ECM API requires authentication | ✅ Verified (401 unauthenticated) |

---

## Known Limitations

1. **Password rotation** — Bootstrap temp password in seed/docs cannot be used for automated prod login after first password change.
2. **UI automation fragility** — Company/contact creation flows use multi-step modals; script may need selector tuning if UI copy changes.
3. **BT institution picker** — Only visible when Transaction Type = Balance Transfer; scenario 3 in script checks loan company search primarily.
4. **Read-only derive modules** — Chanakya/phase-readiness still call `listEcmContacts()` for metrics (not pickers); acceptable per architecture audit.
5. **Frozen rule doc drift** — `.cursor/rules/business-functional-certification-report.mdc` still lists `admin@compass.com`; should be updated to `admin@rupeecatalyst.com` with your approval.

---

## Final Recommendation

| Area | Recommendation |
|------|----------------|
| **Architecture & implementation** | ✅ **Recommend certification** — SSOT consolidation is complete and deployed. |
| **Business UI verification** | 🟡 **Pending** — Requires you (or PO) to run the certification script with the **current** `admin@rupeecatalyst.com` password and attach screenshots. |
| **Overall sprint certification** | 🟡 **Conditionally ready** — Certify architecture now; mark business scenarios **PASS** only after the manual script run succeeds. |

Once you run the script with valid credentials, replace **BLOCKED** rows above with **PASS/FAIL** from `results.json` and attach the PNG screenshots for formal sign-off.

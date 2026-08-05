# CO-LENDER-REMEDIATION-001 — Remediation Summary & Validation

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Date:** 2026-08-05  
**Priority:** P0

---

## Remediation summary

### P0-A — Soft Go-Live fail-closed
- `lenderRegistryClient` create/update/publish/archive/programs/contacts/documents **fail closed** when `ENTERPRISE_PERSISTENCE_MODE=prisma`.
- Mutations use `apiMutate` and throw `EnterpriseLenderRegistryWriteError` (no localStorage ghost writes).
- New Lender wizard uses `listCategoriesAsync()` (Prisma category IDs).
- Baseline program seed: prisma path no longer falls back to Soft Go-Live local.

### P0-B — Jio Financial Services
- Created via Prisma Enterprise Lender Registry (not Soft Go-Live recovery).
- **Enterprise Lender ID:** `cmsg6x2c10001wegs7bkdzt3k`
- **Code:** `LND000001`
- **Status:** active · enabled · lifecycle active · operational active
- **Selection eligible:** Yes (Deal / BT / WP / Institution selectors)
- Child programs/contacts/documents/deals: **0** (ready to configure against this ID)
- Distinct from seeded **Jio Payments Bank**

### P0-C — Hierarchy ECM projection
- Confirmed from prior remediation: no localStorage hierarchy writes; compose from ECM `lender_employee` + `reports_to`.
- Verify: `npm run verify:co-lender-hierarchy-remediation-001` → PASS

---

## Validation report

| Check | Result |
|-------|--------|
| Static P0-A fail-closed | ✅ `verify:co-lender-remediation-001` |
| Hierarchy P0-C | ✅ `verify:co-lender-hierarchy-remediation-001` |
| Jio exists in `enterprise_lenders` | ✅ |
| Jio selection-eligible | ✅ |
| No ghost Soft Go-Live recreate | ✅ (fresh Prisma row) |
| Existing lenders deleted/reset | ❌ none (protected) |

### ID consumption map (Jio)

| Surface | Consumes ELR id `cmsg6x2c10001wegs7bkdzt3k`? |
|---------|-----------------------------------------------|
| Lending Programs | Yes when programs created with this `lenderId` |
| Product mapping (`productsSupported`) | Ready (empty array — configure via matrix/admin) |
| Policies | Bind when Policy Library uses ELR picker |
| ELR Contacts / Documents | Ready (empty) |
| Employees (ECM) | Set `institution` = this id |
| Deal Workspace | Selectable via ELR search |
| Wealth Partner APIs | Returned when active/enabled |

---

## Deployment

| Field | Value |
|-------|--------|
| Status | ✅ Ready |
| Live URL | https://catalyst-one-two.vercel.app |
| Deployment URL | https://catalyst-f13xtn8d2-rupee-catalyst.vercel.app |
| Build / Deployment ID | `dpl_5Gg3mbWJiA9w8dR4W3GvTLiNDTDn` |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/5Gg3mbWJiA9w8dR4W3GvTLiNDTDn |
| Smoke | HOME 200 · `/admin/lender-registry` 200 |
| Deployment time | 2026-08-05 ~20:12 IST |

---

## STOP

Await Product Owner BAT.

# CO-ORG-001 — Organization Workspace Database Reconciliation Report

**Date:** 2026-08-08  
**Nature:** Product Owner bug fix — schema/migration reconciliation only  
**Deploy:** ❌ Not deployed — awaiting Product Owner review  

---

## Root Cause

Organization Workspace code and Prisma schema were implemented yesterday, including migration:

`prisma/migrations/20260807130000_co_org_001_organization_workspace/migration.sql`

That migration **existed in the repository** but was **never applied** to the application Postgres database.

Result: runtime called `prisma.organizationWorkspaceProfile.findUnique()` against a missing table `public.organization_workspace_profiles`.

This was **not** an architecture defect, renamed table, or competing store. It was a **migration deploy gap**.

---

## Database currently connected

| Field | Value |
|-------|--------|
| Source | `.env.local` (`DATABASE_URL` + `DIRECT_URL`) |
| Host | `aws-0-ap-southeast-1.pooler.supabase.com` |
| Database | `postgres` / schema `public` |
| App URL | Pooler `:6543` (`pgbouncer=true`) |
| Migrate URL | Direct `:5432` (`DIRECT_URL`) |
| Persistence | `ENTERPRISE_PERSISTENCE_MODE=prisma` |
| Note | Root `.env` lacks `DIRECT_URL`; Prisma CLI must inherit env from `.env.local` |

No alternate / renamed Organization Workspace profile table existed. Before fix, only base `organizations` was present among org tables.

---

## Migration responsible for the table

| Item | Value |
|------|--------|
| Migration | `20260807130000_co_org_001_organization_workspace` |
| Creates | `organization_workspace_profiles` (+ settings, directors, banks, seals, documents, activity/audit, etc.) |
| Prisma model | `OrganizationWorkspaceProfile` → `@@map("organization_workspace_profiles")` |

---

## Migration status

### Before

Pending (not applied):

1. `20260807130000_co_org_001_organization_workspace`
2. `20260807150000_co_ccc_001_corporate_compliance_center`
3. `20260807180000_co_org_003_enterprise_activity_registry`
4. `20260807190000_co_ux_021_enterprise_business_notes`

`organization_workspace_profiles` **did not exist**.

### After (safe `prisma migrate deploy`)

All four additive migrations applied. `prisma migrate status` → **Database schema is up to date.**

Applied at ~2026-08-08T04:45:54Z (UTC).

---

## What was missing

- Physical table `public.organization_workspace_profiles`
- Sibling CO-ORG-001 tables (`organization_workspace_settings`, directors, banks, etc.)
- Related milestone tables from CCC / EAR / Business Notes (same pending batch)

Code, schema, and migration SQL were already present — only DB apply was missing.

---

## Exact fix applied

1. Diagnosed with `prisma migrate status` + read-only table probe (no destructive ops).  
2. Confirmed pending migrations are **CREATE-only** (no `DROP` / `TRUNCATE` / `DELETE`).  
3. Ran **`npx prisma migrate deploy`** against `DIRECT_URL` (Supabase Postgres).  
4. Regenerated Prisma Client.  
5. Validated `organizationWorkspaceProfile.findUnique()` + upsert + reload.  
6. Cleared temporary validation marker from `incorporationDetails`.  
7. Confirmed `organizations` row count remained **1**.

**No** redesign · **no** second table · **no** `migrate reset` · **no** architecture change.

---

## Data safety confirmation

| Check | Result |
|-------|--------|
| `prisma migrate reset` | Not used |
| Drop / truncate | Not used |
| Organization row count | Unchanged (**1**) |
| Existing production data | Preserved |
| Validation marker | Cleared after persist proof |
| Destructive SQL in applied migrations | None found |

---

## Verification results

| Gate | Result |
|------|--------|
| Table exists | ✅ `organization_workspace_profiles` |
| `findUnique()` | ✅ (null then row after upsert) |
| Upsert + reload persist | ✅ |
| `verify:co-org-001` | ✅ PASS |
| `prisma migrate status` | ✅ Up to date |
| TypeScript (`tsc --noEmit`) | ✅ PASS (exit 0) |
| Lint (`next lint`) | ✅ PASS (0 errors; pre-existing unused-var warnings) |
| Live Company Profile UI | ☐ Product Owner BAT (app against this DB) |

---

## Manual / ops note for Vercel Production

If Vercel Production uses this same Supabase database, Company Profile should now work once the running app uses prisma mode against it.

If Vercel points at a **different** database, that target also needs `prisma migrate deploy` with its credentials — do not assume local `.env.local` equals every environment.

**Do not deploy a new Vercel build until Product Owner reviews this reconciliation.**

---

## Final Status

✅ Database reconciled for Organization Workspace on the connected Supabase DB  
🟡 Awaiting PO review / UI BAT · **no Vercel deploy from this ticket**

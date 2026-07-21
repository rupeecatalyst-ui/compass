# Enterprise Baseline Migration v1.0 — Certification Plan

**Status:** FOR REVIEW — not applied  
**Target DB:** Catalyst One Platform (`unpjfzvlokovobxgvazo`) — greenfield  
**Folder:** `prisma/migrations/20260721000000_enterprise_baseline_v1_0/`  
**SQL:** `migration.sql`

---

## 1. Purpose

Establish the **first official Prisma migration** for Catalyst One Platform on an empty PostgreSQL schema.

Includes, in one migration:

| Layer | Objects |
|-------|---------|
| **Auth** | `Role` enum · `users` · `refresh_tokens` · `password_reset_tokens` |
| **Enterprise identity** | `organizations` |
| **ECM** | contacts · companies · company↔contact links · contact relationships |
| **Audit foundation** | `ecm_contact_audit_references` + `EcmAuditEntityType` |

Matches current `prisma/schema.prisma` (CO-SPRINT-117 refinements included: contact default `provisional`, `archived_by` / `archived_at`, company CI name unique index).

---

## 2. Historical migrations (left intact)

| Folder | Role |
|--------|------|
| `20260720120000_pilot_user_onboarding` | ALTER-only on assumed existing `users` |
| `20260720180000_co_sprint_117_ecm_foundation` | ECM ADD-only assuming auth already present |

**Do not delete or archive until Baseline v1.0 is approved.**

They are **superseded for greenfield** (cannot create auth from scratch). Keep for audit trail / reference only until a post-approval history strategy is chosen.

---

## 3. What this baseline creates

### Enums (10)
`Role`, `EcmContactRole`, `EcmContactStatus`, `EcmPlatformAccess`, `EcmContactRelationshipType`, `EcmContactRelationshipStatus`, `EcmAuditEntityType`, `EcmCompanyStatus`, `EcmCompanyRelationRole`, `EcmCompanyLinkStatus`

### Tables (9)
`users`, `refresh_tokens`, `password_reset_tokens`, `organizations`, `ecm_contacts`, `ecm_companies`, `ecm_company_contact_links`, `ecm_contact_relationships`, `ecm_contact_audit_references`

### Notable constraints
- `users.email` unique; optional unique `employee_id`, `eum_user_id`
- Self-FKs: `users.created_by_id`, `users.reporting_manager_id`
- `ecm_contacts` org+mobile unique; default status **`provisional`**
- Soft archive columns on contacts & companies
- `ecm_companies_org_name_ci_key` — unique `(organization_id, lower(company_name)) WHERE enabled = true`
- `ecm_contacts.linked_user_id` → `users.id`

### Explicitly excluded
EOLE · Loan JSONB · Document / Supabase Storage tables

---

## 4. Migration history strategy (decide after SQL approval)

Because Prisma will see **three** migration folders, greenfield `migrate deploy` would attempt all three in timestamp order and **fail** (old scripts assume prior state / duplicate objects).

After Baseline v1.0 SQL is certified, choose **one**:

| Option | Action |
|--------|--------|
| **A (recommended for greenfield)** | Move the two historical folders out of `prisma/migrations/` into `prisma/drafts/`, leave only Baseline v1.0, then `migrate deploy` |
| **B** | Keep folders but mark historical as already applied via `prisma migrate resolve` **only if** their SQL is no-ops on this DB (not true today — do not use B without rewriting historical SQL) |

**Do not run deploy until Option A or an approved rewrite is in place.**

---

## 5. Post-approval execution plan (not run yet)

1. Approve this SQL + plan.  
2. Resolve history (Option A recommended).  
3. `npx prisma migrate deploy` (Baseline v1.0 only).  
4. `npx prisma db seed` — Business Certification Admin + org `rupee-catalyst` (no demo ECM data).  
5. Re-run Live Baseline Audit (expect auth + ECM objects present).  
6. ECM REST smoke tests → four certification gates → Vercel env/deploy.  
7. Only then CO-SPRINT-118.

---

## 6. Certification checklist (SQL review)

- [ ] Auth tables match `schema.prisma` User / RefreshToken / PasswordResetToken  
- [ ] Contact default status = `provisional`  
- [ ] Soft archive `archived_by` / `archived_at` on contacts & companies  
- [ ] Company CI unique index present  
- [ ] No DROP / no data mutation  
- [ ] Historical migrations untouched pending approval  
- [ ] No migrate/seed executed in this preparation step  

---

## 7. Rollback note

Forward-only. Rollback = new migration that drops Baseline v1.0 objects (never silent rewrite of history).

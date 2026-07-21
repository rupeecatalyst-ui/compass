# CO-SPRINT-117 — ECM Foundation Migration (SQL Review)

**Status:** FOR REVIEW — not applied to any database yet.

## What this migration adds

| Object | Purpose |
|--------|---------|
| `organizations` | Single-org pilot foundation (`rupee-catalyst`) |
| `ecm_contacts` | Individual contacts — Directory Registry entity kind `contact` |
| `ecm_companies` | Legal entities — Directory Registry entity kind `company` |
| `ecm_company_contact_links` | Company ↔ individual relationships |
| `ecm_contact_relationships` | Contact ↔ contact relationships |
| `ecm_contact_audit_references` | EAF audit cross-reference (append-only) |

## What this migration does NOT touch

- `users`, `refresh_tokens`, `password_reset_tokens` (Pilot Phase 1 auth — live)
- EOLE tables (Phase 2A)
- Loan file hybrid JSONB tables (CO-SPRINT-118+)
- Supabase Storage / document registry (CO-SPRINT-121)

## Non-destructive guarantee

- **ADD ONLY** — no `DROP`, no `ALTER` on existing auth tables
- Soft archive via `status` + `enabled` — no hard deletes in Phase 1B

## Key constraints

| Rule | Implementation |
|------|----------------|
| Mobile uniqueness (org scope) | `ecm_contacts_org_mobile_key` |
| Company name (case-insensitive) | `ecm_companies_org_name_ci_key` on `lower(company_name)` WHERE `enabled = true` |
| Company↔Contact role | `ecm_company_contact_role_key` unique per `(company, contact, role)` |
| Directory role filter index | `ecm_contacts_organization_id_primary_role_idx` |

## Apply (after approval)

```bash
npx prisma migrate deploy
npx prisma db seed   # seeds pilot org + auth admin (no demo business data)
```

Set on Pilot Vercel:

```
ENTERPRISE_PERSISTENCE_MODE=prisma
```

## Certification gates (before CO-SPRINT-118)

- [ ] Business — contact/company CRUD, progressive create, unified Directory Registry
- [ ] Technical — REST APIs, repository ports, no UI→Prisma
- [ ] Data Integrity — duplicate rules, FK integrity, audit trail
- [ ] Performance — registry query p95 < 500ms @ 5k contacts

## Rollback note

Prisma migrate rollback is forward-only. To revert, create a new migration that drops ECM tables only (never auth tables).

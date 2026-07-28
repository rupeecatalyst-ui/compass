# CO-WP-002 — Wealth Partner Creation Failure

## Root cause (exact failure point)

**Layer:** Database persistence (after API route + service validation)

**Failure:** `POST /api/wealth-partner-registry/partners` reached the backend and passed auth, but Prisma insert failed because:

```text
The table `public.enterprise_wealth_partners` does not exist in the current database.
```

Migration `20260728120000_co_wp_001_wealth_partner_registry` had **not** been applied on the production Postgres. The API caught the unmapped Prisma error and returned the generic:

```text
Wealth Partner request failed
```

## Investigation checklist

| Step | Result |
|------|--------|
| Frontend payload | `identityKind`, `contactId`/`companyId`, `partnerType`, `displayName` → `POST /api/wealth-partner-registry/partners` |
| Endpoint | Exists and is wired |
| Persistence guard | Requires `ENTERPRISE_PERSISTENCE_MODE=prisma` (configured) |
| Validation | Identity + contact lookup OK before insert |
| Persistence | Failed — missing tables |
| Error handling | Generic 500 — improved in this sprint |

## Remediation applied

1. **Additive schema only** (no Contact/Company/Opportunity/Deal data changes):
   - Applied `prisma/migrations/20260728120000_co_wp_001_wealth_partner_registry/migration.sql`
   - Marked migration applied via `prisma migrate resolve --applied`
2. **Meaningful errors** for schema missing, duplicate convert, validation, DB unreachable
3. **Structured logging** (payload, endpoint, status, stack, Prisma code)
4. **Atomic create** (partner + activity in `$transaction`)
5. Smoke create against DB succeeded (then soft-deleted)

## Not applied (by design)

- `20260728140000_co_opp_002_opportunity_lifecycle` remains pending (Opportunity-related; out of WP-002 scope)

## BAT

1. Create Wealth Partner → Convert → expect success + workspace open
2. Convert same Contact again → expect “Contact already converted…”
3. Omit type (if forced) → “Wealth Partner Type is required.”

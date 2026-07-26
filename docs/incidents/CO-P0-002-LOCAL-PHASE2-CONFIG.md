# CO-P0-002 — Local Phase 2 configuration (no Production changes)

**Authority:** Local / Development only until Production is explicitly approved.  
**Vercel Production env:** **DO NOT MODIFY** until steps 1–5 of the cutover sequence succeed and Production update is approved.

---

## Deployment sequence

| Step | Environment | Action |
|------|-------------|--------|
| 1 | Local | Operational cutover config in `.env.local` |
| 2 | Local | CRUD validation (`verify:deal-registry:crud`) — after explicit approval |
| 3 | Local browser | Confirm Enterprise Deal Registry is used |
| 4 | Local browser | My Deals · Opportunity Workspace · Loan Workspace |
| 5 | Development / Preview | Update env **if applicable** — only after local success |
| 6 | Vercel Production | Update env **only after explicit approval** |

---

## Local `.env.local` — Phase 2 ready (verified)

| Variable | Required value | Purpose |
|----------|----------------|---------|
| `ENTERPRISE_PERSISTENCE_MODE` | `prisma` | Server persistence mode |
| `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE` | `prisma` | Client bundle mirror (required for browser consumers) |
| `DATABASE_URL` | Pilot project `unpjfzvlokovobxgvazo` | Platform SSOT connection |
| `DIRECT_URL` | Same project (optional) | Migrations / direct access |

### Deal flags

**Leave unset** for Phase B defaults (ON under prisma).  
Set `=false` only for emergency rollback.

| Flag | Default under prisma | Set false only for |
|------|----------------------|--------------------|
| `DEAL_REGISTRY_API_ENABLED` | ON | Emergency API off |
| `DEAL_REGISTRY_DUAL_WRITE_ENABLED` | ON | Emergency dual-write off |
| `DEAL_REGISTRY_PORT_RUNTIME` | ON | Emergency My Deals localStorage |
| `DEAL_REGISTRY_CONSUMER_OPPORTUNITY` | ON | Emergency Opportunity localStorage |
| `DEAL_REGISTRY_CONSUMER_LOAN_WORKSPACE` | ON | Emergency Loan Workspace localStorage |

Optional `NEXT_PUBLIC_DEAL_REGISTRY_*` mirrors exist for client-visible consumers; under prisma, code defaults ON even when unset.

---

## Phase 1 status (local)

Re-run anytime:

```bash
npm run verify:deal-registry
# or
npm run verify:deal-registry:readonly
```

Expected: `summary.ok: true`, `blockers: []`.

---

**Phase 2 (local CRUD) — approved & executed 2026-07-23**

```bash
npm run verify:deal-registry:crud
```

Creates / updates / soft-deletes / restores / hard-deletes a **temporary** integrity deal in the Pilot DB.  
See: `docs/incidents/CO-P0-002-PHASE2-COMPLETION-REPORT.md`

---

## Production (blocked)

Do **not** run:

```bash
# BLOCKED until explicitly approved after Preview validation
vercel env add NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE production
```

Production currently may have `ENTERPRISE_PERSISTENCE_MODE` / `DATABASE_URL` only.  
Client mirror for Production is deferred to step 6.

# CO-OPS-002 — Operational Runbook

Status: **Operational foundation** · Sprint: Enterprise Operational Excellence & Observability  
Audience: Support engineers · Platform operators · On-call

This runbook covers production operations for Catalyst One. It does **not** change business workflows.

---

## 1. Deployment

1. Confirm working tree is validated (`npm run build` green for the release candidate).
2. Deploy to Vercel (production target: Catalyst One certification/production project).
3. Confirm Production env (presence only — never paste secrets into tickets):
   - `DATABASE_URL` / `DIRECT_URL`
   - `JWT_SECRET` / `JWT_REFRESH_SECRET` (≥32, distinct)
   - `ENTERPRISE_PERSISTENCE_MODE=prisma`
   - `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma` (if used by client guards)
4. Smoke:
   - `GET /` returns application shell
   - Login succeeds for a known admin
   - Mission Control → Observability loads
   - `GET /api/admin/ops-health` with admin Bearer token returns `success: true`
5. Record deployment URL + Vercel deployment id in the release note.

---

## 2. Rollback

1. In Vercel → Deployments, promote the last known-good production deployment.
2. Do **not** roll back database migrations unless a dedicated DB recovery plan is approved.
3. After rollback, re-check `/api/admin/ops-health` and login.
4. If the issue was env-only (missing JWT / wrong persistence mode), fix env and redeploy — prefer config fix over code rollback when safe.

---

## 3. Incident response

| Signal | First action | Escalate when |
|--------|--------------|---------------|
| Users cannot login | Check JWT env + auth failure alerts in Alert Center / Vercel logs (`x-correlation-id`) | >5 login failures in 15m or total auth outage |
| Blank / Error Boundary after login | Confirm client bundles do not import server-only modules; check CO-ARCH-009 boundary | Recurring for multiple users |
| Data not saving | Confirm persistence mode prisma + DB connected in Ops Health | DB status down |
| High error rate | Open Observability → Error timeline; filter by correlation ID | Error rate ≥25% on instance window |
| Migration concern | Compare Build Information last migration vs expected | Schema drift or migrate failure |

**Correlation:** Every API error should expose `error.correlationId` and response header `x-correlation-id`. Search Vercel logs for that ID.

---

## 4. Production recovery

1. Stabilize (rollback or config fix).
2. Confirm Ops Health: Application · Database · Authentication · API · Migrations.
3. Confirm Alert Center critical alerts clear or are acknowledged with notes.
4. Spot-check a create path (Contact or Deal) and verify a business audit appears in Ops Health `recentAudits` (instance-local ring).
5. Notify stakeholders with timeline + correlation IDs (never include passwords/JWTs).

---

## 5. Database recovery

1. Prefer Supabase / managed provider point-in-time recovery if data loss occurred.
2. Never expose `DATABASE_URL` in chat, logs, or tickets.
3. After restore: run `npm run cert:migrations` (or project migration verify) against the restored environment.
4. Confirm Build Information `databaseConnected=true` and last migration name.

---

## 6. Authentication recovery

1. Confirm `JWT_SECRET` and `JWT_REFRESH_SECRET` are present, ≥32 chars, and different.
2. If secrets were rotated, existing sessions invalidate — users re-login (expected).
3. Repeated login failures: treat as security signal; inspect rate / source; do not disable fail-closed JWT validation.
4. Demo auth paths must remain disabled in production (CO-STAB-001).

---

## 7. Routine health checks (daily / on-call)

- [ ] Application reachable
- [ ] Login works for admin smoke account
- [ ] `/api/admin/ops-health` — all core statuses healthy or explained
- [ ] Alert Center — no unexplained criticals
- [ ] Observability — error rate and avg response within normal bands
- [ ] Build Information — database connected; migration name present
- [ ] Persistence mode Prisma in production

---

## 8. Logging & audit (quick reference)

Structured logs (JSON) include: `timestamp`, `userId`, `module`, `entityId`, `action`, `result`, `correlationId`.

**Never log:** passwords, JWT values, PAN/Aadhaar, Authorization headers.

Business audits (Who / When / What / Previous / New) are recorded for key events such as Login, Customer Created, Deal Created, Lender Assigned, Document Uploaded, Status Changed.

---

## 9. Related surfaces

| Surface | Path |
|---------|------|
| System Health (live) | Mission Control → Observability (enriched by `/api/admin/ops-health`) |
| Alerts | Mission Control → Alert Center |
| Build facts | Administration → Build Information |
| Ops Health API | `GET /api/admin/ops-health` |
| Certification gates | `npm run cert:production` |

# CO-ORG-003 — E2E Scenario (BAT)

**Sprint:** CO-ORG-003  
**Environment:** Soft Go-Live with `ENTERPRISE_PERSISTENCE_MODE=prisma` after migration applied

---

## Preconditions

- [ ] Migration `20260807180000_co_org_003_enterprise_activity_registry` applied
- [ ] Prisma generate run
- [ ] Authenticated as Business Certification Admin (`admin@compass.com`)
- [ ] Demo seed **off** for production-truth checks

---

## Scenario A — Note → EAR → Dialogue

1. Open an Opportunity Workspace Dialogue / Timeline.
2. Save a typed Activity Note (Action Center / ECIE composer) **or** append a dialogue note.
3. Reload the Opportunity Workspace.
4. **Expect:** Note appears in Dialogue timeline (hydrated from EAR).
5. Open Dashboard Recent Activity.
6. **Expect:** Same event visible (title / relative time).
7. Open Mission Control Situation Room activity.
8. **Expect:** Same event (or empty only if emit failed — not placeholders).

## Scenario B — Deal stage → EAR

1. Perform a Deal stage / timeline mutation that appends Deal Timeline.
2. Query `GET /api/enterprise-activity?dealId=<id>`.
3. **Expect:** Event with `sourceSystem=deal_timeline`.

## Scenario C — Org MDM → EAR

1. Update Organization profile or upload an org document.
2. Open Organization dashboard Recent Activity.
3. **Expect:** EAR-backed row (not fabricated demo).

## Scenario D — Empty state integrity

1. Fresh org with no activity.
2. Dashboard / MC with demo seed **off**.
3. **Expect:** Empty / “No enterprise activity” — **not** fake SLA / credit placeholder rows.

---

## Pass criteria

All checked boxes above · no placeholder Mission Control activity · Dialogue survives reload under prisma.

# CO-ORG-003 — Enterprise Activity Registry Activation Report

**Sprint:** CO-ORG-003  
**Status:** Activation complete · Ready for Product Owner review (not Certified) · **No deploy**  
**Date:** 2026-08-07

---

## 1. Objective

Complete the Enterprise Activity Registry as the **Single Source of Truth** for operational chronology across Opportunity Activity, Dialogue, Tasks, Documents, Stage Changes, Notes, Communications, Workflow, CHANAKYA chronology inputs, and Mission Control.

Remove fragmented **reader** dependence on demo / placeholder / EDC-only memory as production truth.

---

## 2. What was activated

### A. Durable SSOT

| Artefact | Path |
|----------|------|
| Prisma model | `EnterpriseActivityEvent` |
| Migration | `prisma/migrations/20260807180000_co_org_003_enterprise_activity_registry/` |
| Service | `server/services/enterprise-activity/enterprise-activity.service.ts` |
| Repository | `server/repositories/enterprise-activity/enterprise-activity.repository.ts` |
| API | `src/app/api/enterprise-activity/route.ts` |
| Client lib | `src/lib/enterprise-activity-registry/` |
| Rule | `.cursor/rules/enterprise-activity-registry.mdc` |

### B. Emitters (dual-write, fail-open)

| Writer | Source system |
|--------|---------------|
| `appendEdcTimelineEntry` | `edc` (covers ETE / docs / stage / communications that already append EDC) |
| Deal `appendTimelineEvent` | `deal_timeline` |
| Org `writeActivity` | `org` |
| ECIE conversation upsert | `ecie` |

### C. Readers switched

| Reader | Before | After |
|--------|--------|-------|
| Dashboard Recent Activity | Static demo | EAR (+ demo only if seed on & EAR empty) |
| Org dashboard Recent Activity | Org MDM list only | EAR |
| OW Dialogue panel | EDC memory only | Hydrate from EAR + EDC projection |
| Dialogue Center workspace | EDC memory / demo seed | Hydrate from EAR |
| Mission Control activity feed | Hardcoded placeholders | EAR (empty if none) |

---

## 3. Fragments retired as SSOT (not deleted domain stores)

| Fragment | End state |
|----------|-----------|
| EDC in-memory | Projection + dual-write; hydrate from EAR |
| Dashboard `activityTimeline` demo | Demo-seed fallback only |
| MC Situation Room placeholders | Removed for activity feed |
| ECIE “Enterprise Activity Registry” naming | Clarified as **Conversation Activity Registry** |
| Deal Timeline / Org MDM | Domain ledgers retained; emit to EAR |

---

## 4. Verification

```bash
npm run verify:co-org-003
```

Engineering gate only — does **not** satisfy Business Certification (CO-QA-001).

---

## 5. Manual steps required

1. Ensure `ENTERPRISE_PERSISTENCE_MODE=prisma` and `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE=prisma`.
2. Apply migration `20260807180000_co_org_003_enterprise_activity_registry`.
3. `npx prisma generate` after pull.
4. BAT per `CO-ORG-003-E2E-SCENARIO.md` and Product Owner Certification.

**No Vercel deployment** performed (PO instruction).

# CO-RADAR-003 — Enterprise Activity Timeline → CHANAKYA Radar

**Status:** Implemented · Awaiting Business Certification + Product Owner approval before deploy  
**Nature:** Production bug fix — **timeline projection only**  
**Does NOT modify:** Radar scoring · Health formula · Classification thresholds

---

## Root cause (confirmed)

`mapEnterpriseDealToLoanFileStub()` projected `timeline: []` even when `EnterpriseDealTimelineEvent` rows existed in Postgres. Activity Intelligence treated empty meaningful history as At Risk → health floor **6**.

---

## Fix

| Change | Detail |
|--------|--------|
| Enterprise Deal Activity Timeline mapper | `src/lib/enterprise-deal/enterprise-deal-activity-timeline.ts` |
| Stub mapping | Accepts enterprise timeline events; merges into LoanFile `timeline` |
| DAL hydrate | `loadEnterpriseAsLoanFiles` batch-loads timelines via API |
| Batch API | `GET /api/enterprise-deals/timelines?dealIds=…` |
| Repository / service | `listTimelinesForDeals` |

**Operational activity SSOT for Radar:** append-only **Enterprise Deal Timeline** (`EnterpriseDealTimelineEvent`).

Event types projected (with meaningful-work titles where applicable):

Deal Created · Stage Changes · Notes/Activities · Tasks · Document Uploads · Approvals (via stage text) · Workflow Events · Communication / Contacted (when recorded) · Counterparty / lender pipeline updates

---

## Validation (this workstation)

```bash
npx tsx --env-file=.env.local scripts/co-radar-003-validate.mts
```

Result (sample run):

| Metric | Before | After |
|--------|--------|-------|
| Empty stub timeline | 100% | **0** |
| Avg Deal Health | **6** | **88** |
| At Risk | 100% | **0** |
| On Track | 0 | **10** |
| Needs Attention | 0 | **2** |
| Follow-up Required | 0 | 0 (none warranted in current book) |

Artefact: [`CO-RADAR-003-VALIDATION.json`](./CO-RADAR-003-VALIDATION.json)

---

## Deploy gate

**Do not deploy** until:

1. Business Certification  
2. Explicit Product Owner approval  

---

## Related

- CO-RADAR-002 diagnostic: `docs/co-radar-002/`

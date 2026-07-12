# Catalyst One — SPR-002 Enterprise Opportunity Workspace Integration

**Sprint:** SPR-002  
**Version:** 11.1.0  
**Status:** Implemented (integration)  
**Date:** July 2026

---

## 1. Workspace Screenshots

Screenshots are not embedded in-repo. Review locally:

```bash
npm run dev
```

1. Open http://localhost:3000/login (`admin@compass.dev` / `Compass@123`)
2. Navigate to **Opportunity Workspace** → http://localhost:3000/opportunities

Capture:

| Area | What to verify |
|------|----------------|
| Header | Opportunity code, stage, progress, Compass needle + pulse + floating recommendation |
| Quick Actions | Add Task, Upload Document, Open Dialogue, Select Lender, View Timeline, Change Stage |
| Middle | Customer summary, LIFE lender selection, Documents, Tasks |
| Bottom | Dialogue timeline with filters |

---

## 2. Integration Summary

SPR-002 creates **one operational command center** for an opportunity. No new engines were created.

| Module | Integration |
|--------|-------------|
| **Unified Workspace** | `/opportunities` — `OpportunityWorkspace` shell with EOLE-seeded demo opportunity |
| **LIFE** | Embedded panel: search/select lender executor; hierarchy + reporting manager; logs to Dialogue |
| **EDIE** | Required / uploaded / pending / verified docs; upload/view/replace/download actions in-workspace |
| **Task Engine** | Active / completed / overdue; create + assign without leaving workspace |
| **Dialogue Center** | Bottom timeline; filters All / Tasks / Documents / Workflow / Communication |
| **Opportunity Compass** | Header health indicator: needle, pulse, rotating recommendations |
| **Contact Summary** | Name, contact, roles, RM, stage, progress; link to Contact Master |
| **Quick Action Bar** | Scrolls/focuses panels — no cross-module navigation required |
| **Stage** | In-workspace stage advancement via EOLE lifecycle transitions |

Layout:

```
Top     → Header (Compass + Stage + Progress) + Quick Actions
Middle  → Contact | LIFE | Documents | Tasks
Bottom  → Dialogue Timeline (+ Stage panel on demand)
```

---

## 3. Components Reused

| Component / Engine | Path |
|--------------------|------|
| LIFE | `@/lib/enterprise-life-engine` |
| EDIE document rules | `@/lib/enterprise-document-intelligence-engine` |
| ETE | `@/lib/enterprise-task-engine` |
| EDC | `@/lib/enterprise-dialogue-center` |
| Opportunity Compass | `@/lib/enterprise-opportunity-compass` |
| ECM | `@/lib/enterprise-contact-master` |
| EOLE | `@/lib/enterprise-opportunity-lifecycle-engine` |
| EnterpriseEngagementCard | `@/components/catalyst-one/shared/enterprise-engagement-card` |

### New UI (integration only)

```
src/components/catalyst-one/opportunity-workspace/
  opportunity-workspace.tsx
  opportunity-workspace-context.tsx
  workspace-header.tsx
  workspace-quick-actions.tsx
  workspace-contact-summary.tsx
  workspace-life-panel.tsx
  workspace-documents-panel.tsx
  workspace-tasks-panel.tsx
  workspace-dialogue-panel.tsx
  workspace-stage-panel.tsx
  index.ts
src/app/(dashboard)/opportunities/page.tsx
```

---

## 4. Architecture Recommendations

1. Promote workspace context to accept `?opportunityId=` from Loan Board / Pipeline selection.
2. Persist EOLE + panel state via Prisma adapters (still behind existing ports).
3. Replace simulated document upload with EDIE storage references + object storage.
4. Share Dialogue panel as a reusable slot inside Loan Workspace Modal.
5. Drive Compass metrics from live ETE overdue counts + EOLE aging (already partially wired).
6. Deploy Catalyst One Vercel project so `/opportunities` is reviewable remotely.

---

## 5. Performance Observations

1. **Client-side seed on mount** — EOLE/LIFE/EDIE/ETE/EDC seed runs in the browser; first paint waits for `opportunityId`. Acceptable for pilot; move seed to server for production.
2. **Module-level in-memory registries** — not shared across Next.js serverless instances; fine for local pilot.
3. **Scroll-into-view focus** — Quick Actions use smooth scroll; no route transitions, so perceived latency stays low.
4. **Timeline filter** — pure client filter over EDC list; scales for pilot volumes.
5. **No new HTTP round-trips** — all engine calls are in-process TypeScript.

---

## Acceptance

- [x] Single Opportunity Workspace operational  
- [x] LIFE / EDIE / Tasks / Dialogue / Compass / Contact / Quick Actions embedded  
- [x] No new engines  
- [x] No external notifications  
- [x] Responsive grid layout  

**Review URL:** http://localhost:3000/opportunities

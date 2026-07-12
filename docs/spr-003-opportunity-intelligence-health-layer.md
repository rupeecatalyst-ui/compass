# Catalyst One — SPR-003 Opportunity Intelligence & Health Layer

**Sprint:** SPR-003  
**Version:** 11.2.0  
**Status:** Implemented  
**Date:** July 2026

---

## 1. Summary of implemented intelligence features

SPR-003 adds a **live operational intelligence layer** on top of the SPR-002 Opportunity Workspace. No new enterprise engines were introduced.

| Module | Delivered |
|--------|-----------|
| **Live Health Score** | 0–100 score in opportunity header with band badge (Excellent / Good / Needs Attention / Critical) |
| **Live Pulse** | Auto-recomputed on task, document, stage, and dialogue activity |
| **Compass Intelligence** | Needle/colour driven by health, pulse posture, overdue tasks, and configurable thresholds; CSS `transition-transform` for smooth motion |
| **CHANAKYA Insights** | Advisory-only Enterprise Insights panel |
| **Live KPI Header** | Pulse, Health, Age, Pending Docs, Open Tasks, Overdue, Last Activity, Assigned RM |
| **Smart Refresh** | Context `refresh()` + intelligence snapshot — no page reload |
| **Dialogue events** | System entries for Health / Pulse / Compass changes (`actorId: chanakya`, `generatedBy: CHANAKYA`) |
| **Health visualisation** | Enterprise band colours on header chip + large score |
| **ECG readiness** | Weightages/thresholds via `configureOpportunityIntelligenceConfig()` — not hardcoded in UI |
| **Performance** | Single snapshot recompute per operational signal change; panels re-read only on `refreshKey` / `intelligence.computedOn` |

Review route: http://localhost:3000/opportunities  
Login: `admin@compass.dev` / `Compass@123`

---

## 2. Health Score calculation architecture

```
Operational signals (LIFE/EDIE/ETE/EDC/EOLE)
        │
        ▼
getOpportunityIntelligenceConfig()   ← ECG-ready overrides
        │
        ├─► computeLivePulseIntensity()     → pulseScore / intensity / label
        ├─► computeOpportunityHealthScore() → weighted 0–100 + band + factors
        ├─► computeLiveOpportunityCompass() → needle / colour / rationale
        └─► generateChanakyaInsights()      → advisory messages
        │
        ▼
OpportunityIntelligenceSnapshot → Header / KPIs / Compass / Insights / Dialogue
```

### Default weightages (sum = 1.0)

| Factor | Weight |
|--------|--------|
| Stage Progress | 0.20 |
| Pulse Score | 0.15 |
| Document Completion % | 0.20 |
| Open Tasks | 0.10 |
| Overdue Tasks | 0.15 |
| Days Since Last Activity | 0.10 |
| Communication Activity | 0.10 |

Weights live in `DEFAULT_OPPORTUNITY_INTELLIGENCE_CONFIG`  
(`src/constants/enterprise-opportunity-intelligence/defaults.ts`).

Runtime override:

```ts
import { configureOpportunityIntelligenceConfig } from "@/lib/enterprise-opportunity-intelligence";

configureOpportunityIntelligenceConfig({
  healthWeightages: { /* … */ },
  healthThresholds: { excellentMin: 85, goodMin: 70, needsAttentionMin: 45 },
  compassThresholds: { /* … */ },
  pulseWeightages: { /* … */ },
});
```

Future ECG admin UI can call the same API — **architecture only** in this sprint.

### Band thresholds (default)

| Band | Score |
|------|-------|
| Excellent | ≥ 85 |
| Good | ≥ 70 |
| Needs Attention | ≥ 45 |
| Critical | &lt; 45 |

---

## 3. UI screenshots

Screenshots are not embedded in-repo. Capture locally:

```bash
npm run dev
```

1. Open http://localhost:3000/login  
2. Navigate to http://localhost:3000/opportunities  

| Capture | What to verify |
|---------|----------------|
| Header | Large Health Score, band chip, KPI row, Compass needle + pulse |
| Insights | CHANAKYA advisory cards (inactivity, docs %, overdue, health trend) |
| Dialogue | CHANAKYA-badged system entries after upload / complete / stage change |
| Live refresh | Upload a document or complete a task — Health, Pulse, Compass, KPIs update without reload |

---

## 4. Performance observations

- Intelligence is computed once per signal change in the workspace provider (not per child panel).
- Document/task local Sets moved to context so metrics and UI share one source of truth.
- Dialogue timeline also keys off `intelligence.computedOn` so CHANAKYA entries appear without an extra manual refresh.
- Compass uses CSS transitions (`duration-700`) — no animation libraries.
- No polling loop; refresh is event-driven via `refresh()`.

---

## 5. Future recommendations before SPR-004

1. Persist document upload/verify state in EDIE storage (today: React context pilot).
2. Wire ECG admin screens to `configureOpportunityIntelligenceConfig` with audit trail.
3. Persist completed-task state on ETE task records (today: workspace Set).
4. Optional: throttle Dialogue CHANAKYA spam if high-frequency micro-score changes appear in production.
5. Keep CHANAKYA advisory-only — do not introduce Decision Engine or auto-actions in SPR-004 unless explicitly scoped.

---

## 6. Architectural assumptions

1. **No new engines** — Opportunity Intelligence is a calculation/composition layer over existing ports.
2. **In-memory registries** remain the persistence model for pilot engines.
3. **Single demo opportunity** (`OPP-WS-001`) seeds the workspace for review.
4. **Assigned RM** KPI uses label `RM-001` until HR/assignment engine is linked.
5. **Document pending** = required − max(uploaded, verified) for KPI chips.
6. **CHANAKYA** may write EDC timeline entries as system/advisory events; never external notifications.
7. **Weight normalisation** — if admins supply weights that do not sum to 1.0, the health engine normalises by weight sum.

---

## Key paths

```
src/types/enterprise-opportunity-intelligence.ts
src/constants/enterprise-opportunity-intelligence/
src/lib/enterprise-opportunity-intelligence/
src/components/catalyst-one/opportunity-workspace/
  opportunity-workspace-context.tsx
  workspace-header.tsx
  workspace-chanakya-insights.tsx
  …
docs/spr-003-opportunity-intelligence-health-layer.md
```

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Live Health Score operational | ✓ |
| Pulse updates automatically | ✓ |
| Compass updates automatically | ✓ |
| KPI Header operational | ✓ |
| CHANAKYA Insight Panel operational | ✓ |
| Dialogue records health events | ✓ |
| Workspace refreshes dynamically | ✓ |
| Performance remains responsive | ✓ |

---

**END OF SPRINT SPR-003**

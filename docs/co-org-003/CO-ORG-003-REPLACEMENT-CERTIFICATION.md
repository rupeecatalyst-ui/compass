# CO-ORG-003 — Replacement Certification

**Programme / Sprint:** CO-ORG-003  
**Capability replaced:** Fragmented operational activity chronology (dashboard demo · Mission Control placeholders · EDC-as-SSOT · naming collision with ECIE “Activity Registry”)  
**Related ADR / Directive:** ADR-021 (conversation domain retained) · CO-INVESTIGATION-001 · CO-PROD-READY C7  
**Date:** 2026-08-07  
**Prepared by:** Engineering (implementation)  
**Product Owner acceptance:** ☐ Pending · ☐ Accepted

---

## 1. Canonical implementation

| Field | Value |
|-------|--------|
| Canonical name | Enterprise Activity Registry (EAR) |
| Primary route(s) | `GET/POST /api/enterprise-activity` (no dedicated primary-nav desk) |
| Primary module / SSOT | `EnterpriseActivityEvent` + `src/lib/enterprise-activity-registry/` |
| Business authority | Universal operational chronology |

---

## 2. Retired legacy implementation

| Field | Value |
|-------|--------|
| Legacy name | Fragmented activity readers (demo / placeholders / EDC memory as SSOT) |
| Former route(s) | N/A (embedded widgets) |
| Former module(s) | `activityTimeline` demo · Situation Room placeholders · EDC in-memory as truth |
| Retirement status | Quarantined / redirected to EAR readers; domain ledgers retained with dual-write |

---

## 3. Routes

| Legacy route | Disposition | Notes |
|--------------|-------------|-------|
| N/A | — | No route removal; data source swap |

---

## 4. Navigation

| Entry | Action | Target |
|-------|--------|--------|
| Dashboard Recent Activity | Retargeted data | EAR |
| Organization Recent Activity | Retargeted data | EAR |
| Mission Control Situation Room activity | Retargeted data | EAR |
| Dialogue / OW Timeline | Hydrate + dual-write | EAR |

---

## 5. Workflow / journey references

| Surface | Change |
|---------|--------|
| EDC append | Dual-writes EAR |
| Deal Timeline append | Dual-writes EAR |
| Org writeActivity | Dual-writes EAR |
| ECIE conversation upsert | Dual-writes EAR |
| ETE task events | Via existing EDC append → EAR |

---

## 6. Confirmation — single active chronology SSOT

After activation, **only EAR** is the universal chronology SSOT for cross-desk activity.

Domain stores (ECIE transcripts, Deal Timeline, Org MDM) remain domain authorities and emit into EAR.

Product Owner must complete BAT (`CO-ORG-003-E2E-SCENARIO.md`) before marking **Certified**.

---

## Product Owner sign-off

| Check | Status |
|-------|--------|
| Architecture accepted | ☐ |
| BAT passed | ☐ |
| Replacement accepted | ☐ |
| Freeze authorised | ☐ |

# CO-ORG-003 — Enterprise Activity Registry Architecture

**Sprint:** CO-ORG-003  
**Date:** 2026-08-07  
**Status:** Implemented · Ready for Product Owner Business Certification · **No deploy**

---

## 1. Problem

Prior audits (CO-INVESTIGATION-001, CO-PROD-READY C7, CO-ESP-001) found **no universal activity SSOT**. Activity was fragmented across:

| Fragment | Persistence |
|----------|-------------|
| ECIE Conversation Activity | Session Map + Prisma |
| EDC Timeline | In-memory only |
| Deal Timeline / Deal Activity | Prisma (deal-scoped) |
| OrganizationActivityEvent | Prisma (org MDM) |
| Dashboard Recent Activity | Static demo |
| Mission Control Situation Room | Hardcoded placeholders |
| ETE task events | In-memory → EDC only |

---

## 2. Constitutional decision

**Enterprise Activity Registry (EAR)** is the **Single Source of Truth** for universal operational chronology.

Domain ledgers remain authoritative for their domain shapes and **emit** into EAR:

| Domain | Remains | Emits to EAR as |
|--------|---------|-----------------|
| ECIE conversation | Transcript SSOT (ADR-021) | `notes` / source `ecie` (+ EDC bridge) |
| EDC Dialogue | Projection / compose API | `sourceSystem=edc` |
| Deal Timeline | Deal ledger | `stage_change` / `workflow` · `deal_timeline` |
| Org MDM activity | Org domain ledger | `org` |
| ETE tasks | Task SSOT | via EDC append → EAR |

---

## 3. Data model

```text
Prisma: EnterpriseActivityEvent
Table:  enterprise_activity_events
Migration: 20260807180000_co_org_003_enterprise_activity_registry
```

Idempotency: unique `(organization_id, source_system, source_event_id)`.

Durable when `ENTERPRISE_PERSISTENCE_MODE=prisma` (+ public mirror). Soft Go-Live session cache otherwise.

---

## 4. Event kinds (frozen)

`opportunity` · `dialogue` · `tasks` · `documents` · `stage_change` · `notes` · `communications` · `workflow` · `chanakya` · `mission_control`

---

## 5. API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/enterprise-activity` | List / filter chronology |
| POST | `/api/enterprise-activity` | Emit (idempotent upsert) |

---

## 6. Consumers switched to EAR

| Surface | Change |
|---------|--------|
| Dashboard `ActivityTimeline` | Lists EAR; demo only if demo-seed on **and** EAR empty |
| Organization Recent Activity | Lists EAR |
| OW Dialogue / EDC Workspace | Hydrate EDC from EAR; append dual-writes EAR |
| Mission Control Situation Room activity | Lists EAR (empty when none — no placeholders) |
| CHANAKYA Radar | Deal Timeline dual-writes EAR; Activity Intelligence formula **unchanged** (CO-MC-001) |

---

## 7. Constitutional Health Check

**GREEN** for this sprint scope:

- Does not redesign Opportunity Workspace chrome  
- Does not violate ADR-021 (ECIE remains conversation domain)  
- Does not invent a second Activity Momentum formula  
- Append-only dual-write is fail-open  

---

## 8. Manual ops

Apply migration `20260807180000_co_org_003_enterprise_activity_registry` before durable EAR in target DB.

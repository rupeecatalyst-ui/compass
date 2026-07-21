# PMO-004 — Work Classification Standard

**Document ID:** PMO-004  
**Status:** APPROVED  
**Owner:** PMO Director

---

## 1. Rule

**No work may begin until classified.** Every request—human or agent—must receive a classification label, owning office, and program ID (or new program proposal) before implementation.

---

## 2. Classification Categories

| Category | Code | Owning office | Examples |
|----------|------|---------------|----------|
| **Architecture** | `ARCH` | ARB | ADRs, architecture freeze changes, CO-ARCH blueprints |
| **Infrastructure** | `INFRA` | Infrastructure | CO-ARCH-001, Prisma migrations, master data APIs, ports, seeds |
| **Development** | `DEV` | Development | CO-SPRINT features, port adoption in UI, bug fixes |
| **Bug Fix** | `BUG` | Development | Defect remediation (non-certification) |
| **Certification** | `CERT` | Quality | CO-CERTIFICATION audits, smoke scripts, production verification |
| **Documentation** | `DOC` | Enterprise Documentation | PMO standards, specs, register updates |
| **Release** | `REL` | Release Management | Deploy, env config, rollback, release notes |
| **Risk** | `RISK` | Risk & Compliance | Risk register entries, mitigation plans |
| **Enhancement** | `ENH` | Development* | Product improvements (*requires explicit approval—not default during freeze) |

---

## 3. Classification Decision Tree

```
Is it governance-only (registers, PMO docs, workflows)?
  → DOC

Is it architecture decision or CO-ARCH design?
  → ARCH (ARB approval required)

Is it database / API / master data / migration / port platform?
  → INFRA (Infrastructure Office)
  → NOT product redesign

Is it verifying readiness (audit, smoke, production proof)?
  → CERT (Quality Office — independent)

Is it deployment / environment / version?
  → REL

Is it a defect in existing behavior?
  → BUG

Is it new product behavior or UX redesign?
  → ENH (requires ESC approval during implementation freeze)

Default feature / sprint work?
  → DEV (CO-SPRINT ID required)
```

---

## 4. Required Metadata (per work item)

| Field | Required | Example |
|-------|----------|---------|
| Classification | Yes | `INFRA` |
| Program ID | Yes | `CO-ARCH-001-I2` |
| Owning office | Yes | Infrastructure |
| Summary | Yes | Reference Master CRUD API |
| Gate target | Yes | Gate 1b |
| Product redesign? | Yes | **No** (mandatory for INFRA) |
| ADR reference | If ARCH | ADR-015 (future) |
| Risk reference | If applicable | RISK-2026-003 |

---

## 5. CO-ARCH-001 Classification Rules (Infrastructure Program)

| Allowed in CO-ARCH-001 | Not allowed |
|------------------------|-------------|
| Prisma schema, migrations | Workspace layout redesign |
| CRUD APIs | New business journeys |
| Client ports, dual-read adapters | Chanakya / Radar changes |
| Seed / backfill scripts | Feature additions |
| Thin admin maintenance console | Product Library UX overhaul |
| Picker **port swap** (data source only) | Picker UX redesign |

---

## 6. Register Entry

Classified work must appear in [Program Backlog Register](../registers/program-backlog-register.md) before sprint start.

---

## 7. Related Documents

- PMO-001 Program Charter (implementation freeze)  
- PMO-005 Change Control Policy  
- [workflows/approval-workflows.md](../workflows/approval-workflows.md)

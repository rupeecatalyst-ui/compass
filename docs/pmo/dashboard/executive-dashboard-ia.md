# Executive PMO Dashboard — Information Architecture

**Document ID:** PMO-DASH-001  
**Owner:** PMO Director  
**Status:** APPROVED (IA only — no UI implementation)  
**Last updated:** 2026-07-21

---

## 1. Purpose

Define the **executive landing page** for Catalyst One program governance. This dashboard presents **governance metrics**, not operational business KPIs (loan volume, pipeline conversion, RM productivity, etc.).

**Route (recommended):** `/admin/pmo` or `/admin/program-dashboard`  
**Audience:** Executive Steering Committee, PMO Director, office leads  
**Data SSOT:** PMO registers under `docs/pmo/registers/` (future: optional `scripts/pmo/` export)

---

## 2. Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Catalyst One Program Dashboard                          [Week of Jul 21] │
│  Overall Production Readiness:  🔴 NOT READY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ROW 1 — Executive summary cards (5 columns)                                │
│  [Architecture] [Infrastructure] [Development] [Certification] [Release]    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ROW 2 — Risk & blockers (2 columns)                                        │
│  [Risk Summary]                    [Critical Issues & Active Blockers]      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ROW 3 — Program pipeline (full width)                                      │
│  [Active Programs table — ID, Office, Gate, RAG, Next milestone]            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ROW 4 — Milestones & decisions (2 columns)                                 │
│  [Upcoming Milestones — 14 days]   [Decisions Required — ESC/ARB]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Section Specifications

### 3.1 Overall Production Readiness

| Field | Source | Current value (snapshot) |
|-------|--------|--------------------------|
| RAG | Derived from gates + critical risks | **Red** |
| Summary | PMO-010 | Master data foundation incomplete; PMO establishing |
| Go-Live target | ESC (future) | TBD |
| Last ESC review | Decision Register | 2026-07-21 |

**RAG logic:**
- **Green:** Gate 5 criteria met or Go-Live approved
- **Amber:** Progressing; critical risks mitigated
- **Red:** Critical blocker or Gate 5 criteria failed

---

### 3.2 Architecture Status

| Metric | Source | Display |
|--------|--------|---------|
| Active ADRs | ADR Register | Count Accepted / Proposed |
| Freeze domains | Architecture Freeze Register | Count + last exception |
| CO-ARCH status | Program Backlog | CO-ARCH-001 phase + gate |
| Pending ADRs | ADR Register | ADR-015 highlighted |

**Current snapshot:**
- ADR-014 Accepted
- ADR-015 Proposed (CO-ARCH-001 tier model)
- CO-ARCH-001: Blueprint approved, Gate 1 partial

**Drill-down:** ADR Register, Architecture Freeze Register, `docs/adr/`

---

### 3.3 Infrastructure Progress

| Metric | Source | Display |
|--------|--------|---------|
| CO-ARCH-001 phase | Program Backlog | I1–I7 progress bar |
| DB tables (masters) | CO-CERTIFICATION-003 audit | 0/15 persisted |
| API namespaces | Integration reports | ECM only vs planned `/api/masters` |
| Open infra risks | Risk Register | RISK-2026-001, 002, 007 |

**Current snapshot:**
- Phase: **Not started** (PMO blocked)
- Master DB compliance: **0/15**

**Drill-down:** Program Backlog CO-ARCH-001-I* rows

---

### 3.4 Development Progress

| Metric | Source | Display |
|--------|--------|---------|
| Active CO-SPRINT | Program Backlog | Count + status |
| Implementation freeze | Decision Register DEC-2026-002 | Active / Lifted |
| Open bugs | Issue Register (type=Implementation) | Count by severity |
| Technical debt | Issue Register | Deferred INFRA items |

**Current snapshot:**
- **Freeze ACTIVE**
- Recent delivery: CO-BLOCKER-002 (complete)

**Drill-down:** Program Backlog, Issue Register

---

### 3.5 Certification Progress

| Metric | Source | Display |
|--------|--------|---------|
| CO-CERTIFICATION programs | Program Backlog | Status per program |
| Production verified count | Certification reports | e.g. CO-BLOCKER-002 ✅ |
| Audit findings | CO-CERTIFICATION-003 | ~11% compliance |
| Pending sign-offs | Decision Register | DEC-2026-006 |

**Current snapshot:**
- CO-BLOCKER-002: Production verified
- CO-CERTIFICATION-003: Not certified

**Drill-down:** `docs/co-*.md`, `docs/certification-screenshots/`

---

### 3.6 Release Readiness

| Metric | Source | Display |
|--------|--------|---------|
| Production URL | Release standard | catalyst-one-two.vercel.app |
| Last deploy | Vercel / release notes | Date + status |
| Pending migrations | Change Register | Manual ops flag |
| Rollback status | Release runbook | Available / Untested |

**Drill-down:** `docs/releases/`, PMO-009

---

### 3.7 Risk Summary

| Metric | Source | Display |
|--------|--------|---------|
| By RAG | Risk Register | Red / Amber / Green counts |
| Top 5 risks | Risk Register | Title, owner, mitigation |
| New this week | Risk Register | Delta |

**Current snapshot:** 2 Red, 4 Amber, 1 Green (accepted)

**Drill-down:** Risk Register full table

---

### 3.8 Critical Issues & Active Blockers

| Metric | Source | Display |
|--------|--------|---------|
| Blockers | Issue Register `Blocker?=Yes` | ISSUE-2026-001, 002, 005 |
| Critical severity | Issue Register | Full list |
| Age | Issue Register | Days open |

**Drill-down:** Issue Register

---

### 3.9 Upcoming Milestones (14 days)

| Milestone | Date | Program | Owner |
|-----------|------|---------|-------|
| PMO foundation ESC approval | 2026-07-21 | PMO-FOUNDATION | ESC |
| ADR-015 ARB review | TBD | CO-ARCH-001 | ARB |
| CO-ARCH-001-I1 kickoff | Post PMO | CO-ARCH-001 | Infrastructure |

**Source:** Program Backlog + Decision Register pending items

---

### 3.10 Decisions Required

| ID | Decision | Authority | Due |
|----|----------|-----------|-----|
| DEC-PENDING-001 | Approve PMO foundation; lift freeze | ESC | Immediate |
| DEC-PENDING-002 | Accept ADR-015 | ARB | Before I1 |

**Source:** Decision Register → Pending section

---

## 4. Data Refresh Model

| Tier | Registers | Refresh |
|------|-----------|---------|
| **Manual (Phase 1)** | Markdown registers updated at milestones | Per PMO ceremony |
| **Semi-auto (Phase 2)** | `scripts/pmo/export-dashboard-data.mjs` parses registers | Weekly CI |
| **Live (Phase 3)** | Admin API reads register JSON | Real-time |

**Phase 1 is sufficient for PMO foundation** — no application code required.

---

## 5. Access Control

| Role | Access |
|------|--------|
| ESC / PMO Director | Full dashboard |
| Office leads | Own office sections + read-only others |
| Developers | Program Backlog + Issue (scoped) |
| Business sponsors | Certification + Release sections |

Recommend `SUPER_ADMIN` + future `PMO_VIEWER` role.

---

## 6. Explicit Exclusions (not on this dashboard)

- Loan pipeline counts, Kanban buckets
- CHANAKYA Radar operational metrics
- RM productivity, revenue KPIs
- Customer-facing analytics

Those belong in **operational** dashboards (Dashboard module, CHANAKYA Radar), not PMO governance.

---

## 7. Implementation Notes (future — post PMO approval)

When Development Office implements UI:

1. Classify as `DEV` or `ENH` with ESC approval
2. Compose using `EnterpriseWorkspaceShell` or Administration Console pattern
3. Read-only — no workflow actions except links to registers/docs
4. Single SSOT: parse `docs/pmo/registers/*.md` or exported JSON
5. Do not duplicate metric formulas from operational modules

---

## Related

- PMO-010 Executive Reporting Framework  
- [registers/program-backlog-register.md](../registers/program-backlog-register.md)

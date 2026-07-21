# Catalyst One — Program Management Office (PMO)

**Program:** Catalyst One PMO Foundation  
**Status:** APPROVED  
**Priority:** Highest  
**Effective:** 2026-07-21

---

## Mission

The PMO is the **central governance authority** for all Catalyst One workstreams. It owns governance—not implementation.

| Office | Owns |
|--------|------|
| Executive Steering Committee | Strategic direction, Go/No-Go, priorities |
| Architecture Review Board | CO-ARCH programs, ADRs, architecture freeze |
| Development Office | CO-SPRINT programs, backlog, bugs |
| Infrastructure Office | CO-ARCH-001, database, APIs, master data, ports |
| Quality & Certification Office | CO-CERTIFICATION programs (independent of implementation) |
| Release Management Office | Deployments, environments, rollback |
| Enterprise Documentation Office | Standards, specs, decision records |
| Risk & Compliance Office | Risk register, compliance, mitigation |

---

## Governance Standards (PMO-001 – PMO-010)

| ID | Document | Path |
|----|----------|------|
| PMO-001 | Program Charter | [standards/PMO-001-program-charter.md](./standards/PMO-001-program-charter.md) |
| PMO-002 | Governance Framework | [standards/PMO-002-governance-framework.md](./standards/PMO-002-governance-framework.md) |
| PMO-003 | Roles & Responsibilities | [standards/PMO-003-roles-responsibilities.md](./standards/PMO-003-roles-responsibilities.md) |
| PMO-004 | Work Classification Standard | [standards/PMO-004-work-classification-standard.md](./standards/PMO-004-work-classification-standard.md) |
| PMO-005 | Change Control Policy | [standards/PMO-005-change-control-policy.md](./standards/PMO-005-change-control-policy.md) |
| PMO-006 | Architecture Governance Policy | [standards/PMO-006-architecture-governance-policy.md](./standards/PMO-006-architecture-governance-policy.md) |
| PMO-007 | Sprint Governance Standard | [standards/PMO-007-sprint-governance-standard.md](./standards/PMO-007-sprint-governance-standard.md) |
| PMO-008 | Certification Governance Standard | [standards/PMO-008-certification-governance-standard.md](./standards/PMO-008-certification-governance-standard.md) |
| PMO-009 | Release Management Standard | [standards/PMO-009-release-management-standard.md](./standards/PMO-009-release-management-standard.md) |
| PMO-010 | Executive Reporting Framework | [standards/PMO-010-executive-reporting-framework.md](./standards/PMO-010-executive-reporting-framework.md) |

---

## Registers

| Register | Path |
|----------|------|
| ADR Register | [registers/adr-register.md](./registers/adr-register.md) |
| Architecture Freeze Register | [registers/architecture-freeze-register.md](./registers/architecture-freeze-register.md) |
| Risk Register | [registers/risk-register.md](./registers/risk-register.md) |
| Issue Register | [registers/issue-register.md](./registers/issue-register.md) |
| Decision Register | [registers/decision-register.md](./registers/decision-register.md) |
| Change Register | [registers/change-register.md](./registers/change-register.md) |
| Program Backlog Register | [registers/program-backlog-register.md](./registers/program-backlog-register.md) |

---

## Workflows & Gates

| Artefact | Path |
|----------|------|
| Approval Workflows | [workflows/approval-workflows.md](./workflows/approval-workflows.md) |
| Stage Gates (Architecture → Production) | [workflows/stage-gates.md](./workflows/stage-gates.md) |

---

## Executive Dashboard

| Artefact | Path |
|----------|------|
| Dashboard Information Architecture | [dashboard/executive-dashboard-ia.md](./dashboard/executive-dashboard-ia.md) |

---

## Repository Layout

[repository-structure.md](./repository-structure.md)

---

## ESC Sign-Off

PMO foundation deliverables complete. Awaiting Executive Steering Committee approval:

**[PMO-FOUNDATION-SIGNOFF.md](./PMO-FOUNDATION-SIGNOFF.md)**

---

## Governance Offices

Office charter summaries: [offices/office-charters-summary.md](./offices/office-charters-summary.md)

---

## Current Program State (snapshot)

| Workstream | ID | Status | Gate |
|------------|-----|--------|------|
| PMO Foundation | PMO-FOUNDATION | **Complete — awaiting ESC approval** | Gate 0 |
| Enterprise Master Data (Infrastructure) | CO-ARCH-001 | Blueprint approved · **blocked until ESC lifts freeze** | Gate 1 partial (ADR-015 pending) |
| Master Data Audit | CO-CERTIFICATION-003 | Audit complete · not certified | — |
| Lead Case / Strategic Workspace | CO-BLOCKER-002 | Production verified | Gate 3/4 met |

**Implementation freeze:** ACTIVE — see `.cursor/rules/pmo-governance.mdc` and DEC-2026-002.

**Next action after ESC approval:** Lift freeze → CO-ARCH-001-I1 + I2 (Infrastructure Office).

---

## Related Paths (existing)

- Architecture Decision Records: `docs/adr/`
- Enterprise engine specs: `docs/enterprise-*.md`, `docs/spr-*.md`
- Certification reports: `docs/co-*.md`, `docs/certification-screenshots/`
- Cursor workspace rules: `.cursor/rules/`
- Releases: `docs/releases/`

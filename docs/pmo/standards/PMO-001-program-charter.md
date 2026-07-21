# PMO-001 — Program Charter

**Document ID:** PMO-001  
**Status:** APPROVED  
**Effective:** 2026-07-21  
**Owner:** Executive Steering Committee

---

## 1. Program Name

**Catalyst One Program Management Office (PMO)**

---

## 2. Purpose

Establish a formally governed **Enterprise Program** control layer for Catalyst One. The PMO governs all workstreams; it does not implement product features.

---

## 3. Scope

### In scope

- Governance framework and standards (PMO-001 – PMO-010)
- Registers: ADR, Architecture Freeze, Risk, Issue, Decision, Change, Program Backlog
- Approval workflows and stage gates
- Executive dashboard information architecture
- Work classification before any implementation begins

### Out of scope

- Product redesign
- Workflow or business journey changes
- New product functionality
- Workspace replacement
- Enterprise architecture changes (except via ADR through ARB)

---

## 4. Mission

The PMO shall govern:

- Architecture
- Development
- Infrastructure
- Certification
- Releases
- Enterprise documentation
- Risks
- Decisions
- Production readiness

---

## 5. Guiding Principles

1. **The PMO owns governance, not implementation.**
2. **Architecture remains frozen** unless changed through an approved ADR.
3. **Workstreams remain independent:** Infrastructure, Development, Certification, Release, Bug Fix, Documentation, Risk.
4. **Every activity must be classified** before work begins (PMO-004).
5. **Executive visibility** through a single Program Dashboard (PMO-010).

---

## 6. Program Offices

See [PMO-002 Governance Framework](./PMO-002-governance-framework.md) and [PMO-003 Roles & Responsibilities](./PMO-003-roles-responsibilities.md).

---

## 7. Implementation Freeze

**Effective immediately:** No new implementation work shall begin until:

1. PMO foundation is complete and approved, and  
2. The work item is classified, registered, and passed through the appropriate stage gate.

**Exception:** Critical production outage remediation (Release Management + Steering Committee notification).

**Next authorized implementation (post-PMO):** CO-ARCH-001-I1 (Reference Master infrastructure) under Infrastructure Office governance.

---

## 8. Success Criteria

- [ ] PMO-001 – PMO-010 published and approved
- [ ] All registers established with initial entries
- [ ] Approval workflows and stage gates documented
- [ ] Executive dashboard IA approved
- [ ] Cursor / agent governance rule active (`.cursor/rules/pmo-governance.mdc`)
- [ ] Steering Committee sign-off on PMO foundation

---

## 9. Related Documents

- PMO-002 Governance Framework
- CO-ARCH-001 Enterprise Master Data Architecture (Infrastructure Office)
- CO-CERTIFICATION-003 Master Data Audit (Quality Office)

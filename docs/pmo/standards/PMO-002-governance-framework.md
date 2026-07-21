# PMO-002 — Governance Framework

**Document ID:** PMO-002  
**Status:** APPROVED  
**Owner:** Executive Steering Committee

---

## 1. Overview

Catalyst One operates as an **Enterprise Program** with eight governance offices under the PMO. Each office owns specific program types and artefacts. Offices coordinate through registers, stage gates, and the Executive Dashboard—they do not duplicate each other's authority.

---

## 2. Governance Offices

### 2.1 Executive Steering Committee (ESC)

| Attribute | Value |
|-----------|-------|
| **Authority** | Highest program authority |
| **Owns** | Strategic direction, priority, Go/No-Go, budget/timebox |
| **Reviews** | Stage Gate 5 (Production Go-Live), escalated risks, program charter changes |

### 2.2 Architecture Review Board (ARB)

| Attribute | Value |
|-----------|-------|
| **Authority** | Architecture freeze, ADRs, enterprise standards |
| **Owns** | CO-ARCH programs, Architecture Freeze Register, ADR Register |
| **Reviews** | Stage Gate 1 (Architecture), all ADRs, CO-ARCH blueprints |

### 2.3 Development Office

| Attribute | Value |
|-----------|-------|
| **Authority** | Feature implementation, sprint delivery, bug backlog |
| **Owns** | CO-SPRINT programs, technical debt register (via Issue Register) |
| **Reviews** | Stage Gate 2 (Development complete), sprint closure |

### 2.4 Infrastructure Office

| Attribute | Value |
|-----------|-------|
| **Authority** | Platform persistence, APIs, master data, migrations, ports |
| **Owns** | CO-ARCH-001 and future infrastructure initiatives |
| **Reviews** | Stage Gate 1b (Infrastructure design), migration deploy approval |
| **Note** | Infrastructure is an **program**, not product redesign |

### 2.5 Quality & Certification Office

| Attribute | Value |
|-----------|-------|
| **Authority** | Independent verification of readiness |
| **Owns** | CO-CERTIFICATION programs |
| **Independence** | Must not own implementation; certifies against standards |
| **Reviews** | Stage Gate 3 (Certification), Stage Gate 4 (Production verification) |

### 2.6 Release Management Office

| Attribute | Value |
|-----------|-------|
| **Authority** | Environments, deployment, rollback, version records |
| **Owns** | Release notes, deployment runbooks, environment config |
| **Reviews** | Every production deploy, Stage Gate 4 release readiness |

### 2.7 Enterprise Documentation Office

| Attribute | Value |
|-----------|-------|
| **Authority** | SSOT for specs, policies, standards, decision records |
| **Owns** | `docs/`, `.cursor/rules/`, PMO standards, engine specs |
| **Reviews** | Documentation completeness at stage gates |

### 2.8 Risk & Compliance Office

| Attribute | Value |
|-----------|-------|
| **Authority** | Risk register, compliance tracking, mitigation |
| **Owns** | Risk Register, compliance observations |
| **Reviews** | All stage gates (risk section), escalations to ESC |

---

## 3. Workstream Independence

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  ARB / CO-ARCH  │     │ Infrastructure   │     │   Development       │
│  (design freeze)│────▶│ CO-ARCH-001      │────▶│ CO-SPRINT (ports)   │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   ▼
                    ┌──────────────────────────┐
                    │ Quality & Certification │
                    │ CO-CERTIFICATION          │
                    └──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │ Release Management        │
                    └──────────────────────────┘
```

- **Infrastructure** delivers platform capability; **Development** consumes via ports (not redesign).
- **Certification** verifies independently; implementation teams do not self-certify.
- **Release** deploys only gate-approved artefacts.

---

## 4. Decision Hierarchy

1. **ESC** — program priority, Go-Live, charter changes  
2. **ARB** — architecture, ADRs, freeze exceptions  
3. **Office owners** — domain decisions within charter  
4. **Change Control** (PMO-005) — all cross-cutting changes  

Escalation path: Implementer → Office Owner → ARB/ESC (as applicable)

---

## 5. Artefact Hierarchy

| Level | Examples |
|-------|----------|
| **Constitutional** | `.cursor/rules/*`, PMO standards, ADRs |
| **Program** | CO-ARCH-001 blueprint, CO-SPRINT specs |
| **Register** | Risk, Issue, Change, Decision entries |
| **Evidence** | Certification screenshots, test reports |
| **Operational** | Release notes, deployment URLs |

---

## 6. Meeting Cadence (recommended)

| Forum | Cadence | Participants |
|-------|---------|--------------|
| ESC review | Monthly / milestone | ESC members |
| ARB review | Per ADR or CO-ARCH phase | ARB + Infrastructure |
| Sprint review | Per CO-SPRINT | Development + PMO |
| Certification board | Per CO-CERTIFICATION | Quality (independent) |
| Release readiness | Per production deploy | Release + Quality |

---

## 7. Related Documents

- PMO-003 Roles & Responsibilities  
- PMO-004 Work Classification Standard  
- [workflows/stage-gates.md](../workflows/stage-gates.md)

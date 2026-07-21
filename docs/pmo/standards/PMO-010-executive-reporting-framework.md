# PMO-010 — Executive Reporting Framework

**Document ID:** PMO-010  
**Status:** APPROVED  
**Owner:** PMO Director

---

## 1. Purpose

Provide **executive visibility** through governance metrics—not operational business KPIs (loan counts, pipeline velocity, etc.).

The Program Dashboard is the executive landing surface (see [dashboard IA](../dashboard/executive-dashboard-ia.md)).

---

## 2. Reporting Cadence

| Report | Audience | Cadence | Owner |
|--------|----------|---------|-------|
| Program Dashboard snapshot | ESC | Weekly / milestone | PMO Director |
| Architecture status | ARB, ESC | Per ADR / CO-ARCH phase | Architecture Lead |
| Infrastructure progress | ESC | Per CO-ARCH-I phase | Infrastructure Lead |
| Certification status | ESC, Business | Per CO-CERTIFICATION | Quality Lead |
| Release readiness | ESC | Per deploy | Release Manager |
| Risk summary | ESC | Weekly | Risk Officer |

---

## 3. Standard Report Sections

Every executive report includes:

1. **Overall Production Readiness** — RAG status  
2. **Active programs** — ID, office, gate, RAG  
3. **Blockers** — from Issue Register  
4. **Critical risks** — from Risk Register  
5. **Upcoming milestones** — next 14 days  
6. **Decisions required** — ESC actions  

---

## 4. RAG Definitions

| Status | Meaning |
|--------|---------|
| **Green** | On track, gate criteria met or imminent |
| **Amber** | At risk, mitigation in place |
| **Red** | Blocked, ESC decision required |

---

## 5. Certification Report Format

Implementation teams use Business & Functional Certification Report (`.cursor/rules/business-functional-certification-report.mdc`).

PMO aggregates certification **status** into dashboard—not duplicate full reports.

---

## 6. Data Sources

| Metric | Source |
|--------|--------|
| Architecture | ADR Register, Freeze Register |
| Infrastructure | Program Backlog (CO-ARCH-001-I*) |
| Development | Program Backlog (CO-SPRINT) |
| Certification | Program Backlog (CO-CERTIFICATION) |
| Release | Release notes, Vercel deployment log |
| Risks | Risk Register |
| Issues | Issue Register |

---

## 7. Related Documents

- [dashboard/executive-dashboard-ia.md](../dashboard/executive-dashboard-ia.md)  
- PMO-001 Program Charter

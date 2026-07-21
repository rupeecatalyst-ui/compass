# Governance Office Charters (Summary)

**Document ID:** PMO-OFFICES-001  
**Owner:** PMO Director  
**Last updated:** 2026-07-21

Deep references: PMO-002 Governance Framework, PMO-003 Roles & Responsibilities.

---

## 1. Executive Steering Committee (ESC)

| Attribute | Value |
|-----------|-------|
| **Mission** | Strategic direction, priority, Go/No-Go |
| **Owns** | Program charter, implementation freeze, Gate 5 |
| **Key artefacts** | Decision Register, Program Backlog priority |
| **Current action** | Approve PMO foundation (DEC-PENDING-001) |

---

## 2. Architecture Review Board (ARB)

| Attribute | Value |
|-----------|-------|
| **Mission** | Architecture governance and freeze |
| **Owns** | CO-ARCH programs, ADR Register, Freeze Register |
| **Key artefacts** | `docs/adr/`, PMO-006 |
| **Current action** | Formalize ADR-015 for CO-ARCH-001 |

---

## 3. Development Office

| Attribute | Value |
|-----------|-------|
| **Mission** | Sprint delivery, bugs, port adoption |
| **Owns** | CO-SPRINT programs |
| **Key artefacts** | Sprint specs, build verification |
| **Current state** | Freeze active — no new sprints |

---

## 4. Infrastructure Office

| Attribute | Value |
|-----------|-------|
| **Mission** | Platform persistence, APIs, master data, migrations |
| **Owns** | CO-ARCH-001 (I1–I7) |
| **Key artefacts** | `prisma/`, `server/`, port layers |
| **Current state** | Blueprint approved; blocked until PMO + ADR-015 |

---

## 5. Quality & Certification Office

| Attribute | Value |
|-----------|-------|
| **Mission** | Independent verification of readiness |
| **Owns** | CO-CERTIFICATION programs |
| **Independence** | Must not implement what it certifies |
| **Key artefacts** | Certification reports, `docs/certification-screenshots/`, verify scripts |
| **Current state** | CO-CERTIFICATION-003 audit complete; CO-BLOCKER-002 production verified |

---

## 6. Release Management Office

| Attribute | Value |
|-----------|-------|
| **Mission** | Environments, deployment, rollback |
| **Owns** | Vercel deploys, release notes |
| **Key artefacts** | `docs/releases/`, PMO-009 |
| **Production URL** | https://catalyst-one-two.vercel.app |

---

## 7. Enterprise Documentation Office

| Attribute | Value |
|-----------|-------|
| **Mission** | SSOT for specs, policies, standards |
| **Owns** | `docs/`, `.cursor/rules/`, PMO standards |
| **Key artefacts** | PMO-001–010, engine specs |
| **Current state** | PMO foundation documentation in progress |

---

## 8. Risk & Compliance Office

| Attribute | Value |
|-----------|-------|
| **Mission** | Risk register, compliance, mitigation |
| **Owns** | Risk Register |
| **Key artefacts** | `docs/pmo/registers/risk-register.md` |
| **Current state** | 7 active risks tracked; 2 critical (Red) |

---

## Related

- [../standards/PMO-002-governance-framework.md](../standards/PMO-002-governance-framework.md)  
- [../standards/PMO-003-roles-responsibilities.md](../standards/PMO-003-roles-responsibilities.md)

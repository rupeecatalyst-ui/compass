# PMO-003 — Roles & Responsibilities

**Document ID:** PMO-003  
**Status:** APPROVED  
**Owner:** Executive Steering Committee

---

## 1. Role Matrix

| Role | Primary office | Responsibilities |
|------|----------------|------------------|
| **Program Sponsor** | ESC | Executive accountability, funding, Go/No-Go |
| **PMO Director** | PMO | Cross-office coordination, dashboard, registers |
| **Architecture Lead** | ARB | ADRs, freeze register, CO-ARCH approval |
| **Infrastructure Lead** | Infrastructure | CO-ARCH-001, migrations, APIs, master data platform |
| **Development Lead** | Development | CO-SPRINT delivery, backlog, port adoption |
| **Quality Lead** | Quality & Certification | CO-CERTIFICATION, independent verification |
| **Release Manager** | Release Management | Deploy, rollback, environment parity |
| **Documentation Lead** | Enterprise Documentation | SSOT docs, standards maintenance |
| **Risk Officer** | Risk & Compliance | Risk register, mitigation tracking |
| **Business Certification Admin** | Quality | Frozen cert credentials, UAT sign-off |

---

## 2. RACI — Key Activities

| Activity | ESC | ARB | Infra | Dev | Quality | Release | Docs | Risk |
|----------|-----|-----|-------|-----|---------|---------|------|------|
| Approve CO-ARCH blueprint | A | R | C | I | I | I | C | C |
| Approve ADR | I | A/R | C | C | I | I | C | I |
| Classify work request | C | C | C | R | C | C | I | I |
| Implement infrastructure | I | C | A/R | C | I | C | I | I |
| Implement feature/port swap | I | C | C | A/R | I | C | I | I |
| Certify program | A | I | I | I | R | C | C | C |
| Production deploy | A | I | C | I | C | R | I | C |
| Update risk register | I | C | C | C | C | C | I | A/R |
| Change architecture freeze | A | R | C | I | I | I | C | C |

**R** = Responsible · **A** = Accountable · **C** = Consulted · **I** = Informed

---

## 3. Cursor / AI Agent Role

AI development agents operating in this repository:

- **Must** classify work before implementation (PMO-004)
- **Must not** begin implementation during PMO foundation freeze
- **Must** treat CO-ARCH-001 as infrastructure program (not product redesign)
- **Must** update registers when directed by human program owners
- **Must** follow `.cursor/rules/pmo-governance.mdc`

Agents implement; PMO governs.

---

## 4. Certification Environment Roles

| Role | Frozen value | Governance |
|------|--------------|------------|
| Business Certification Admin | `admin@compass.com` (per certification contract) | Quality Office — no change without ESC approval |
| Production Super Admin | `admin@rupeecatalyst.com` | Release + Quality verification |

---

## 5. Escalation

| Condition | Escalate to |
|-----------|-------------|
| Architecture freeze conflict | ARB |
| Certification failure | Quality → ESC if blocker |
| Production incident | Release → ESC |
| Risk score High/Critical | Risk → ESC |
| Scope creep (product redesign in infra program) | Infrastructure Lead → ARB |

---

## 6. Related Documents

- PMO-004 Work Classification Standard  
- PMO-008 Certification Governance Standard

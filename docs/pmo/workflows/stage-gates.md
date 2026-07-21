# Stage Gates — Architecture through Production

**Document ID:** PMO-WF-002  
**Owner:** PMO Director  
**Last updated:** 2026-07-21

---

## Overview

Stage gates control progression from architecture approval to production Go-Live. Each gate has **entry criteria**, **review authority**, and **exit artefacts**.

```
Gate 0          Gate 1           Gate 1b              Gate 2              Gate 3              Gate 4              Gate 5
Program         Architecture     Infrastructure       Development         Certification       Release             Production
Charter         Approved         Platform Ready       Complete            Passed              Ready               Go-Live
   │                │                  │                   │                   │                   │                   │
 PMO-001          ARB              Infrastructure      Development         Quality             Release              ESC
```

---

## Gate 0 — Program Charter

| Attribute | Detail |
|-----------|--------|
| **Authority** | ESC |
| **Purpose** | Authorize program existence, scope, and priority |
| **Entry** | Business case or directive |
| **Exit criteria** | Program ID assigned; owner office named; backlog entry |
| **Artefacts** | PMO-001 charter or program spec; Program Backlog row |

**Current:** PMO-FOUNDATION at Gate 0 → awaiting ESC approval to complete.

---

## Gate 1 — Architecture Approved

| Attribute | Detail |
|-----------|--------|
| **Authority** | ARB |
| **Purpose** | Freeze architecture direction via ADR or approved blueprint |
| **Entry** | Classified ARCH work; ADR or CO-ARCH blueprint draft |
| **Exit criteria** | ADR Accepted **or** blueprint approved; Freeze Register updated |
| **Artefacts** | ADR in `docs/adr/`; ADR Register; Decision Register |

**Current:** CO-ARCH-001 blueprint **approved**; ADR-015 **pending** → Gate 1 partial.

---

## Gate 1b — Infrastructure Platform Ready

| Attribute | Detail |
|-----------|--------|
| **Authority** | Infrastructure Office + ARB consult |
| **Purpose** | Database, API, ports deliver platform capability (not UI redesign) |
| **Entry** | Gate 1 met; CO-ARCH-001-I* phase scoped |
| **Exit criteria** | Migration applied (if DB); API smoke passes; rollback documented |
| **Artefacts** | Migration in `prisma/migrations/`; verify script; integration report |

**Applies to:** CO-ARCH-001-I1, I2, I4, etc.

**Current:** **Not entered** — blocked until PMO complete + ADR-015.

---

## Gate 2 — Development Complete

| Attribute | Detail |
|-----------|--------|
| **Authority** | Development Office |
| **Purpose** | Feature / port adoption complete per sprint charter |
| **Entry** | Gate 1b exit (for port swaps) or classified DEV scope |
| **Exit criteria** | Build pass; TypeScript/lint; no architecture violation; Vercel deploy |
| **Artefacts** | Sprint report; modified files list; deployment URL |

**Applies to:** CO-SPRINT programs, CO-ARCH-001-I5/I6 port swaps.

---

## Gate 3 — Certification Passed

| Attribute | Detail |
|-----------|--------|
| **Authority** | Quality & Certification Office (**independent**) |
| **Purpose** | Prove readiness against documented criteria |
| **Entry** | Gate 2 exit or CERT-only program (audit) |
| **Exit criteria** | Criteria met; production verification (if required); report published |
| **Artefacts** | Business & Functional Certification Report; screenshots in `docs/certification-screenshots/` |

**Current examples:**
- CO-BLOCKER-002: **Gate 3/4 met** — production verified, pending business sign-off
- CO-CERTIFICATION-003: **Audit only** — not certified (~11%)

---

## Gate 4 — Release Ready

| Attribute | Detail |
|-----------|--------|
| **Authority** | Release Management Office + Quality sign-off |
| **Purpose** | Production deployment safe and documented |
| **Entry** | Gate 3 passed (or hotfix emergency path) |
| **Exit criteria** | Deploy successful; manual ops disclosed; release notes; rollback identified |
| **Artefacts** | `docs/releases/` entry; Vercel production URL; Change Register closed |

---

## Gate 5 — Production Go-Live

| Attribute | Detail |
|-----------|--------|
| **Authority** | ESC |
| **Purpose** | Authorize production business operation |
| **Entry** | All critical programs Gate 4; Risk Register acceptable; CO-CERTIFICATION-GoLive |
| **Exit criteria** | ESC Go/No-Go; production readiness checklist complete |
| **Artefacts** | Go-Live decision in Decision Register; executive dashboard Green |

**Current:** **Not ready** — RISK-2026-001 (master data), CO-CERTIFICATION-003 open.

---

## Gate Checklist Summary (CO-ARCH-001 path)

| Phase | Target gate | Key proof |
|-------|-------------|-----------|
| PMO Foundation | Gate 0 | ESC approval, registers live |
| ADR-015 | Gate 1 | ADR Accepted |
| CO-ARCH-001-I1 + I2 | Gate 1b | Schema + Reference Master API |
| CO-ARCH-001-I5/I6 | Gate 2 | Port swaps, build pass |
| CO-CERTIFICATION-004 | Gate 3 | API certification |
| Production deploy | Gate 4 | Release notes |
| Go-Live | Gate 5 | ESC decision |

---

## Related

- [approval-workflows.md](./approval-workflows.md)  
- PMO-008 Certification Governance Standard  
- PMO-009 Release Management Standard

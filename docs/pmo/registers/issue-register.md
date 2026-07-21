# Issue Register

**Owner:** PMO Director (operational); Development Office (bugs)  
**Last updated:** 2026-07-21

---

## Active Issues

| ID | Title | Type | Severity | Program | Owner | Blocker? | Status |
|----|-------|------|----------|---------|-------|----------|--------|
| ISSUE-2026-001 | PMO foundation awaiting ESC approval — implementation freeze active | Governance | Critical | PMO-FOUNDATION | PMO Director | Yes | Awaiting ESC |
| ISSUE-2026-002 | Enterprise Master Data ~11% compliance (CO-CERTIFICATION-003) | Certification | Critical | CO-CERTIFICATION-003 | Quality | Yes (Go-Live) | Open |
| ISSUE-2026-003 | Credit Risk admin lenders/products/property pages are placeholders | Implementation | Medium | CO-ARCH-001 | Infrastructure | No | Deferred (INFRA) |
| ISSUE-2026-004 | Product Library in-memory only (no persistence) | Data | High | CO-ARCH-001 | Infrastructure | No | Deferred (INFRA) |
| ISSUE-2026-005 | ADR-015 formalized for CO-ARCH-001 tier model | Architecture | Medium | CO-ARCH-001 | ARB | No | Resolved (ADR-015 Accepted) |
| ISSUE-2026-006 | CO-ARCH-001-I1 migration not deployed to Supabase | Infrastructure | High | CO-ARCH-001-I1 | Infrastructure | Yes (I1 Gate 1b) | Open |

---

## Resolved Issues

| ID | Title | Resolved | Program | Resolution |
|----|-------|----------|---------|------------|
| ISSUE-2026-010 | Lead Case / Strategic Workspace persistence (CO-BLOCKER-002) | 2026-07-21 | CO-BLOCKER-002 | Production verified on catalyst-one-two.vercel.app |
| ISSUE-2026-011 | Auth 404 on Vercel login | 2026-07-07 | CO-SPRINT-17 | ADR-014 — Next.js Route Handlers |

---

## Severity Definitions

| Level | Definition |
|-------|------------|
| **Critical** | Blocks certification, Go-Live, or program gate |
| **High** | Major capability gap; workaround exists |
| **Medium** | Degraded experience; scheduled fix |
| **Low** | Cosmetic or documentation |

---

## Related

- [risk-register.md](./risk-register.md)  
- [program-backlog-register.md](./program-backlog-register.md)

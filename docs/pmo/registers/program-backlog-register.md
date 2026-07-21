# Program Backlog Register

**Owner:** PMO Director  
**Last updated:** 2026-07-21

---

## Active Programs

| Program ID | Name | Classification | Office | Gate | RAG | Status | Next milestone |
|------------|------|----------------|--------|------|-----|--------|----------------|
| PMO-FOUNDATION | Catalyst One PMO Foundation | DOC | PMO | Gate 0 | Green | **Complete — awaiting ESC** | ESC sign-off ([sign-off package](./PMO-FOUNDATION-SIGNOFF.md)) |
| CO-ARCH-001 | Enterprise Master Data (Infrastructure) | INFRA | Infrastructure | Gate 1b | Green | I1+I2 complete | I3 seed scripts |
| CO-CERTIFICATION-003 | Enterprise Master Data Foundation Audit | CERT | Quality | — | Red | Audit complete · Not certified | Remediation via CO-ARCH-001 |
| CO-BLOCKER-002 | Lead Case / Strategic Workspace persistence | CERT/DEV | Quality | Gate 4 | Green | Production verified | Business sign-off (DEC-2026-006) |

---

## CO-ARCH-001 Infrastructure Phases (planned)

| Phase | Name | Gate | Depends on | Status |
|-------|------|------|------------|--------|
| CO-ARCH-001-I1 | Tier 0 metadata schema + migration | Gate 1b | PMO approval, ADR-015 | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-I2 | Reference Master framework + CRUD API | Gate 1b | I1 | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-I3 | Seed / backfill scripts | Gate 2 | I2 | Not started |
| CO-ARCH-001-I4 | Tier 2 Product / Lender / Document registries | Gate 1b | I2 | Not started |
| CO-ARCH-001-I5 | Client ports + dual-read adapters | Gate 2 | I4 | Not started |
| CO-ARCH-001-I6 | Picker port swaps (data source only) | Gate 2 | I5 | Not started |
| CO-ARCH-001-I7 | Thin admin maintenance console | Gate 2 | I2 | Not started |

---

## Recent CO-SPRINT Programs (reference)

| Program ID | Name | Status | Notes |
|------------|------|--------|-------|
| CO-SPRINT-117 | ECM foundation | Complete | Baseline audit |
| CO-SPRINT-118 | Enterprise baseline v1 | Complete | Prisma baseline |
| CO-SPRINT-119 | Soft delete | Complete | Ledger + adapters |
| CO-SPRINT-112 | Workspace intelligence scope | Complete | Layer 2 ribbon |
| CO-SPRINT-106 | Enterprise workspace layout | Complete | Frozen standard |

---

## Backlog (not started — post-PMO)

| Program ID | Name | Classification | Priority | Blocked by |
|------------|------|----------------|----------|------------|
| CO-CERTIFICATION-004 | CO-ARCH-001-I2 API certification | CERT | High | I2 complete |
| CO-CERTIFICATION-GoLive | Production Go-Live readiness | CERT | Highest | CO-ARCH-001 + all gates |

---

## Program Status Values

| Status | Meaning |
|--------|---------|
| Not started | Approved but no work begun |
| In progress | Active work under office |
| Blocked | Waiting on gate, dependency, or decision |
| Complete | Gate passed, evidence recorded |
| Deferred | Explicitly postponed by ESC |

---

## Related

- PMO-004 Work Classification Standard  
- [workflows/stage-gates.md](../workflows/stage-gates.md)

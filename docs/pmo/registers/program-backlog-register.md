# Program Backlog Register

**Owner:** PMO Director  
**Last updated:** 2026-07-24

---

## Active Programs

| Program ID | Name | Classification | Office | Gate | RAG | Status | Next milestone |
|------------|------|----------------|--------|------|-----|--------|----------------|
| PMO-FOUNDATION | Catalyst One PMO Foundation | DOC | PMO | Gate 0 | Green | **Complete — awaiting ESC** | ESC sign-off ([sign-off package](./PMO-FOUNDATION-SIGNOFF.md)) |
| CO-ARCH-001 | Enterprise Master Data (Infrastructure) | INFRA | Infrastructure | Gate 1b | Green | Wave 5 complete · Prod deployed | ESC Go-Live (Proceed with Conditions) |
| CO-CERTIFICATION-003 | Enterprise Master Data Foundation Audit | CERT | Quality | — | Red | Audit complete · Not certified | Remediation via CO-ARCH-001 |
| CO-BLOCKER-002 | Lead Case / Strategic Workspace persistence | CERT/DEV | Quality | Gate 4 | Green | Production verified | Business sign-off (DEC-2026-006) |
| **FS-01** | Opportunity Runtime Stabilization | FOUNDATION | Architecture | BAT | Red | **Implementation Complete · Business Certification BLOCKED** (auth + Lender Pipeline hydrate) | Product Owner re-BAT after blocker deploy · then **"FS-01 Approved"** |
| **FS-02** | Deal Runtime Separation | FOUNDATION | Architecture | — | — | **Not started** (backlog from FS-01 BAT observations) | After FS-01 certified & frozen |

---

## CO-ARCH-001 Infrastructure Phases (planned)

| Phase | Name | Gate | Depends on | Status |
|-------|------|------|------------|--------|
| CO-ARCH-001-I1 | Tier 0 metadata schema + migration | Gate 1b | PMO approval, ADR-015 | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-I2 | Reference Master framework + CRUD API | Gate 1b | I1 | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-I3 | Seed / backfill scripts | Gate 2 | I2 | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-I4a | Tier 2 Product Registry foundation | Gate 1b | I2 | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-I4b | Tier 2 Document Registry foundation | Gate 1b | I2 | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-I5a | Reference Master client ports + dual-read | Gate 2 | I3 | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-I7 | Reference Master thin admin console | Gate 2 | I2+I3 | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-I4c | Tier 2 Lender Registry foundation | Gate 1b | I2+I3 | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-I5b | Product/Document/Lender client ports | Gate 2 | I4 | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-I6a | Tier 1 Reference Master picker swaps | Gate 2 | I5a | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-I6b | Tier 2 picker port swaps | Gate 2 | I5b | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-W4-SEED | Tier 2 Product/Document/Lender seed | Gate 2 | I4a/b/c | ✅ Complete | 2026-07-21 |
| CO-ARCH-001-W4-QUAL | Quality / Dry Run prep (no execution) | Gate 2 | I6a/I6b | ✅ Complete | 2026-07-21 |
| CO-CERTIFICATION-003 | Master data foundation re-test | CERT | Wave 4 | ✅ PASS (Wave 5) | 2026-07-21 |
| CO-ARCH-001-W5-DRY | Dry Run execution D1–D4 | Gate 2 | Wave 4 | ✅ PASS | 2026-07-21 |
| CO-ARCH-001-W5-READY | Production readiness + Go-Live recommendation | Gate 2 | Wave 5 | ✅ Submitted — Proceed with Conditions | 2026-07-21 |
| CO-ARCH-001-GOLIVE | Production go-live | ESC | ESC approval | ⏸️ Awaiting ESC |

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
| **FS-02** | Deal Runtime Separation (confirmation modal, Deal orchestration, Lender Pipeline sync, enterprise messaging) | FOUNDATION | Highest | FS-01 frozen · sprint open |

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

# Change Register

**Owner:** PMO Director  
**Last updated:** 2026-07-21  
**Policy:** PMO-005 Change Control Policy

---

## Active Changes

| ID | Date | Summary | Category | Type | Requestor | Approver | Status |
|----|------|---------|----------|------|-----------|----------|--------|
| CHG-2026-001 | 2026-07-21 | Establish PMO folder structure and PMO-001–010 standards | DOC | Standard | PMO | ESC | Complete |
| CHG-2026-002 | 2026-07-21 | Create PMO registers (ADR, Risk, Issue, Decision, Change, Backlog) | DOC | Standard | PMO | PMO Director | Complete |
| CHG-2026-003 | 2026-07-21 | Add `.cursor/rules/pmo-governance.mdc` — classification + freeze | DOC | Standard | PMO | PMO Director | Complete |
| CHG-2026-004 | 2026-07-21 | CO-ARCH-001-I1: Tier 0 metadata Prisma schema + migration | INFRA | Significant | Infrastructure | ARB + Infrastructure | Complete — deploy pending |
| CHG-2026-005 | TBD | CO-ARCH-001-I2: Reference Master CRUD API | INFRA | Significant | Infrastructure | ARB + Infrastructure | Blocked (PMO) |

---

## Completed Changes

| ID | Date | Summary | Category | Closed |
|----|------|---------|----------|--------|
| CHG-2026-010 | 2026-07-07 | Auth gateway migration to Next.js (ADR-014) | INFRA | 2026-07-07 |
| CHG-2026-011 | 2026-07-21 | CO-BLOCKER-002 Lead Case persistence fix | DEV | 2026-07-21 |

---

## Frozen Items (Major change always — PMO-005)

| Item | Last verified | Change requires |
|------|---------------|-----------------|
| Certification admin `admin@compass.com` | 2026-07-21 | ESC + Quality |
| Auth provider configuration | 2026-07-21 | ESC + ARB |
| Demo seed users (certification) | 2026-07-21 | ESC + Quality |
| Vercel project / production DB target | 2026-07-21 | ESC + Release |

---

## Change Types

| Type | Approval |
|------|----------|
| Standard | Office owner |
| Significant | ARB or Quality + Office owner |
| Major | ESC + ARB |
| Emergency | Release Manager + ESC notification |

---

## Related

- PMO-005 Change Control Policy  
- [decision-register.md](./decision-register.md)

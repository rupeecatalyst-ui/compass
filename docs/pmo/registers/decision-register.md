# Decision Register

**Owner:** PMO Director  
**Last updated:** 2026-07-21

---

## Program Decisions

| ID | Date | Decision | Authority | Program | Rationale | Status |
|----|------|----------|-----------|---------|-----------|--------|
| DEC-2026-001 | 2026-07-21 | Catalyst One transitions to formally governed Enterprise Program via PMO | ESC | PMO-FOUNDATION | Centralize governance before further implementation | Approved |
| DEC-2026-002 | 2026-07-21 | Implementation freeze until PMO foundation complete | ESC | PMO-FOUNDATION | No ungoverned work during governance establishment | Active |
| DEC-2026-003 | 2026-07-21 | CO-ARCH-001 approved as **infrastructure program** (port swaps, not product redesign) | ARB | CO-ARCH-001 | Separate platform delivery from UX/feature work | Approved |
| DEC-2026-004 | 2026-07-21 | Hybrid Tier 0–3 master data architecture for CO-ARCH-001 | ARB | CO-ARCH-001 | Tier 0 metadata + Reference Master + Product/Lender/Document + operational entities | Approved |
| DEC-2026-005 | 2026-07-07 | Migrate auth gateway to Next.js Route Handlers only | ARB | CO-SPRINT-17 / ADR-014 | Vercel cannot run Express; preserve shared auth service | Implemented |
| DEC-2026-006 | 2026-07-21 | CO-BLOCKER-002 production verified — ready for business sign-off | Quality | CO-BLOCKER-002 | Full production proof on Vercel | Pending sign-off |
| DEC-2026-007 | 2026-07-21 | CO-CERTIFICATION-003 audit complete — **not certified** (~11% compliance) | Quality | CO-CERTIFICATION-003 | 0/15 masters as DB tables; parallel SSOTs documented | Recorded |

---

## Pending Decisions (ESC / ARB)

| ID | Question | Options | Target date | Owner |
|----|----------|---------|-------------|-------|
| DEC-PENDING-001 | Approve PMO foundation and lift implementation freeze for CO-ARCH-001-I1 | Approve / Defer / Revise | 2026-07-21 | ESC |
| DEC-PENDING-002 | Formalize ADR-015 for CO-ARCH-001 tier model | Accept ADR / Revise blueprint | Before I1 | ARB |

---

## Related

- [change-register.md](./change-register.md)  
- [adr-register.md](./adr-register.md)  
- PMO-005 Change Control Policy

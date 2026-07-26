# CO-ARCH FS-02 — Deal Runtime Separation (BACKLOG ONLY)

**Status:** NOT STARTED · Backlog reserved for after FS-01 Product Owner certification  
**Sprint:** FS-02  
**Depends on:** FS-01 FOUNDATION CERTIFIED · FROZEN (only after Product Owner **"FS-01 Approved"**)  
**Rule:** Do **not** implement until FS-02 is formally opened. No work under FS-01.

---

## Alignment (2026-07-25)

Product Architecture opened a **separate** Deal Workspace Identity Architecture Assessment:

- `docs/co-arch-003/CO-ARCH-DEAL-WORKSPACE-IDENTITY-ASSESSMENT.md`  
- Pre-Launch Single Implementation Rule: `.cursor/rules/pre-launch-single-implementation.mdc`

FS-02 items below should be **aligned or subsumed** under that programme when opened, so Deal identity and Deal runtime do not fork into dual tracks. ADR-018 remains frozen.

---

## Objective (future)

Separate Deal runtime authority from Opportunity planning runtime.  
Complete Opportunity → Deal transition orchestration with enterprise UX and messaging.

---

## Technical debt / BAT carry-forward (from FS-01)

Observed during FS-01 BAT prep; **out of FS-01 scope** (post–Opportunity lifecycle).  
Do not block Product Owner FS-01 certification on these items.

| ID | Item | Classification | Priority |
|----|------|----------------|----------|
| FS-02-TD-001 | Replace Move to Deal `window.confirm` with Enterprise Confirmation Modal | UX / Debt | High |
| FS-02-TD-002 | Complete Opportunity → Deal transition orchestration | Architecture | Highest |
| FS-02-TD-003 | Complete Deal creation transaction | Architecture | Highest |
| FS-02-TD-004 | Complete Lender Pipeline synchronization | Architecture | High |
| FS-02-TD-005 | Replace technical synchronization messages with business-friendly enterprise messaging | UX / Debt | High |

---

## Related frozen reference

- FS-01: `docs/co-arch-003/CO-ARCH-FS-01-OPPORTUNITY-RUNTIME-STABILIZATION.md`  
- Cursor: `.cursor/rules/opportunity-runtime-fs01.mdc`  
- Deal Workspace Identity Assessment: `docs/co-arch-003/CO-ARCH-DEAL-WORKSPACE-IDENTITY-ASSESSMENT.md`

---

## Gate

FS-02 implementation may begin only after explicit sprint open.  
Strict sprint discipline: no FS-02 code inside FS-01 freeze window.

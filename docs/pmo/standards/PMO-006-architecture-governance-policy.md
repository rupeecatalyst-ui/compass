# PMO-006 — Architecture Governance Policy

**Document ID:** PMO-006  
**Status:** APPROVED  
**Owner:** Architecture Review Board

---

## 1. Architecture Freeze

Enterprise architecture is **frozen** unless changed through an approved **Architecture Decision Record (ADR)**.

Frozen elements include (non-exhaustive):

- Tier 0 / 1 / 2 / 3 master data model (CO-ARCH-001)
- ECM party registry model
- Navigation architecture (`.cursor/rules/navigation-architecture.mdc`)
- Enterprise workspace UX layers
- Chanakya operating principles
- Business journey navigation order
- System-driven enterprise principles

See [Architecture Freeze Register](../registers/architecture-freeze-register.md).

---

## 2. ADR Requirements

| Requirement | Detail |
|-------------|--------|
| Location | `docs/adr/ADR-NNN-title.md` |
| Register | [ADR Register](../registers/adr-register.md) |
| Status values | Proposed · Accepted · Superseded · Rejected |
| Approval | ARB before implementation |
| Supersedes | Must reference prior ADR |

---

## 3. CO-ARCH Programs

Architecture programs (`CO-ARCH-*`) are owned by ARB:

| Program | Status |
|---------|--------|
| CO-ARCH-001 Enterprise Master Data | Blueprint APPROVED · Infrastructure program |

CO-ARCH deliverables are **infrastructure**, not product redesign (PMO-004).

---

## 4. Architecture Review Triggers

ARB review required for:

- New Prisma models affecting enterprise SSOT
- New API namespaces (`/api/masters`, `/api/products`, etc.)
- Changes to authentication or org model
- New enterprise engines or persistence modes
- Exceptions to `.cursor/rules/` frozen standards

---

## 5. Related Documents

- [registers/adr-register.md](../registers/adr-register.md)  
- [registers/architecture-freeze-register.md](../registers/architecture-freeze-register.md)  
- PMO-005 Change Control Policy

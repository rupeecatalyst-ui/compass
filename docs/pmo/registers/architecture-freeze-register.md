# Architecture Freeze Register

**Owner:** Architecture Review Board  
**Last updated:** 2026-07-21  
**Policy:** PMO-006 — Architecture frozen unless changed via approved ADR

---

## Frozen Domains

| Domain | Freeze authority | Reference | Exception path |
|--------|------------------|-----------|----------------|
| Authentication gateway (Next.js Route Handlers) | ARB | ADR-014 | New ADR |
| Navigation architecture (3-column, primary nav order) | ARB | `.cursor/rules/navigation-architecture.mdc` | ADR + ESC |
| Business journey order (Contact → … → Closure) | ARB | `.cursor/rules/enterprise-business-journey-navigator.mdc` | ADR + ESC |
| Enterprise workspace UX layers (CO-SPRINT-106) | ARB | `.cursor/rules/enterprise-workspace-layout-standard.mdc` | ADR |
| Chanakya operating principles (non-blocking) | ARB | `.cursor/rules/chanakya-operating-principles.mdc` | ADR |
| Workspace vs Enterprise intelligence scope | ARB | `.cursor/rules/workspace-intelligence-scope.mdc` | ADR |
| Progressive contact creation | ARB | `.cursor/rules/progressive-contact-creation.mdc` | ADR |
| Context-aware data collection | ARB | `.cursor/rules/context-aware-data-collection.mdc` | ADR |
| System-driven enterprise principles | ARB | `.cursor/rules/system-driven-enterprise.mdc` | ADR |
| Enterprise Decision Ledger constitution | ARB | `.cursor/rules/enterprise-decision-ledger.mdc` | ADR |
| Single metric implementation (SSOT) | ARB | `.cursor/rules/enterprise-metric-single-implementation.mdc` | ADR |
| ECM party registry (contacts, companies) | ARB | `prisma/schema.prisma`, ECM APIs | CO-ARCH-001 ADR |
| Enterprise Master Data tier model (Tier 0–3) | ARB | CO-ARCH-001 blueprint | ADR-015 (pending) |

---

## Pending Freeze (awaiting ADR formalization)

| Domain | Proposed freeze date | ADR |
|--------|---------------------|-----|
| Reference Master schema (Tier 1) | Post CO-ARCH-001-I2 | ADR-015 |
| Product / Lender / Document registries (Tier 2) | Post CO-ARCH-001-I4 | TBD |
| Master data API namespace (`/api/masters/*`) | Post CO-ARCH-001-I2 | TBD |

---

## Exception Log

| Date | Domain | Requestor | Decision | ADR / Change |
|------|--------|-----------|----------|--------------|
| — | — | — | — | — |

---

## Related

- [adr-register.md](./adr-register.md)  
- PMO-006 Architecture Governance Policy

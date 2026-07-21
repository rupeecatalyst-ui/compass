# PMO Repository Structure

**Document ID:** PMO-REPO-001  
**Status:** APPROVED  
**Parent:** PMO Foundation Program

---

## Purpose

Single canonical layout for PMO governance assets within the Catalyst One repository. Implementation code remains in existing paths; PMO assets live under `docs/pmo/`.

---

## Recommended Tree

```
docs/
├── pmo/                              # PMO SSOT — governance only
│   ├── README.md                     # Program index (this hub)
│   ├── repository-structure.md       # This document
│   ├── standards/                    # PMO-001 … PMO-010
│   ├── registers/                    # Living registers (updated per change)
│   ├── workflows/                    # Approvals, stage gates
│   ├── dashboard/                    # Executive dashboard IA (no UI code here)
│   └── offices/                      # Office charters (optional deep-dives)
├── adr/                              # Architecture Decision Records (ADR-NNN-*.md)
├── releases/                         # Release notes (vX.Y.Z-*.md)
├── certification-screenshots/        # Evidence artefacts (CO-* folders)
├── co-*.md                           # Certification / integration reports
├── enterprise-*.md                   # Engine specifications
└── spr-*.md                          # Sprint program specifications

.cursor/rules/                      # Frozen enterprise standards (agent + dev policy)
│   ├── pmo-governance.mdc            # Work classification + implementation freeze
│   ├── business-functional-certification-report.mdc
│   └── … (module / UX standards)

prisma/
├── schema.prisma
├── migrations/
└── seed/                             # Future: co-arch-001-masters.ts (Infrastructure Office)

scripts/
├── co-*-verify.mjs                   # Certification smoke (Quality Office)
└── pmo/                              # Future: register export / dashboard data (optional)

server/                               # Implementation (Development / Infrastructure)
src/                                  # Application (Development)
```

---

## Naming Conventions

| Asset type | Pattern | Example |
|------------|---------|---------|
| Architecture program | `CO-ARCH-NNN` | CO-ARCH-001 |
| Certification program | `CO-CERTIFICATION-NNN` | CO-CERTIFICATION-003 |
| Development sprint | `CO-SPRINT-NNN` | CO-SPRINT-119 |
| Blocker / hotfix | `CO-BLOCKER-NNN`, `CO-HOTFIX-NNN` | CO-BLOCKER-002 |
| ADR | `ADR-NNN-short-title.md` | ADR-014-authentication-gateway-migration.md |
| PMO standard | `PMO-NNN-short-title.md` | PMO-004-work-classification-standard.md |
| Register entry ID | `{REG}-{YYYY}-{SEQ}` | RISK-2026-001 |

---

## What Does NOT Belong in PMO Paths

- Application source code (`src/`, `server/`)
- UI components
- Database migrations (stay in `prisma/migrations/`)
- Environment secrets (`.env.local` — never commit)

PMO paths hold **governance artefacts only**.

---

## Register Update Protocol

1. Author proposes change via Change Register entry (PMO-005).
2. Owning office reviews (ARB, Infrastructure, Quality, etc.).
3. On approval, update the relevant register markdown file in the same commit/milestone as the decision.
4. Reference ADR or Decision Register ID in commit message when applicable.

---

## Integration with Git

| Event | PMO action |
|-------|------------|
| End of certified sprint | Update Program Backlog Register + Certification evidence |
| Architecture approval | New ADR in `docs/adr/` + ADR Register row |
| Production release | Release notes in `docs/releases/` + Release Management sign-off |
| Risk identified | Risk Register row |
| Implementation blocked | Issue Register row |

Git commit policy for PMO: milestone commits at end-of-day or certified milestones (per `github-vercel-deployment-policy.mdc`).

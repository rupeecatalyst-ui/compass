# PMO-007 — Sprint Governance Standard

**Document ID:** PMO-007  
**Status:** APPROVED  
**Owner:** Development Office

---

## 1. Scope

Governs **CO-SPRINT** development programs. Does not govern CO-ARCH (Infrastructure) or CO-CERTIFICATION (Quality)—those have separate gates.

---

## 2. Sprint Lifecycle

| Phase | Activities | Gate |
|-------|------------|------|
| **Intake** | Classify (PMO-004), backlog entry, office assignment | — |
| **Plan** | Scope, dependencies, no architecture drift | ARB consult if ARCH-touched |
| **Build** | Implement per charter; build + TypeScript + lint | — |
| **Review** | Code review, no duplicate business logic (SSOT) | — |
| **Deploy** | Vercel per deployment policy | Release Office |
| **Close** | Sprint report, backlog update | Development Gate |

---

## 3. Sprint Naming

`CO-SPRINT-NNN` — registered in Program Backlog Register with owner and status.

---

## 4. Rules During Implementation Freeze

- No new CO-SPRINT may start without ESC exception until PMO foundation approved.
- CO-ARCH-001 infrastructure phases use `CO-ARCH-001-I*` naming under Infrastructure Office—not CO-SPRINT.
- Port-swap adoption sprints are **DEV** classification, depend on infrastructure gate completion.

---

## 5. Definition of Done (Development)

- [ ] Classified and registered
- [ ] Build passes
- [ ] No architecture freeze violation
- [ ] Deployment policy followed (Vercel for review)
- [ ] Documentation updated if SSOT changed
- [ ] Certification delegated to Quality Office (not self-certified)

---

## 6. Related Documents

- PMO-004 Work Classification Standard  
- `.cursor/rules/github-vercel-deployment-policy.mdc`  
- `.cursor/rules/catalyst-one-development-charter.mdc`

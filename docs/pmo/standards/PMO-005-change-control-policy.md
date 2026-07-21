# PMO-005 — Change Control Policy

**Document ID:** PMO-005  
**Status:** APPROVED  
**Owner:** PMO Director

---

## 1. Purpose

Control all changes that affect architecture, infrastructure, certification environment, production readiness, or governance artefacts.

---

## 2. Change Categories

| Category | Approval authority | Examples |
|----------|-------------------|----------|
| **Standard** | Office owner | Register update, doc fix, port swap |
| **Significant** | ARB or Quality + Office owner | New API module, migration, cert credential |
| **Major** | ESC + ARB | Architecture freeze exception, Go-Live, scope change |
| **Emergency** | Release Manager + ESC notification | Production outage hotfix |

---

## 3. Frozen Items (Major change always)

Per Business Certification Environment Contract:

- Business Certification Admin credentials
- Auth provider configuration
- Demo seed users (certification)
- Vercel project / production database target

---

## 4. Change Request Process

1. **Raise** — Entry in [Change Register](../registers/change-register.md)  
2. **Classify** — PMO-004 category + impact  
3. **Assess** — Risk, rollback, dependencies  
4. **Approve** — Per category authority above  
5. **Implement** — Only after approval recorded  
6. **Verify** — Quality or Release as applicable  
7. **Close** — Update register + Decision Register if needed  

---

## 5. Infrastructure Change Requirements

All Infrastructure (`INFRA`) changes require:

- [ ] Migration plan documented (if DB)
- [ ] Rollback path defined
- [ ] Manual ops steps disclosed before "complete"
- [ ] No product redesign bundled in same change set

---

## 6. Related Documents

- [registers/change-register.md](../registers/change-register.md)  
- PMO-006 Architecture Governance Policy  
- `.cursor/rules/business-functional-certification-report.mdc`

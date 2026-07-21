# Approval Workflows

**Document ID:** PMO-WF-001  
**Owner:** PMO Director  
**Last updated:** 2026-07-21

---

## 1. Purpose

Define **who approves what** before work begins or artefacts are promoted across stage gates.

---

## 2. Work Intake Approval

```
Request received
       │
       ▼
Classify (PMO-004) ──▶ Assign Program ID
       │
       ▼
Register in Program Backlog
       │
       ├── ARCH / CO-ARCH design ──▶ ARB review
       ├── INFRA migration/API ──▶ Infrastructure Lead + ARB consult
       ├── CERT program ──▶ Quality Lead (independent scope)
       ├── DEV / BUG ──▶ Development Lead (blocked if freeze active)
       └── ENH / Major ──▶ ESC approval required
       │
       ▼
Approved to start ──▶ Implement per office standards
```

**Rule:** No implementation until classified and registered (except PMO-FOUNDATION governance docs).

---

## 3. ADR Approval Workflow

| Step | Actor | Action |
|------|-------|--------|
| 1 | Author | Draft ADR in `docs/adr/ADR-NNN-*.md` |
| 2 | Author | Add row to [ADR Register](../registers/adr-register.md) as **Proposed** |
| 3 | ARB | Review context, alternatives, consequences |
| 4 | ARB | Accept / Reject / Request revision |
| 5 | Documentation | Update ADR status; update [Architecture Freeze Register](../registers/architecture-freeze-register.md) if applicable |
| 6 | Decision | Record in [Decision Register](../registers/decision-register.md) |

**SLA:** ARB review within 5 business days of proposal (or next scheduled ARB forum).

---

## 4. Change Control Approval

| Change type | Approver | Evidence |
|-------------|----------|----------|
| Standard (DOC, register update) | Office owner | Change Register entry |
| Significant (INFRA migration, new API module) | Infrastructure Lead + ARB | Migration plan, rollback |
| Significant (cert env, auth) | Quality Lead + ESC | PMO-005 frozen item checklist |
| Major (architecture exception, Go-Live) | ESC + ARB | Decision Register + gate evidence |
| Emergency (production outage) | Release Manager → notify ESC within 24h | Post-incident review |

---

## 5. Infrastructure Program Approval (CO-ARCH-001)

| Step | Actor | Gate |
|------|-------|------|
| 1 | Infrastructure | Phase scope doc (I1, I2, …) |
| 2 | ARB | Architecture alignment, no product redesign |
| 3 | PMO | Classification INFRA, backlog entry |
| 4 | Risk | Migration risk assessment if DB change |
| 5 | Implement | Only after steps 1–4 |
| 6 | Quality | Independent certification (CO-CERTIFICATION-004+) |

---

## 6. Certification Approval

| Step | Actor | Action |
|------|-------|--------|
| 1 | Quality | Define certification criteria **before** verification |
| 2 | Quality / Script | Execute smoke + production checks |
| 3 | Quality | Publish Business & Functional Certification Report |
| 4 | Business Sponsor | Sign-off (Business Certified) |
| 5 | PMO | Update Program Backlog + Issue Register |

**Independence:** Implementation team cannot approve step 4 for their own delivery.

---

## 7. Release Approval

| Step | Actor | Action |
|------|-------|--------|
| 1 | Release | Build verification |
| 2 | Release | Document manual ops (migrations, env) |
| 3 | Quality | Sign-off if certification scope |
| 4 | Release | Deploy to Vercel production |
| 5 | Release | Release notes in `docs/releases/` |

---

## 8. Implementation Freeze Exception

During active freeze (DEC-2026-002):

| Allowed without ESC | Requires ESC exception |
|---------------------|------------------------|
| PMO governance docs (DOC) | New CO-SPRINT features |
| Certification audits (CERT) | ENH / product redesign |
| Blocker fixes (BUG) with Quality scope | CO-ARCH implementation |
| Register updates | Architecture freeze changes |

**To lift freeze:** ESC approves PMO foundation → DEC-PENDING-001 → update Decision Register.

---

## 9. Escalation Path

```
Implementer
    → Office Owner
        → ARB (architecture)
        → Quality (certification disputes)
        → ESC (priority, Go-Live, freeze exceptions)
```

---

## Related

- PMO-005 Change Control Policy  
- [stage-gates.md](./stage-gates.md)  
- PMO-004 Work Classification Standard

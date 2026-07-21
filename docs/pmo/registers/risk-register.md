# Enterprise Risk Register

**Owner:** Risk & Compliance Office  
**Last updated:** 2026-07-21

---

## Active Risks

| ID | Title | Category | Likelihood | Impact | RAG | Owner | Mitigation | Status |
|----|-------|----------|------------|--------|-----|-------|------------|--------|
| RISK-2026-001 | Master data not persisted in PostgreSQL (0/15 masters as DB tables) | Data / Architecture | High | Critical | Red | Infrastructure | CO-ARCH-001 program (Tier 0–3); CO-CERTIFICATION-003 audit tracks progress | Open |
| RISK-2026-002 | Parallel SSOT for products, lenders, cities (hardcoded + in-memory) | Data Integrity | High | High | Red | Infrastructure | Port swaps after CO-ARCH-001-I2/I4; eliminate duplicate sources | Open |
| RISK-2026-003 | Production vs certification auth credential mismatch | Security / Certification | Medium | High | Amber | Quality | Document production admin; frozen cert env per PMO-005 | Mitigating |
| RISK-2026-004 | Implementation without governance classification | Process | Medium | High | Amber | PMO | PMO foundation + `.cursor/rules/pmo-governance.mdc` enforcement | Mitigating |
| RISK-2026-005 | Legacy Express server endpoints unreachable on Vercel | Infrastructure | Low | Medium | Green | Release | ADR-014 migrated auth; remaining Express routes documented as local-only | Accepted |
| RISK-2026-006 | Self-certification by implementers | Quality | Medium | High | Amber | Quality | PMO-008 independence; Quality Office owns CO-CERTIFICATION | Mitigating |
| RISK-2026-007 | Database migration without rollback plan | Infrastructure | Medium | Critical | Amber | Infrastructure | PMO-005 + stage Gate 1b requirements | Open |

---

## Closed / Accepted Risks

| ID | Title | Closed date | Resolution |
|----|-------|-------------|------------|
| RISK-2026-005 | Express auth unreachable on Vercel | 2026-07-07 | ADR-014 Accepted |

---

## Risk Categories

| Category | Examples |
|----------|----------|
| Data / Architecture | SSOT gaps, schema drift |
| Data Integrity | Duplicate formulas, mock-as-truth |
| Security / Certification | Auth, credential exposure |
| Process | Governance bypass, unclassified work |
| Infrastructure | Migration, deployment |
| Quality | Self-certification, missing production proof |

---

## Escalation

- **Red + Critical impact** → ESC within 48 hours  
- **Amber + no mitigation plan** → Office owner within 1 week  

---

## Related

- PMO-010 Executive Reporting Framework  
- [issue-register.md](./issue-register.md)

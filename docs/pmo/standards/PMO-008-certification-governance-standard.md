# PMO-008 — Certification Governance Standard

**Document ID:** PMO-008  
**Status:** APPROVED  
**Owner:** Quality & Certification Office

---

## 1. Independence Principle

The Quality & Certification Office **must remain independent from implementation**.

- Implementers do not mark their own work "Certified"
- Certification programs (`CO-CERTIFICATION-*`) are separate workstreams from CO-SPRINT and CO-ARCH
- Production verification is mandatory for business certification—not local-only proof

---

## 2. Certification Program Types

| Type | Purpose | Example |
|------|---------|---------|
| **Audit** | Assess current state, no pass/fail sign-off | CO-CERTIFICATION-003 Master Data Audit |
| **Blocker certification** | Unblock business journey | CO-BLOCKER-002 |
| **Infrastructure certification** | Prove platform capability | CO-ARCH-001-I2 API certification |
| **Go-Live readiness** | Production release | Future CO-CERTIFICATION-GoLive |

---

## 3. Certification Lifecycle

1. **Plan** — Criteria documented before verification  
2. **Execute** — Smoke scripts, production checks, evidence capture  
3. **Report** — Business & Functional Certification Report format  
4. **Sign-off** — Quality Lead + Business Sponsor  
5. **Register** — Update Program Backlog + evidence paths  

---

## 4. Evidence Requirements

| Evidence | Location |
|----------|----------|
| Screenshots | `docs/certification-screenshots/{program-id}/` |
| Reports | `docs/co-*.md` |
| Scripts | `scripts/co-*-verify.mjs` |
| Production URL | Certification report mandatory field |

---

## 5. Status Labels

| Label | Meaning |
|-------|---------|
| **Ready for Business Certification** | Technical + production proof complete |
| **Business Certified** | Business sponsor sign-off |
| **Production Verified** | Live environment validated |
| **Requires Further Development** | Gaps documented |
| **Not Certified** | Audit only or failed |

---

## 6. Frozen Certification Environment

See `.cursor/rules/business-functional-certification-report.mdc` — Quality Office enforces freeze on auth and deployment targets.

---

## 7. Related Documents

- PMO-004 Work Classification (`CERT`)  
- [workflows/stage-gates.md](../workflows/stage-gates.md) — Gate 3, Gate 4  
- `.cursor/rules/business-functional-certification-report.mdc`

# CO-AI-117 — Risk Register

**Sprint:** AI-17 · Final Certification  
**Framework under certification:** `1.17.0-ai16`  
**Date:** 2026-08-06  

Severity: Critical · High · Medium · Low  
Status: Open · Accepted · Mitigated · Closed  

---

| ID | Risk | Severity | Likelihood | Mitigation | Status |
|---|---|---|---|---|---|
| RISK-ARCH-01 | Drift from Constitution / Bible after Go-Live | High | Low | Frozen docs · CHC · no dual AI platforms | Mitigated |
| RISK-BIZ-01 | Hallucinated loan eligibility / approval | Critical | Medium | FDI + engines decide; AI explains only; Domain Boundary | Mitigated |
| RISK-BIZ-02 | Customer tone used on Wealth Partner | High | Low | Partner Behaviour Pack · Tone catalogue separation | Mitigated |
| RISK-SEC-01 | Prompt injection bypasses Policy Gate | Critical | Medium | AI-16 injection suite · fixed refusal · tool deny | Mitigated (re-test on prod LLM) |
| RISK-SEC-02 | Context leakage of raw enterprise rows | High | Low | Context Package sanitisation · Read Connectors only | Mitigated |
| RISK-SEC-03 | Secrets / provider keys in repo or logs | Critical | Low | Vault · Go-Live checklist · no commit of `.env` | Open (ops) |
| RISK-PERF-01 | Production LLM latency exceeds stub budgets | High | High | Re-run AI-16 on canary; calibrate SLOs | Open (ops) |
| RISK-PERF-02 | Token / context growth under long memory | Medium | Medium | Memory expiry · package size budgets (AI-16) | Mitigated |
| RISK-OPS-01 | Insufficient monitoring / alerting | High | Medium | Go-Live Should items S1–S2 | Open (ops) |
| RISK-OPS-02 | Voice provider outage | Medium | Medium | Text fallback · voice recovery paths (AI-13) | Accepted |
| RISK-MEM-01 | Accidental online learning / rule mutation | Critical | Low | AI-15 forbids; learning proposals only | Mitigated |
| RISK-REL-01 | Premature Go-Live without PO / UAT | Critical | Medium | Certification pack + Go-Live checklist | Open until PO |

---

## Residual acceptance

Product Owner must explicitly accept Open risks before Go-Live or close via mitigation.

PO residual acceptance: ______________________ Date: __________

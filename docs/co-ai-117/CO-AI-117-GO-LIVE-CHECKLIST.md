# CO-AI-117 — Go-Live Checklist

**Sprint:** AI-17 · Final Certification  
**Framework under certification:** `1.17.0-ai16`  
**Prerequisite:** Product Owner approval of certification pack  

Do **not** cut Production Release until all **Must** items are complete.

---

## Must (blocking)

| # | Item | Owner | Done |
|---|---|---|---|
| G1 | Product Owner signs Enterprise AI Certification Report | PO | ☐ |
| G2 | Architecture / Business / Security / Performance certifications signed | PO + Security | ☐ |
| G3 | UAT Checklist completed (Pass or Pass with documented limitations) | BA / PO | ☐ |
| G4 | Production LLM provider configured + secrets in vault (not repo) | Ops | ☐ |
| G5 | Re-run `verify:co-ai-116` / `ai:validation:validate` against production LLM stub or canary | Eng | ☐ |
| G6 | Feature flags / env for Enterprise AI confirmed for production | Ops | ☐ |
| G7 | Audit logging destination confirmed (memory / proposals / tool reads) | Ops | ☐ |
| G8 | Incident response contact + rollback plan documented | Ops | ☐ |
| G9 | Known Limitations reviewed with PO | PO | ☐ |
| G10 | Risk Register residual risks accepted or mitigated | PO | ☐ |

## Should (non-blocking for soft launch)

| # | Item | Owner | Done |
|---|---|---|---|
| S1 | APM / latency dashboards for conversation turn | Ops | ☐ |
| S2 | Alerting on Policy Gate deny spikes / injection blocks | Ops | ☐ |
| S3 | Rate limits per persona / tenant | Ops | ☐ |
| S4 | Voice STT/TTS production providers certified | Eng | ☐ |
| S5 | Multilingual QA sample set (en/hi/mr) | BA | ☐ |

## Must not

| # | Item |
|---|---|
| X1 | Deploy without PO signature |
| X2 | Enable online learning / unsupervised rule mutation |
| X3 | Allow AI to execute CRM or workflow side effects |
| X4 | Commit secrets / provider keys to Git |

---

## Release gate

```text
All Must = Done  AND  PO Go-Live Approval = Yes
        → Production Release may proceed
```

Go-Live Approver: ______________________ Date: __________

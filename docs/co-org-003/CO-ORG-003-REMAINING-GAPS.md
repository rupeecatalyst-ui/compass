# CO-ORG-003 — Remaining Gaps

**Sprint:** CO-ORG-003  
**Date:** 2026-08-07

| Gap | Severity | Notes |
|-----|----------|-------|
| Historical backfill | Medium | Pre-EAR EDC / Deal / Org events not migrated into EAR |
| Document Registry upload emit | Medium | Some uploads only reach EAR when EDC append exists |
| ETE Prisma ports | Medium | Tasks still in-memory; chronology via EDC→EAR when append runs |
| CHANAKYA Radar direct EAR read | Low | Still uses Deal Timeline → LoanFile timeline projection; formula unchanged; Deal Timeline dual-writes EAR |
| Production Reset EAR wipe | Low | Add `enterprise_activity_events` to reset families in a follow-up |
| Partner Gateway timeline Map | Low | Still projection; retire invent in cleanup |
| Accounting FinancialActivityTimeline | Out of scope | Ledger mock — not operational EAR |
| EDC durable Prisma ports | Deferred | EAR is SSOT; EDC remains projection |
| Business Certification / BAT | Required | Engineering verify ≠ Certified (CO-QA-001) |
| Migration apply on target DB | Required | Manual ops |

---

## Explicitly out of scope this sprint

- Opportunity Workspace chrome redesign  
- Replacing Deal Timeline or ECIE domain tables  
- Second Activity Momentum formula  
- Vercel deployment  
- Git commit (unless PO requests)

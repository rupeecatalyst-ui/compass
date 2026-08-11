# CO-ORG-006 — Enterprise Business Journey Inventory

**Sprint:** CO-ORG-006 — Complete Enterprise Business Certification  
**Date:** 2026-08-07  
**Deployment:** Not performed (Product Owner instruction)

## Canonical path under certification

```text
Customer (Contact / ECM)
  → Opportunity (Registry + Lead Information)
  → Opportunity Workspace (Creation → Documents → Credit → LIFE)
  → Lender Pipeline (Enterprise Deal)
  → Disbursement (pipeline stage)
  → Accounting
  → CHANAKYA
  → Mission Control
```

## Stage scorecard

| Stage | Status | Primary route(s) | Authoritative SSOT | Certification note |
|-------|--------|------------------|--------------------|--------------------|
| Customer | **OPERATIONAL** | `/contacts` | ECM Contact Registry (`EcmContact`) | Progressive Contact by design |
| Opportunity | **OPERATIONAL** | `/my-opportunities`, `/loan-journey`, `/lead-information` | Enterprise Opportunity Registry | ADR-018 Draft → Requirement Captured |
| Opportunity Workspace | **OPERATIONAL*** | `/credit-bench`, `/document-center`, `/credit-workbench`, `/opportunities` | Opportunity Registry (+ Document Center for docs) | *FS-01 awaiting PO “FS-01 Approved” |
| Lender Pipeline | **OPERATIONAL*** | `/deals/:dealId`, `/my-deals` | Enterprise Deal Registry (1 lender = 1 Deal) | *Requires prisma persistence cutover |
| Disbursement | **PARTIAL** | Deal overview / pipeline column `disbursed` | Deal stage / lender case stage | No dedicated Disbursement desk |
| Accounting | **BLOCKED** | `/accounting` | **Unbound** — honest empty pending message | Cannot certify commercial ledger |
| CHANAKYA | **PARTIAL** | `/chanakya-radar` + Live Intelligence + Guide | Radar / Activity Intelligence SSOT metrics | Advisory only; non-blocking |
| Mission Control | **PARTIAL** | `/mission-control/executive-briefing` | EBI certified snapshot / EAR | Empty-awaiting without certified snapshot |

\* Operational for architecture when Soft Go-Live / prisma mode is correctly configured; live BAT still required.

## Journey wiring evidence

| Concern | Path |
|---------|------|
| Primary nav | `src/config/navigation.ts` |
| Routes | `src/constants/routes.ts` |
| ADR-018 routing | `src/lib/loan-journey/adr-018-routing.ts` |
| Journey hrefs | `src/constants/lead-opportunity-journey.ts` |
| Canonical stages | `src/constants/canonical-journey-header.ts` |
| OW stages | `src/constants/opportunity-workspace-stages.ts` |
| Start from Contact | `src/lib/enterprise-opportunity/start-opportunity-from-contact.ts` |
| Deal pipeline runtime | `src/lib/enterprise-deal/deal-pipeline-runtime.ts` |
| Accounting empty model | `src/lib/accounting-workspace/mock-data.ts` |

## End-to-end verdict

```text
Contact ──► Opportunity ──► OW stages ──► Move to Deal ──► Lender Pipeline
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
              Disbursement              Accounting                  CHANAKYA
              (PARTIAL)                 (BLOCKED)                   (PARTIAL)
                                                                  Mission Control
                                                                  (PARTIAL)
```

**Full journey Pass is not claimable** until Accounting SSOT bind + live E2E Scenario Pack Pass + PO acceptance.

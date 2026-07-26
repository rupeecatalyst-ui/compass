# CO-ARCH-003 — Lending Domain Glossary (Frozen)

**Status:** ENTERPRISE APPROVED · Phase 0  
**Date:** 2026-07-23  
**Invariants:** `docs/co-arch-003/CO-ARCH-003-BUSINESS-INVARIANTS.md` (BI-1 … BI-4)

| Term | Meaning | Not |
|------|---------|-----|
| **Contact** | Customer / party (individual or entity) in ECM | Opportunity or Deal |
| **Lead** | Synonym of Opportunity | A lender case |
| **Opportunity** | One financial requirement (product + amount + requirement lifecycle). May have **zero** Deals (BI-1) | A lender Deal |
| **Deal** | One lender-specific execution under **exactly one** Opportunity (BI-2). Requires Opportunity + lender (BI-3) | A pre-lender requirement |
| **Requirement stage** | Opportunity lifecycle — customer **requirement readiness** (BI-4) | Lender pipeline |
| **Lender pipeline / Deal stage** | Deal lifecycle — **lender execution** (BI-4) | Opportunity stage |
| **My Opportunities** | Queue of requirements | Lender execution queue |
| **My Deals** | Queue of lender Deals only | Requirement queue |
| **LoanFile** | Legacy transitional DTO / cache — not the target SoR | Canonical Opportunity or Deal |

**Create rules (BI-3)**

- New Home Loan for a Contact → **Opportunity** (zero Deals allowed)  
- Assign HDFC to that Opportunity → **Deal** (must reference that Opportunity + lender)

**Lifecycle rule (BI-4)**

- Opportunity stages and Deal stages are independent — never overlap or interchange.

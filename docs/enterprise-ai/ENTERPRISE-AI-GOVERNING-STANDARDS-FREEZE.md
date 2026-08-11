# Enterprise AI Governing Standards — Freeze Notice

**Status:** FROZEN · PRODUCT OWNER MANDATORY COMPLIANCE  
**Date:** 2026-08-06  
**Authority:** Product Owner  

---

## Directive

The following documents are **frozen** and constitute the **governing standards** for all remaining AI sprints:

1. **Enterprise AI Constitution** — `docs/enterprise-ai/ENTERPRISE-AI-CONSTITUTION.md`  
2. **SARATHI Bible v1.0** — `docs/sarathi/SARATHI-BIBLE-V1.md`

---

## Rules

- No sprint may **modify**, **override**, **weaken**, or **bypass** these documents unless explicitly instructed by the Product Owner.  
- Every implementation must remain **compliant** with these governing documents.  
- Cursor agent rule: `.cursor/rules/enterprise-ai-governing-standards.mdc` (`alwaysApply: true`).  
- Platform operating rule remains: `.cursor/rules/enterprise-ai-platform.mdc`.  
- Bible code SSOT: `src/constants/enterprise-ai-platform/sarathi-bible.ts` (must stay aligned with SARATHI Bible v1.0).

---

## Agent / engineering obligation

Before any remaining AI sprint implementation:

1. Read both governing documents.  
2. Confirm the design does not conflict.  
3. If conflict → STOP → Architecture Impact / Product Owner decision.  
4. Cite both documents in Architecture and Business Certification reports.

---

## Does not reopen

This freeze does **not** reopen certified ADRs outside AI scope, and does **not** authorise Voice, CRM execution, or workflow execution.

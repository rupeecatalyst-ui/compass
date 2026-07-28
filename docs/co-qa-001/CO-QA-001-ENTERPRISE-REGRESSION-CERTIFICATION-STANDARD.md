# CO-QA-001 — Enterprise Regression Certification Standard

**Status:** ENTERPRISE APPROVED · Effective immediately · Permanent  
**Authority rule:** `.cursor/rules/co-qa-001-enterprise-regression-certification.mdc`  
**Scenario template:** `docs/governance/E2E-BUSINESS-SCENARIO-PACK-TEMPLATE.md`

---

## Purpose

Ensure Business Certification reflects **real business behaviour** in the live application — not engineering verification alone.

## Standard (verbatim intent)

1. Every Business Certified module must include **at least one real end-to-end business scenario**.  
2. Whenever any **related domain** changes, that scenario **must be re-run**.  
3. Business Certification is **NOT** granted solely based on:
   - Successful build  
   - TypeScript  
   - Lint  
   - Verify scripts  
   - Smoke tests  
4. Business Certification requires **successful execution** of the defined end-to-end scenario.  
5. If the end-to-end scenario **fails**, the module remains **OPEN** regardless of technical verification status.

## Engineering vs Business gates

| Gate | Role | Can close Business Certification? |
|------|------|-----------------------------------|
| Build | Engineering | No |
| TypeScript | Engineering | No |
| Lint | Engineering | No |
| Verify scripts | Engineering | No |
| Smoke tests | Engineering | No |
| E2E Scenario Pack (live Pass) | Business | Required for Ready |
| Product Owner acceptance | Business | Required for Certified |

## Module status language

| Status | Meaning |
|--------|---------|
| **OPEN** | Scenario Fail, not run, or related-domain change pending re-run |
| **Ready for Business Certification** | Scenario Pack Pass on live app; awaiting Product Owner |
| **Business Certified** | Product Owner explicit acceptance after Scenario Pass |
| Engineering verify Pass | Informational only |

## Artefacts

| Artefact | Path |
|----------|------|
| Cursor rule (always apply) | `.cursor/rules/co-qa-001-enterprise-regression-certification.mdc` |
| Certification report contract | `.cursor/rules/business-functional-certification-report.mdc` |
| Scenario Pack template | `docs/governance/E2E-BUSINESS-SCENARIO-PACK-TEMPLATE.md` |
| Per-module packs | `docs/<module>/*-E2E-SCENARIO.md` |

## Example — CO-DOC-002

Pack: `docs/co-doc-002/CO-DOC-002-E2E-SCENARIO.md` (`CO-DOC-002-E2E-001`)

Lesson: association / verify-script Pass did **not** equal documents visible after refresh. Until `CO-DOC-002-E2E-001` Passes on the live app, CO-DOC-002 remains **OPEN**.

## Adoption

Effective immediately for all current and future Business Certified modules. Prior “Ready / Certified” claims without a documented live Scenario Pass must be treated as **OPEN** until the Scenario Pack is created and executed.

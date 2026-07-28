# CO-DOC-002 — E2E Business Scenario Pack

**Module:** Opportunity Document Center / Document Persistence  
**Scenario ID:** `CO-DOC-002-E2E-001`  
**Standard:** **CO-QA-001** — Enterprise Regression Certification  
**Authority:** `.cursor/rules/co-qa-001-enterprise-regression-certification.mdc`  
**Status:** **OPEN** until live Pass — not replaceable by verify scripts

---

## Business objective

Uploaded Opportunity documents remain visible (Files > 0, Readiness > 0%) after navigation and refresh for a real Opportunity.

## Canonical business path

```text
Contact (Priyesh Jain)
  → Opportunity OPP-2026-000043
  → Document Center (Primary Applicant)
  → Upload document
  → Navigate away → re-open Opportunity / Document Center
  → Files > 0 and Readiness > 0%
```

## Preconditions

| Item | Value |
|------|--------|
| Auth | `admin@compass.com` / `Admin@123` |
| Opportunity | `OPP-2026-000043` (or equivalent new Contact + Opportunity) |
| Migrations | `20260727194500_co_doc_002_durable_transaction_documents` applied |
| Persistence | `ENTERPRISE_PERSISTENCE_MODE=prisma` |
| Build | Includes purge fix (Document Registry **not** wiped on dashboard mount) |

## Steps (live application)

1. Sign in as Business Certification Admin.  
2. Open Opportunity `OPP-2026-000043` (Priyesh Jain) → Document Center.  
3. Select Document Owner = Primary Applicant (Priyesh Jain).  
4. Upload at least one required applicant document (e.g. PAN / Aadhaar / as checklist requires).  
5. Confirm Files count increases and the file appears in the owner tab.  
6. Navigate to Dashboard (or My Opportunities), then return to the same Opportunity Document Center.  
7. Hard refresh the browser.  
8. Confirm Files > 0 and Opportunity Workspace Readiness > 0%.  

## Expected business outcomes

| # | Observable result | Pass? |
|---|-------------------|-------|
| 1 | Upload succeeds and file is listed under Primary Applicant | ☐ |
| 2 | After Dashboard navigation, documents still listed | ☐ |
| 3 | After hard refresh, Files > 0 | ☐ |
| 4 | Opportunity Workspace Readiness > 0% | ☐ |
| 5 | localStorage Document Registry was **not** emptied by demo purge | ☐ |

## Related domains (re-run triggers)

- `purge-client-demo-data` / demo seed policy  
- Document Registry store / association / heal  
- `enterprise_transaction_documents` API / migration  
- Opportunity runtime adapter / Document Center list keys  
- OW document hydration  

## Last run log

| Date | URL | Result | Evidence notes | Runner |
|------|-----|--------|----------------|--------|
| 2026-07-27 | (pending deploy) | ⏸️ Blocked | Prior uploads wiped by purge; re-upload required after fix deploy + migration | — |

## Certification gate

- [ ] Scenario Pack executed on live app  
- [ ] All expected outcomes observed  
- [ ] Product Owner acceptance (only then: Business Certified)  

**Engineering verify scripts:** informational only — not a substitute for this pack.

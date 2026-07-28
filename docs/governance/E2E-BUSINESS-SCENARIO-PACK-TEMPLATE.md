# Business Certification — E2E Scenario Pack Template

**Standard:** **CO-QA-001** — Enterprise Regression Certification  
**Authority:** `.cursor/rules/co-qa-001-enterprise-regression-certification.mdc`  
**Rule:** A module is not Business Certified on build / verify / smoke alone. Scenario Fail ⇒ module remains **OPEN**.

Copy this file to `docs/<module-or-sprint>/<MODULE>-E2E-SCENARIO.md` and fill it in before BAT.

---

## E2E Business Scenario Pack — \<Module Name\>

### Scenario ID

`<MODULE>-E2E-001`

### Business objective

One sentence: what business outcome proves this module works.

### Canonical business path

```text
Contact / Company → … → observable outcome in the live UI
```

### Preconditions

| Item | Value |
|------|--------|
| Environment URL | |
| Auth | `admin@compass.com` (frozen) |
| Migrations applied | |
| Persistence mode | |
| Seed / fixture identities | |

### Steps (live application)

1.  
2.  
3.  

### Expected business outcomes

| # | Observable result | Pass? |
|---|-------------------|-------|
| 1 | | ☐ |
| 2 | | ☐ |
| 3 | | ☐ |

### Negative / regression checks (optional but recommended)

| # | Must not happen | Pass? |
|---|-----------------|-------|
| 1 | | ☐ |

### Related domains (re-run triggers)

List SSOT / persistence / association / UI paths that invalidate a prior pass:

-  
-  

### Last run log

| Date | URL | Result | Evidence notes | Runner |
|------|-----|--------|----------------|--------|
| | | Pass / Fail | | |

### Certification gate

- [ ] Scenario Pack executed on live app  
- [ ] All expected outcomes observed  
- [ ] Product Owner acceptance (only then: Business Certified)  

**Engineering verify scripts:** informational only — not a substitute for this pack.

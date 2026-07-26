# FS-01 — Business Acceptance Test Package (Product Owner)

**Sprint:** FS-01 — Opportunity Runtime Stabilization  
**Objective:** Confirm Opportunity Registry is the runtime authority for the Opportunity lifecycle.  
**Prerequisite:** Test on the **latest** Vercel production deployment provided with this package.

**Certification rule:** Reply **"FS-01 Approved"** only after all checklist items pass. Until then, status remains *Awaiting Product Owner Certification* (not Certified, not Frozen).

---

## Checklist

### Opportunity Creation
- [ ] From Contact, **Start Loan Journey** creates (or opens) an Opportunity via Opportunity Registry
- [ ] Opportunity receives a stable Opportunity id / reference (e.g. OPP-…)

### Opportunity Workspace
- [ ] Opportunity Workspace opens for that Opportunity
- [ ] Header / identity reflect the correct customer and product
- [ ] Workspace does **not** require a LoanFile as runtime authority

### Document Center
- [ ] Open Documents for the same Opportunity
- [ ] Desk loads and operates without LoanFile as SSOT
- [ ] Opportunity identity remains correct

### Credit Bench
- [ ] Open Credit Bench / Lead Creation for the same Opportunity
- [ ] Desk loads without LoanFile as runtime authority

### LIFE
- [ ] Open LIFE / Strategy for the same Opportunity
- [ ] LIFE runs from Opportunity runtime (not an unrelated LoanFile)

### Opportunity Context Preservation
- [ ] Navigate Documents → Credit Bench → LIFE → back to Opportunity Workspace
- [ ] Same Opportunity remains active throughout (no context loss)

### Browser Refresh
- [ ] Refresh the browser mid-journey
- [ ] Same Opportunity context restores (or recovers via URL / Shared Opportunity Context)

### Direct URL Access
- [ ] Open a stage URL with `opportunityId` (without relying on LoanFile `file` as authority)
- [ ] Correct Opportunity loads

### Navigation between stages
- [ ] Journey header / stage hops preserve Opportunity context
- [ ] No bounce to unrelated dashboard or wrong customer

---

## Out of scope for FS-01 BAT

Do **not** fail FS-01 for:

- Move to Deal `window.confirm` browser dialog  
- Lender Pipeline synchronization messages after Move to Deal  

Those are FS-02 backlog items (Deal transition).

---

## Sign-off

| Field | Value |
|-------|--------|
| Production URL | _(see deployment evidence)_ |
| Product Owner | |
| Date | |
| Decision | ☐ FS-01 Approved · ☐ Not approved (notes below) |
| Notes | |

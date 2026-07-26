# CO-ARCH FS-01 — Opportunity Runtime Stabilization

**Status:** Implementation Complete · Production Deployment Complete · **Business Certification: BLOCKED** · Foundation Freeze: PENDING  
**Sprint:** FS-01  
**Date:** 2026-07-24  

**Certification rule:** Do **not** mark FOUNDATION CERTIFIED or FROZEN until the Product Owner explicitly confirms **"FS-01 Approved"** after BAT on the latest production deployment.

**Blockers (under remediation):** Auth token refresh across modules · Move to Deal → Lender Pipeline hydrate.

---

## Objective

Opportunity Registry shall become the runtime authority for the Opportunity lifecycle.

No new features. Architectural stabilization only.

---

## Constitutional principle

**Opportunity Registry** is the only runtime authority for:

- Opportunity Workspace (header, timeline, LIFE desk)
- Document Center
- Credit Bench (Lead Creation)
- Credit Workbench
- Shared Opportunity Context

LoanFile may remain as a temporary compatibility adapter for Deal attachment only.

---

## Runtime path (under BAT)

```
Contact
  → Opportunity Service
  → Opportunity Registry
  → Shared Opportunity Context
  → Opportunity Workspace
  → Document Center
  → Credit Bench
  → LIFE
```

At no point should LoanFile be the runtime SSOT.

---

## Governance status (current)

| Gate | Status |
|------|--------|
| Implementation | Complete |
| Production deployment | Complete (see latest deployment evidence) |
| Business Acceptance Testing | Ready — awaiting Product Owner |
| FOUNDATION CERTIFIED | **Not granted** |
| FROZEN | **Not applied** |

---

## BAT observations (out of scope for FS-01)

Carry forward to FS-02 backlog only (not blocking FS-01 BAT of Opportunity runtime):

1. Move to Deal uses browser `window.confirm`  
2. Move to Deal shows a Lender Pipeline synchronization message  

See: `docs/co-arch-003/CO-ARCH-FS-02-DEAL-RUNTIME-SEPARATION-BACKLOG.md`

---

## Implementation reference

| Concern | Path |
|---------|------|
| Shared context | `src/lib/lead-opportunity-journey/active-context.ts` |
| Registry remember | `src/lib/lead-opportunity-journey/opportunity-context.ts` |
| Runtime adapter | `src/lib/lead-opportunity-journey/opportunity-runtime-adapter.ts` |
| Stage loader | `loadOpportunityJourneyRuntime` in `load-context.ts` |
| Cursor rule | `.cursor/rules/opportunity-runtime-fs01.mdc` |

### Compatibility adapters retained

1. **Opportunity → LoanFile-shaped projection** (`__fs01OpportunityRuntime`) — UI view model only  
2. **Optional `legacyLoanFileId` / `fileId`** — Deal attachment bridge  
3. **Deal DAL dual-write** — post-Deal / Loan Workspace only; skipped for Opportunity runtime keys  
4. **`loadLeadJourneyLoanFile` sync** — cache peek for chrome gates; stages use async resolver  

---

## After Product Owner approval

Only when the Product Owner confirms **"FS-01 Approved"**:

1. Update status to **FOUNDATION CERTIFIED · FROZEN**  
2. Record decision in Decision Register  
3. Add domain to Architecture Freeze Register  
4. Open FS-02 only after freeze is recorded  

Until then: no certification, no freeze.

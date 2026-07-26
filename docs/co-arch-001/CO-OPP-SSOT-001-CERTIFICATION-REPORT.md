# CO-OPP-SSOT-001 — Opportunity Registry SSOT Certification

**Status:** Implemented · Verify PASS  
**Date:** 2026-07-25

## Behaviour

1. Opportunity Workspace becomes `workspaceReady` **only** after successful `GET` from Enterprise Opportunity Registry.
2. On Registry failure: `registryLoadStatus=failed`, clear error message, **no** Document Requests / LIFE / Manual Select / Move to Deal.
3. Opportunity Number and operational `opportunityId` come **only** from the Registry record (never URL / EOLE / raw id fallbacks).
4. Manual Select and Move to Deal use `registryOpportunity.id` exclusively.

## Files

- `opportunity-workspace-context.tsx` — Registry load gate
- `opportunity-workspace.tsx` — failure / loading UI
- `workspace-life-strategy-board.tsx` — Select / Move-to-Deal guards
- `credit-bench-document-requests-host.tsx` — Document Requests gate
- `scripts/co-opp-ssot-001-verify.mjs`

## Confirmations

1. ✅ Cannot become operational without Enterprise Opportunity Registry  
2. ✅ Business modules consume canonical Registry Opportunity id  
3. ✅ Soft fallback identities removed from operational workflows  
4. ✅ Enterprise Opportunity Registry is sole SSOT for Opportunity execution  

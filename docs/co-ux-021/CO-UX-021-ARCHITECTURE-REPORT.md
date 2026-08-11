# CO-UX-021 — Enterprise Business Notes Architecture Report

**Status:** Implementation complete · Awaiting Product Owner approval  
**Deploy:** Blocked until Product Owner approval  
**Date:** 2026-08-07

## 1. Objective

Introduce **Enterprise Business Notes** — official business context notes that become part of activity history. Not a personal notepad.

## 2. Constitutional Health Check

| Principle | Result |
|-----------|--------|
| Preserve Opportunity Workspace architecture | GREEN — additive header icon + Notes tab SSOT swap |
| Preserve Lender Lifecycle chrome | GREEN — additive icon + Notes tab |
| Single activity chronology (EAR) | GREEN — dual-write `notes` / `business_notes` |
| No parallel note engine | GREEN — one Prisma SSOT + session hydrate buffer |
| CAD-2026-001 | GREEN — author/timestamps from auth; body user-entered |
| Chanakya non-blocking / no AI this sprint | GREEN — projection helper only |

**Verdict: GREEN** — implementation may proceed for BAT / PO review. **No deploy** until PO approval.

## 3. Data model

`EnterpriseBusinessNote` (Prisma → `enterprise_business_notes`):

- body, category, workspaceKind, entityKind, entityId  
- opportunityId, dealId, contactId, lenderId, lenderName  
- isPinned, modificationHistory (JSON)  
- createdBy / updatedBy + timestamps  
- soft delete: isDeleted, deletedAt, deletedBy, deletionReason  

## 4. Activity Timeline integration

On create / update / soft-delete:

```
enterpriseActivityService.emitBestEffort({
  eventKind: "notes",
  sourceSystem: "business_notes",
  title: "added a Business Note" | "updated…" | "removed…",
  summary: note body snippet,
  opportunityId / dealId / contactId,
  actor…
})
```

Idempotent on `(organizationId, sourceSystem, sourceEventId)`.

## 5. Surfaces

| Workspace | Header icon | Notes panel |
|-----------|-------------|-------------|
| Opportunity | ✓ Command bar | Notes tab (replaces localStorage) |
| Lender Lifecycle / Deal | ✓ Header band | Notes tab |
| Customer | ✓ Sticky header | Notes tab |
| Accounting | ✓ Header band | Notes workbench |

## 6. Categories

General · Customer Discussion · Internal Discussion · Lender Discussion · Follow-up · Risk · Compliance · Management

## 7. AI readiness

`projectBusinessNotesForAiContext` — architecture only. No Chanakya/SARATHI behaviour in this sprint.

## 8. Legacy retirement

| Legacy | Action |
|--------|--------|
| OW `localStorage` strategic notes | Replaced by Business Notes SSOT |
| Customer profile-local notes panel | Customer tab now uses Business Notes |
| Prisma `EnterpriseDealNote` (unused) | Not expanded — leave dormant |

## 9. Manual ops

- Apply migration `20260807190000_co_ux_021_enterprise_business_notes`  
- Requires `ENTERPRISE_PERSISTENCE_MODE=prisma` for durable persistence  

# CO-WP-JOURNEY-002 — Enterprise Opportunity Workspace

**Status:** Implementation complete (local) · Await Product Owner BAT  
**Date:** 2026-08-02  
**Deploy:** **None**

## Freeze notice

**CO-WP-JOURNEY-001** (Creation Journey including 001A–001D) is **CERTIFIED and FROZEN**.  
This sprint does **not** modify Opportunity Creation.

---

## Objective

After create, the partner works inside **one Opportunity Workspace** for the full lifecycle.

Catalyst One owns registries, workflow, timeline, documents, activities, audit, and Next Best Action.  
Wealth Partner renders Enterprise DTOs in a mobile-optimised workspace.

---

## Delivered

### Catalyst One Partner Gateway

Workspace projection fields on Opportunity Detail DTO:

- `subStageLabel` · `borrowerTypeLabel` · `opportunityHealthLabel`
- `assignedExecutive` · `nextBestAction`
- `participants` · `lenders` · `noteEntries` · `historyEntries`
- `upcomingTasks` · `documentStatusSummary` · `communicationReservedMessage`

Enriched via `applyWorkspaceProjection` (placeholder until Registry cutover).

### Wealth Partner (0.6.0)

- Sticky premium **Opportunity Workspace Header**
- Tabs: Overview · Timeline · Documents · Participants · Activities · Lenders · Communication · Notes · History
- Overview: summary · NBA · stage · completion · recent activity · pending docs · tasks · assigned executive · submit (draft)
- Communication: reserved design only
- Lenders / History / Notes: presentation only
- Legacy `/review` → Overview · `/loan-file` → Lenders

---

## Non-negotiable held

- No Creation Journey changes  
- No Customer Workspace  
- No companion business logic / lender logic / messaging logic  
- **No deployment**

Await Product Owner BAT.

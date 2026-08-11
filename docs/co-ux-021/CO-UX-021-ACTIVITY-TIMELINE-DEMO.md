# CO-UX-021 — Activity Timeline Demonstration

## Scenario

RM **Rahul Kapoor** opens Opportunity Workspace and saves:

> Customer requested revised sanction amount and will submit audited financials tomorrow.

## Expected EAR event

| Field | Value |
|-------|--------|
| eventKind | `notes` |
| sourceSystem | `business_notes` |
| title | `added a Business Note` |
| summary | Note body (trimmed ≤280 chars) |
| actorName | Author display (from auth) |
| opportunityId | Active Opportunity |
| occurredAt | Save timestamp |

## Timeline rendering (example)

```
08 Aug 2026
11:42 AM

Rahul Kapoor

added a Business Note

"Customer requested revised sanction amount and will submit audited financials tomorrow."
```

## Verification steps (BAT)

1. Ensure prisma persistence mode + migration applied.  
2. Save a Business Note from Opportunity Workspace.  
3. Open Dashboard / Dialogue / Mission Control activity feeds that read EAR.  
4. Confirm event appears with author, time, and note snippet.  
5. Soft-delete the note → EAR shows `removed a Business Note` (fail-open dual-write).  
6. Update body → EAR shows `updated a Business Note`; note retains `modificationHistory`.

## Readers that consume EAR

- Dashboard `ActivityTimeline` (`mapEarEventToDashboardActivity`)  
- Opportunity Dialogue / timeline hydrate (CO-ORG-003)  
- Mission Control activity feed (where EAR-bound)  

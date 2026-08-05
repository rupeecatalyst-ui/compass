# Catalyst Connect — Enterprise Notification Center

**Programme:** CO-WP-NOTIFY-001  
**Status:** Implementation complete (local) — no deploy unless PO requests  
**Constitution:** Connect is presentation only; notifications originate from Catalyst One events.

## Directive

Enterprise Notification Center supporting:

- Opportunity Updates  
- Missing Documents  
- Approval  
- Rejection  
- Commission Released  
- Task Reminder  
- Birthday Reminder  
- Campaign Announcement  

### Features

- Read / Unread  
- Priority (`critical` · `high` · `normal` · `low`)  
- Deep Linking  

## Event sources (Catalyst One)

| Kind | Source |
|---|---|
| Opportunity Updates | Opportunity activities / updates |
| Missing Documents | Enterprise LOD gaps |
| Approval / Rejection | Opportunity stage lifecycle |
| Task Reminder | Opportunity upcoming tasks (ETE projection) |
| Commission Released | Partner commercial profile event fields |
| Birthday Reminder | Enterprise Customer Registry DOB |
| Campaign Announcement | Experience Engine campaign feed publications |

## API

- `GET /api/partner/notifications`  
- `POST /api/partner/notifications` `{ action: "mark_all_read" }`  
- `POST /api/partner/notifications/:id` `{ action: "mark_read" }`  

Read state persists in Wealth Partner `profileJson.partnerNotificationCenter`.

## Connect

- `/app/notifications` — full Notification Center  
- Home greeting bell — event-projected list (same SSOT)  
- Top bar Notifications icon → Notification Center  

## SSOT paths

| Concern | Path |
|---|---|
| Types | `src/types/enterprise-partner-notification-center.ts` |
| Compose | `server/services/partner-gateway/partner-notification-center.compose.ts` |
| Service | `server/services/partner-gateway/partner-notification-center.service.ts` |
| WP | `NotificationCenterScreen` |

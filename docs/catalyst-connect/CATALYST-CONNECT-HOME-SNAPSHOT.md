# Catalyst Connect — Home Snapshot Restoration (CO-WP-HOME-SNAPSHOT-001)

Status: **Final fold refinement complete** · PO-approved UX restoration  
BAT: Authorised Connect constitution exception

## Objective

Restore the premium **Business Snapshot** dashboard cards on Home **without removing** Partner Command Center. Home is again a premium fintech dashboard that remains action-oriented.

## Layout (first viewport)

1. Compact Header — Greeting · Search · Digital Visiting Card · Profile · Notifications
2. Compact Partner Command Center — single card (“What should I do next?” + Today’s Priority)
3. Business Snapshot — first KPI row visible without excessive scroll
4. Quick Actions · Recent Activity · Upcoming Follow-ups · Notifications strip (below fold)

## Responsive Snapshot grid

| Breakpoint | Columns |
|------------|---------|
| Mobile (&lt;600) | 2 |
| Tablet / Laptop (≥600) | 4 |
| Desktop (≥1200) | 4 (richer card height) |

## SSOT

| Layer | Path |
|-------|------|
| Types | `src/types/enterprise-partner-business-snapshot.ts` |
| Compose | `server/services/partner-gateway/partner-business-snapshot.compose.ts` |
| Home API | `partner-home.service.ts` → `businessSnapshot` |
| WP UI | `BusinessSnapshot.tsx` · `HomeDashboard.tsx` · Command Center `mode="focus"` |

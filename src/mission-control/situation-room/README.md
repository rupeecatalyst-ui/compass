# Executive Situation Room

Executive war-room awareness surface for Mission Control.

**Widget-driven** via the Enterprise Widget Framework (`shared/widget-framework`).

## Folder structure

```
situation-room/
  components/          Domain UI bodies (health, domains, alerts, …)
  widgets/bodies.tsx   Widget body adapters
  widget-registry.ts   Registers Situation Room widgets
  types.ts / providers.ts
  SituationRoom.tsx    Renders WidgetRenderer only
```

## Route

`/mission-control/situation-room`

## Registered widgets

| Widget | Size |
|--------|------|
| Command Summary | full |
| Enterprise Health | full |
| Operational Domains | large |
| Critical Alerts | medium |
| Activity Feed | large |
| Quick Navigation | medium |

## Future TODOs

- [ ] Per-widget payloads from dedicated providers (instead of shared SituationRoomModel)
- [ ] Persist layout + drag-and-drop via WidgetLayoutProvider
- [ ] Enforce widget permissions through Security Gateway
- [ ] Stream activity / alerts into widget load states

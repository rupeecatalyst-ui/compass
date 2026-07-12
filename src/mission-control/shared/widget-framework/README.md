# Enterprise Widget Framework (SPR-007.3)

Reusable Mission Control infrastructure for pluggable widgets.

## Folder structure

```
shared/widget-framework/
  types/         Size, category, permissions, layout slots
  contracts/     MissionControlWidget + registry ports
  categories/    Widget category catalog
  permissions/   Permission metadata helpers (no enforcement)
  registry/      In-memory widget registry
  layout/        Layout manager (size → grid; DnD reserved)
  providers/     Registry / Layout / Configuration placeholders
  shell/         WidgetShell (header, toolbar, states, footer)
  renderer/      WidgetRenderer
```

## Design principle

Surfaces such as Situation Room **render widgets only**.

They must not hard-code section trees once widgets are registered.

## Future integration notes

- [ ] Persist layout plans (including drag-and-drop positions)
- [ ] Enforce `WidgetPermission` via Mission Control security gateway
- [ ] Lazy-load widget `component` bundles via module loader
- [ ] Stream widget payloads from insight providers (no direct table access)
- [ ] Per-executive WidgetConfiguration preferences
- [ ] Live `WidgetLoadState` from provider health

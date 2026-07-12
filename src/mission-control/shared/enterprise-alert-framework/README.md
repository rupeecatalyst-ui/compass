# Enterprise Alert Publishing Framework

Reusable architecture for publishing and consuming enterprise alerts.

**No channel delivery** — email, SMS, WhatsApp, push, webhook, Teams, and Slack are registered placeholders only.

## Folder structure

```
shared/enterprise-alert-framework/
  types/         Severity, priority, channel kinds, lifecycle states
  contracts/     Event, Publisher, Rule, Target, Channel, Lifecycle, Source
  registry/      Publishers · Channels · Sources · Targets
  publisher/     In-memory publish bus
  routing/       Declarative channel routing
  lifecycle/     Generated → Published → … → Archived
  renderer/      Ordering / grouping / dedupe
  providers/     Registry · Publisher · Channel · Lifecycle · Configuration
  adapters/      Projection helpers → Alert Center
```

## Contracts

`EnterpriseAlertEvent` · `EnterpriseAlertPublisher` · `EnterpriseAlertRule` · `EnterpriseAlertTarget` · `EnterpriseAlertChannel` · `EnterpriseAlertLifecycle` · `EnterpriseAlertSource`

## Lifecycle

Generated → Published → Acknowledged → Assigned → Resolved → Archived (placeholder transitions)

## Registered publishers

Workflow Engine · Credit & Risk Engine · Customer 360 · Partner Management · Document Intelligence · Product Intelligence · Mission Control · Security Operations · Observability · Digital Twin · Mission Replay · AI Control Tower

## Channels

Mission Control (enabled) · Email · SMS · WhatsApp · Push · Webhook · Mobile · Microsoft Teams · Slack

## Future integration notes

- [ ] Bind Alert Center providers to framework bus + lifecycle projection
- [ ] Persist lifecycle transitions with audit
- [ ] Enable channel transports behind feature flags (never from UI)
- [ ] Enforce publisher / source permissions via Security Gateway
- [ ] Stream published events into Situation Room Critical Alerts widget

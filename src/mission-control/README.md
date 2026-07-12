# Mission Control — SPR-007.1 Foundation

Isolated Enterprise Command Center for Catalyst One.

## Structure

```
src/mission-control/
  app/                 Workspace scaffolds
  shell/               Header, nav rail, status bar, security gateway wrapper
  navigation/          Nav model from Feature Registry
  authentication/      Auth principal interfaces (no Catalyst One auth changes)
  authorization/       Role/permission interfaces
  session/             Session / device / revocation interfaces
  security/            Security Gateway placeholder
  feature-registry/    Module metadata + module loader lifecycle interfaces
  configuration/       Environment / build stubs
  notifications/       Notification port stub
  health/              Subsystem status placeholders
  telemetry/           Telemetry port stub
  audit/               Audit event pipeline interfaces
  emergency/           Emergency capability architecture (no execution)
  search/              Enterprise Search Center (UI + providers → framework)
  command-center/      Command console stub
  shared/              Constants, types, cn, executive-intelligence
  executive-briefing/  CHANAKYA landing briefing UI
  executive-decision-workspace/  Decision sections below briefing
  situation-room/      Executive Situation Room (widget-driven)
  alert-center/        Enterprise Alert Center (UI)
  security-operations/ Security Operations Center (SOC UI → security framework)
  observability/       Enterprise Observability Center (UI → observability framework)
  shared/enterprise-alert-framework/  Alert publish / route / render architecture
  shared/enterprise-search-framework/  Search registry · publishers · contracts
  shared/enterprise-security-framework/  Security registry · policies · contracts
  shared/enterprise-observability-framework/  Health · dependency · queue · telemetry contracts
  shared/widget-framework/  Enterprise Widget Framework
```

## Executive Narrative Engine (SPR-007.2B)

`shared/executive-intelligence/` — contracts, providers, transformers, source-module registry, hooks.

UI consumes **`ExecutiveBriefModel` only**. No AI / KPIs / DB in this layer.

## Route

`/mission-control` — Next.js route group `(mission-control)`, **outside** operational `(dashboard)` layout.

## TODOs for later sprints

- [ ] Bind Security Gateway to real auth / MFA / device trust
- [ ] Persist audit events
- [ ] Activate emergency capabilities with operator confirmation + audit
- [ ] Session concurrent management & forced logout
- [ ] Lazy module loader runtime (beyond stub lifecycle)
- [ ] Live subsystem health probes
- [ ] Global search indexing
- [ ] Replace executive-intelligence placeholder providers with insight APIs
- [ ] Wire CHANAKYA Executive Briefing to `useExecutiveBrief()` / `ExecutiveBriefModel`

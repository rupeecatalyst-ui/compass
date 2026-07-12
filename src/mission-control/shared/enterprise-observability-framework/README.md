# Enterprise Observability Framework

Reusable observability infrastructure for Catalyst One.

Engines **publish** health, dependency, queue, and metrics contracts.  
Observability Center **consumes providers only**.

## Non-goals

- No telemetry collection
- No metrics engines
- No APIs / databases
- No business logic / alerting execution

## Folder structure

```
enterprise-observability-framework/
  types/           Health · severity · queue · telemetry enums
  contracts/       Publisher · Health · Service · Telemetry · Metrics · Queue · Job · Provider · Dependency graph
  registry/        Publishers + HealthRegistry + ObservabilityRegistry
  providers/       Registry · Health · Service · Telemetry · Metrics · Queue · Provider · Dependency · Error
  adapters/        Project contracts → Observability Center models
  index.ts
```

## Integration

```ts
import { createEnterpriseObservabilityFramework } from "@/mission-control/shared/enterprise-observability-framework";

const fw = createEnterpriseObservabilityFramework();
const engines = await fw.healthProvider.listEngines();
const queues = await fw.queueProvider.listQueues();
```

## Future roadmap

- [ ] Live subsystem health probes
- [ ] Telemetry / OTel adapters (deferred)
- [ ] Metrics backends (deferred)
- [ ] Queue / job runtime adapters
- [ ] Dependency graph visualization
- [ ] Cross-link Alert Framework error signals
- [ ] Persistent registry store

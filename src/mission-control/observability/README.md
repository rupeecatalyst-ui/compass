# Enterprise Observability Center

Executive observability workspace inside Mission Control.

**Not** a metrics product. **Not** live telemetry.

## Route

`/mission-control/observability`

## Layout

Platform Health · Engine Health · Service Status · Performance Overview · Availability · Error Timeline · Background Jobs · Queues · Dependencies · Provider Health

## Providers (placeholders)

PlatformHealthProvider · EngineHealthProvider · PerformanceProvider · JobsQueuesProvider · DependencyProvider · ObservabilityCenterProvider

Observability Center providers project from the Enterprise Observability Framework
(`shared/enterprise-observability-framework`).

## Future TODOs

- [ ] Bind engine health to live subsystem probes
- [ ] Wire Alert Framework error projections
- [ ] Queue / job runtime adapters
- [ ] SLO evaluation engine (deferred)
- [ ] Telemetry / metrics collection (explicitly deferred)
- [ ] Database and API backends (explicitly deferred)

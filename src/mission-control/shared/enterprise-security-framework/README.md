# Enterprise Security Framework

Reusable security infrastructure for Catalyst One.

Engines **publish** security contracts. Security Operations Center **consumes providers**.

## Non-goals

- No authentication implementation
- No authorization enforcement
- No MFA / break-glass execution
- No audit execution
- No APIs / databases / business logic

## Folder structure

```
enterprise-security-framework/
  types/           Health · severity · category · lifecycle enums
  contracts/       Publisher · Policy · Event · Permission · Session · Threat · Compliance
  categories/      Security taxonomy
  policies/        Placeholder policy catalog
  registry/        Publisher registry + in-memory SecurityRegistry
  providers/       Registry · Event · Threat · Session · Permission · Compliance · Policy · Domain
  adapters/        Project contracts → SOC presentation models
  index.ts
```

## Placeholder publishers

Workflow Engine · Credit & Risk · Customer 360 · Partner Management · Document Intelligence · Product Intelligence · Loan Workspace · Opportunity Lifecycle · Mission Control · Security Operations · Identity Fabric · Access Governance · Threat Detection · Compliance · Horizon · Observability · Digital Twin · Mission Replay · AI Control Tower · Task Engine · Dialogue Center · Notification Engine · Platform Modes

## Integration

```ts
import { createEnterpriseSecurityFramework } from "@/mission-control/shared/enterprise-security-framework";

const fw = createEnterpriseSecurityFramework();
const threats = await fw.threatProvider.listThreats();
const events = await fw.eventProvider.listEvents();
```

SOC providers may project framework data via adapters.

## Future roadmap

- [ ] Bind Identity Fabric to live directory providers
- [ ] Enforce permission contracts in Security Gateway
- [ ] Session revocation workflows (operator-confirmed)
- [ ] Break-glass activation with dual control + audit
- [ ] Threat sensor / SIEM adapters
- [ ] Compliance control evaluation engines
- [ ] Cross-link Alert Framework events ↔ security events
- [ ] Persistent policy / registry store

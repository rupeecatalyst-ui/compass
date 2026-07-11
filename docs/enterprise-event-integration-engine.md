# Enterprise Event & Integration Engine (EEIE) — Architecture

**Sprint:** Catalyst One Sprint 6 (CF-S06-001)  
**Version:** 6.0.0  
**Status:** Foundation (in-memory, no runtime bus enforcement)

---

## Purpose

EEIE is the canonical event backbone for Catalyst One. Every enterprise engine and future business module communicates through domain events instead of direct engine-to-engine calls.

---

## Core Domain Models

| Model | Type |
|-------|------|
| Domain Event | `EeieDomainEvent` |
| Event Type | `EeieEventType` |
| Event Category | `EeieEventCategory` |
| Event Version | `EeieEventVersion` |
| Event Schema | `EeieEventSchema` |
| Event Publisher | `EeieEventPublisher` |
| Event Subscriber | `EeieEventSubscriber` |
| Event Subscription | `EeieEventSubscription` |
| Event Bus | `getEeieEventBusConfig()` |
| Event Envelope | `EeieEventEnvelope` |
| Event Metadata | `EeieEventMetadata` |
| Correlation ID | `correlationId` on envelope |
| Causation ID | `causationId` on envelope |
| Integration Endpoint | `EeieIntegrationEndpoint` |
| Integration Adapter | `EeieIntegrationAdapter` |
| Retry Policy | `EeieRetryPolicy` |
| Dead Letter Queue | `EeieDeadLetterEntry` |
| Event Replay | `EeieEventReplay` |
| Event Audit Reference | `EeieEventAuditReference` |

---

## Capabilities

- Publish / subscribe / unsubscribe
- In-memory event routing with topic-style filtering
- Event versioning and schema validation
- Correlation and causation tracking
- Retry policy with dead-letter queue
- Event replay with eligibility validation
- Integration adapter abstraction
- Audit references via EAF

---

## Event Definition Lifecycle

Draft → Validated → Approved → Published → Deprecated → Archived

---

## Validation

| Rule | Function |
|------|----------|
| Duplicate event codes | `validateEeieEventCodeUniqueness` |
| Invalid schema version | `validateEeieSchemaVersion` |
| Duplicate subscriptions | `validateEeieSubscriptionUniqueness` |
| Invalid publisher | `validateEeiePublisher` |
| Invalid subscriber | `validateEeieSubscriber` |
| Retry policy consistency | `validateEeieRetryPolicy` |
| Replay eligibility | `validateEeieReplayEligibility` |

---

## Architecture

**Ports:** `getEeiePorts()`, `configureEeiePorts()`, `resetEeieComposition()`

**Modules:**
- `publisher-registry.ts` — publisher registration
- `subscriber-registry.ts` — subscriber and subscription management
- `event-bus.ts` — publish, route, filter, deliver
- `replay-manager.ts` — event replay
- `retry-manager.ts` — retry and dead-letter handling
- `validation-engine.ts` — validation rules
- `audit-integration.ts` — EAF audit bridge

---

## Integration Boundaries

| Engine | Relationship |
|--------|--------------|
| EAF (Sprint 1) | Audit via `appendEafAuditEntry`; EAF in-process publisher can migrate to EEIE |
| EWE (Sprint 5) | Future — workflow events via EEIE |
| EOWE (Sprint 4) | Future — org events via EEIE |
| Admin workflow-engine | Unchanged — separate design-time layer |

Sprint 1–5 source files are **unmodified**.

---

## Non-Goals

- Database integration
- UI implementation
- API endpoints
- Loan-specific logic
- External message broker (in-memory only)

---

## Public API

```typescript
import {
  registerEeieEventType,
  registerEeiePublisher,
  subscribeEeieEvent,
  publishEeieEvent,
} from "@/constants/enterprise-event-integration-engine-exports";
```

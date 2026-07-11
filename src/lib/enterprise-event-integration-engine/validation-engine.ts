/**
 * EEIE validation engine.
 */

import {
  EEIE_DEFINITION_LIFECYCLE_TRANSITIONS,
  EEIE_EVENT_DEFINITION_LIFECYCLE_STATUS,
  EEIE_SCHEMA_VERSION_PATTERN,
} from "@/constants/enterprise-event-integration-engine";
import type {
  EeieEventDefinitionLifecycleStatus,
  EeieEventEnvelope,
  EeieEventSubscription,
  EeieEventType,
  EeieEventVersion,
  EeieRetryPolicy,
  EeieValidationIssue,
  EeieValidationResult,
} from "@/types/enterprise-event-integration-engine";
import type {
  EeieEventTypeRepositoryPort,
  EeieSubscriptionRepositoryPort,
} from "@/types/enterprise-event-integration-engine-ports";
import { getEeiePorts } from "./composition";

function issue(
  code: string,
  severity: EeieValidationIssue["severity"],
  message: string,
  entityRef?: string,
): EeieValidationIssue {
  return { code, severity, message, entityRef };
}

export function validateEeieDefinitionLifecycleTransition(
  from: EeieEventDefinitionLifecycleStatus,
  to: EeieEventDefinitionLifecycleStatus,
): void {
  const allowed = EEIE_DEFINITION_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`EEIE validation: cannot transition event definition lifecycle from "${from}" to "${to}".`);
  }
}

export function validateEeieEventCodeUniqueness(
  repo: EeieEventTypeRepositoryPort,
  eventCode: string,
  tenantId?: string,
  excludeId?: string,
): void {
  const duplicate = repo
    .list()
    .find(
      (e) =>
        e.eventCode === eventCode &&
        e.id !== excludeId &&
        (tenantId === undefined || e.tenantId === tenantId),
    );
  if (duplicate) {
    throw new Error(`EEIE validation: event code "${eventCode}" already exists.`);
  }
}

export function validateEeieSchemaVersion(schemaVersion: string): void {
  if (!EEIE_SCHEMA_VERSION_PATTERN.test(schemaVersion)) {
    throw new Error(
      `EEIE validation: invalid schema version "${schemaVersion}" — expected semver (e.g. 1.0.0).`,
    );
  }
}

export function validateEeieEventType(
  repo: EeieEventTypeRepositoryPort,
  eventType: EeieEventType,
  existing?: EeieEventType,
): void {
  validateEeieEventCodeUniqueness(repo, eventType.eventCode, eventType.tenantId, existing?.id);
  if (existing && existing.tenantId !== eventType.tenantId) {
    throw new Error("EEIE validation: tenantId is immutable after event type creation.");
  }
}

export function validateEeieEventVersion(version: EeieEventVersion): EeieValidationResult {
  const issues: EeieValidationIssue[] = [];

  validateEeieSchemaVersion(version.schema.schemaVersion);

  if (version.schema.requiredFields.length === 0) {
    issues.push(
      issue("EEIE_SCHEMA_EMPTY", "warning", "Event schema has no required fields.", version.id),
    );
  }

  const eventType = getEeiePorts().eventTypes.findById(version.eventTypeId);
  if (!eventType) {
    issues.push(
      issue("EEIE_INVALID_EVENT_TYPE", "error", "Event version references unknown event type.", version.id),
    );
  } else if (eventType.eventCode !== version.eventCode) {
    issues.push(
      issue("EEIE_INVALID_EVENT_TYPE", "error", "Event version eventCode must match event type.", version.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function assertEeieEventVersionValid(version: EeieEventVersion): void {
  const result = validateEeieEventVersion(version);
  if (!result.valid) {
    const messages = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => i.message)
      .join("; ");
    throw new Error(`EEIE validation: event version invalid — ${messages}`);
  }
}

export function validateEeiePublisher(publisherId: string): void {
  const publisher = getEeiePorts().publishers.findById(publisherId);
  if (!publisher?.enabled) {
    throw new Error(`EEIE validation: invalid or disabled publisher "${publisherId}".`);
  }
}

export function validateEeieSubscriber(subscriberId: string): void {
  const subscriber = getEeiePorts().subscribers.findById(subscriberId);
  if (!subscriber?.enabled) {
    throw new Error(`EEIE validation: invalid or disabled subscriber "${subscriberId}".`);
  }
}

export function validateEeieSubscriptionUniqueness(
  repo: EeieSubscriptionRepositoryPort,
  subscription: EeieEventSubscription,
  excludeId?: string,
): void {
  const duplicateCode = repo
    .list()
    .find((s) => s.subscriptionCode === subscription.subscriptionCode && s.id !== excludeId);
  if (duplicateCode) {
    throw new Error(
      `EEIE validation: subscription code "${subscription.subscriptionCode}" already exists.`,
    );
  }

  const duplicateBinding = repo.list().find(
    (s) =>
      s.id !== excludeId &&
      s.subscriberId === subscription.subscriberId &&
      s.eventTypeId === subscription.eventTypeId &&
      s.eventCode === subscription.eventCode &&
      s.category === subscription.category &&
      s.enabled,
  );
  if (duplicateBinding) {
    throw new Error("EEIE validation: duplicate subscription binding for subscriber and event filter.");
  }
}

export function validateEeieSubscription(
  subscription: EeieEventSubscription,
  existing?: EeieEventSubscription,
): void {
  validateEeieSubscriber(subscription.subscriberId);
  validateEeieSubscriptionUniqueness(getEeiePorts().subscriptions, subscription, existing?.id);

  if (subscription.retryPolicyId) {
    validateEeieRetryPolicyConsistency(subscription.retryPolicyId);
  }

  if (!subscription.eventTypeId && !subscription.eventCode && !subscription.category) {
    throw new Error("EEIE validation: subscription must specify eventTypeId, eventCode, or category.");
  }
}

export function validateEeieRetryPolicy(policy: EeieRetryPolicy): void {
  if (!policy.enabled) {
    throw new Error(`EEIE validation: retry policy "${policy.policyCode}" is disabled.`);
  }
  if (policy.maxAttempts < 1) {
    throw new Error(`EEIE validation: retry policy "${policy.policyCode}" maxAttempts must be >= 1.`);
  }
  if (policy.initialDelayMs < 0 || policy.maxDelayMs < policy.initialDelayMs) {
    throw new Error(`EEIE validation: retry policy "${policy.policyCode}" has inconsistent delay bounds.`);
  }
  if (policy.strategy === "exponential" && policy.backoffMultiplier < 1) {
    throw new Error(
      `EEIE validation: retry policy "${policy.policyCode}" exponential strategy requires backoffMultiplier >= 1.`,
    );
  }
}

export function validateEeieRetryPolicyConsistency(policyId: string): EeieRetryPolicy {
  const policy = getEeiePorts().retryPolicies.findById(policyId);
  if (!policy) {
    throw new Error(`EEIE validation: invalid or disabled retry policy "${policyId}".`);
  }
  validateEeieRetryPolicy(policy);
  return policy;
}

export function validateEeieReplayEligibility(envelope: EeieEventEnvelope): void {
  const eventType = getEeiePorts().eventTypes.findByCode(envelope.eventCode);
  if (!eventType) {
    throw new Error(`EEIE validation: envelope event code "${envelope.eventCode}" not registered.`);
  }

  const publishedVersion = getEeiePorts()
    .eventVersions.listByEventType(eventType.id)
    .find((v) => v.lifecycleStatus === EEIE_EVENT_DEFINITION_LIFECYCLE_STATUS.PUBLISHED);

  if (!publishedVersion) {
    throw new Error(`EEIE validation: no published version for event "${envelope.eventCode}" — replay ineligible.`);
  }
}

export function validateEeiePublishRequest(input: {
  eventCode: string;
  publisherId: string;
  eventVersion: string;
}): EeieEventVersion {
  validateEeiePublisher(input.publisherId);

  const eventType = getEeiePorts().eventTypes.findByCode(input.eventCode);
  if (!eventType) {
    throw new Error(`EEIE validation: event code "${input.eventCode}" not registered.`);
  }
  if (eventType.lifecycleStatus !== EEIE_EVENT_DEFINITION_LIFECYCLE_STATUS.PUBLISHED) {
    throw new Error(`EEIE validation: event type "${input.eventCode}" is not published.`);
  }

  const version = getEeiePorts()
    .eventVersions.listByEventType(eventType.id)
    .find(
      (v) =>
        v.lifecycleStatus === EEIE_EVENT_DEFINITION_LIFECYCLE_STATUS.PUBLISHED &&
        v.schema.schemaVersion === input.eventVersion,
    );

  if (!version) {
    throw new Error(
      `EEIE validation: no published event version with schema version "${input.eventVersion}" for "${input.eventCode}".`,
    );
  }

  return version;
}

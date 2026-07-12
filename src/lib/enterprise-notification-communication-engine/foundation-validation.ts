/**
 * ENCE foundation validation — smoke checks for SPR-001.
 */

import {
  ENCE_CHANNELS,
  ENCE_EXTERNAL_DELIVERY_ENABLED,
  ENCE_FRAMEWORK_VERSION,
} from "@/constants/enterprise-notification-communication-engine";
import { configurePlatformModes, resetPlatformModes } from "@/lib/enterprise-platform-modes";
import {
  listEnceSimulations,
  registerEncePolicy,
  registerEnceTemplate,
  simulateEnceCommunication,
} from "./communication-registry";
import { resetEnceComposition } from "./composition";
import { getEnceFrameworkVersion, getEnceRegistrySnapshot } from "./registry-snapshot";

export function runEnceFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEnceComposition();
  resetPlatformModes();

  const policy = registerEncePolicy({
    policyCode: "NOTIFY_DEFAULT",
    policyName: "Default notification policy",
    channels: [ENCE_CHANNELS.EMAIL, ENCE_CHANNELS.IN_APP],
    dialogueIntegrationRef: "edc:dialogue:default",
    enabled: true,
    createdBy: "system",
  });

  const template = registerEnceTemplate({
    templateCode: "WELCOME",
    templateName: "Welcome message",
    channel: ENCE_CHANNELS.EMAIL,
    subject: "Welcome",
    body: "Hello {{name}}",
    policyRef: policy.id,
    enabled: true,
    createdBy: "system",
  });

  const sim = simulateEnceCommunication({
    policyRef: policy.id,
    templateRef: template.id,
    channel: ENCE_CHANNELS.EMAIL,
    recipientRef: "ecm:contact:001",
    payload: { name: "Ravi" },
    simulatedBy: "system",
  });

  configurePlatformModes({ communicationMode: "live" });
  const liveSim = simulateEnceCommunication({
    channel: ENCE_CHANNELS.SMS,
    recipientRef: "ecm:contact:002",
    simulatedBy: "system",
  });
  resetPlatformModes();

  const snap = getEnceRegistrySnapshot();
  const passed =
    getEnceFrameworkVersion() === ENCE_FRAMEWORK_VERSION &&
    ENCE_EXTERNAL_DELIVERY_ENABLED === false &&
    sim.status === "simulated" &&
    Boolean(liveSim.warning) &&
    listEnceSimulations().length === 2 &&
    snap.policies.length === 1 &&
    snap.templates.length === 1 &&
    snap.auditReferences.length >= 4;

  return {
    passed,
    details: {
      frameworkVersion: getEnceFrameworkVersion(),
      externalDeliveryEnabled: ENCE_EXTERNAL_DELIVERY_ENABLED,
      simulations: snap.simulations.length,
      liveWarning: liveSim.warning,
      auditReferences: snap.auditReferences.length,
    },
  };
}

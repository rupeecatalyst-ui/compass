/**
 * ECG foundation validation — SPR-005 smoke checks.
 */

import { ECG_FRAMEWORK_VERSION } from "@/constants/enterprise-interface-configuration-grants";
import { resetEcgComposition } from "./composition";
import {
  createEcgConfigPackage,
  initializeEcgConfigurationCenter,
  listEcgDomains,
  listEcgEngines,
  transitionEcgConfigPackage,
} from "./configuration-registry";
import { createEcgEngineConfigAdapter } from "./engine-adapters";
import { getEcgConfigurationHealth } from "./health";
import { canTransitionEcgLifecycle } from "./lifecycle";
import { getEcgFrameworkVersion } from "./registry-snapshot";
import { registerEcgSection } from "./section-registry";

export function runEcgFoundationValidation(): {
  passed: boolean;
  details: Record<string, unknown>;
} {
  resetEcgComposition();
  initializeEcgConfigurationCenter("validation");

  registerEcgSection({
    sectionCode: "ECG-IFACE-SHELL",
    sectionName: "Interface shell",
    kind: "interface",
    description: "Framework placeholder",
    enabled: true,
    createdBy: "validation",
  });

  const domains = listEcgDomains();
  const engines = listEcgEngines();
  const health = getEcgConfigurationHealth();

  const draft = createEcgConfigPackage({
    domainKey: "compass",
    engineKey: "opportunity_compass",
    actorId: "validation",
    reason: "Validation draft",
    payload: { needleThreshold: 80 },
  });

  const validated = transitionEcgConfigPackage({
    packageId: draft.id,
    toState: "validate",
    actorId: "validation",
    reason: "Validation step",
  });
  const tested = transitionEcgConfigPackage({
    packageId: validated.id,
    toState: "test",
    actorId: "validation",
    reason: "Test step",
  });
  const approved = transitionEcgConfigPackage({
    packageId: tested.id,
    toState: "approve",
    actorId: "validation",
    reason: "Approve step",
  });
  const published = transitionEcgConfigPackage({
    packageId: approved.id,
    toState: "publish",
    actorId: "validation",
    reason: "Publish step",
  });

  const adapter = createEcgEngineConfigAdapter("opportunity_compass");
  const publishedConfig = adapter.readPublishedConfig();

  const passed =
    getEcgFrameworkVersion() === ECG_FRAMEWORK_VERSION &&
    domains.length >= 15 &&
    engines.length >= 10 &&
    health.registeredEngines === engines.length &&
    canTransitionEcgLifecycle("draft", "validate") &&
    published.isPublished &&
    published.lifecycleState === "publish" &&
    publishedConfig !== null &&
    adapter.isReady;

  return {
    passed,
    details: {
      version: getEcgFrameworkVersion(),
      domainCount: domains.length,
      engineCount: engines.length,
      health,
      publishedVersion: published.version.label,
      adapterRead: publishedConfig,
      lifecycleOk: canTransitionEcgLifecycle("publish", "rollback"),
    },
  };
}

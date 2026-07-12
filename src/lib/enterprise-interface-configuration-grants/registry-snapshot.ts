/**
 * ECG registry snapshot (SPR-005).
 */

import { ECG_FRAMEWORK_VERSION } from "@/constants/enterprise-interface-configuration-grants";
import type {
  EcgFrameworkSnapshot,
  EcgRegistrySnapshot,
} from "@/types/enterprise-interface-configuration-grants";
import { getEcgPorts } from "./composition";
import { getEcgConfigurationHealth } from "./health";

export function getEcgFrameworkVersion(): string {
  return ECG_FRAMEWORK_VERSION;
}

export function getEcgRegistrySnapshot(): EcgRegistrySnapshot {
  const ports = getEcgPorts();
  return {
    sections: ports.sections.list(),
    domains: ports.domains.list(),
    engines: ports.engines.list(),
    packages: ports.packages.list(),
    configAudits: ports.configAudits.list(),
    auditReferences: ports.auditReferences.list(),
  };
}

export function getEcgFrameworkSnapshot(): EcgFrameworkSnapshot {
  return {
    frameworkVersion: getEcgFrameworkVersion(),
    ...getEcgRegistrySnapshot(),
    health: getEcgConfigurationHealth(),
  };
}

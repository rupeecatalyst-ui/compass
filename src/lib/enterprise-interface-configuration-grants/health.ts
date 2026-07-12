/**
 * ECG configuration health summary.
 */

import type { EcgConfigurationHealthSummary } from "@/types/enterprise-interface-configuration-grants";
import { getEcgPorts } from "./composition";

export function getEcgConfigurationHealth(): EcgConfigurationHealthSummary {
  const engines = getEcgPorts().engines.list();
  const domains = getEcgPorts().domains.list();
  const packages = getEcgPorts().packages.list();

  const registeredEngines = engines.length;
  const configuredEngines = engines.filter(
    (e) => e.configurationStatus === "healthy" || e.publishedVersionLabel,
  ).length;
  const pendingConfiguration = engines.filter(
    (e) => e.configurationStatus === "not_configured" || e.configurationStatus === "incomplete",
  ).length;
  const draftConfigurations = packages.filter(
    (p) => !p.isPublished && p.lifecycleState === "draft",
  ).length;
  const publishedConfigurations = packages.filter((p) => p.isPublished).length;
  const domainsHealthy = domains.filter((d) => d.status === "healthy").length;
  const domainsTotal = domains.length;

  let overallStatus: EcgConfigurationHealthSummary["overallStatus"] = "healthy";
  if (pendingConfiguration > registeredEngines * 0.5) overallStatus = "incomplete";
  else if (pendingConfiguration > 0 || draftConfigurations > 0) overallStatus = "attention";

  return {
    registeredEngines,
    configuredEngines,
    pendingConfiguration,
    draftConfigurations,
    publishedConfigurations,
    domainsHealthy,
    domainsTotal,
    overallStatus,
  };
}

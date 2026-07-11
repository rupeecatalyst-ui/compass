/**
 * EOWE registry snapshot.
 */

import { EOWE_FRAMEWORK_VERSION } from "@/constants/enterprise-organization-workspace-engine";
import type { EoweRegistrySnapshot } from "@/types/enterprise-organization-workspace-engine";
import { getEowePorts } from "./composition";

export function getEoweFrameworkVersion(): string {
  return EOWE_FRAMEWORK_VERSION;
}

export function getEoweRegistrySnapshot(): EoweRegistrySnapshot {
  const ports = getEowePorts();
  return {
    tenants: ports.tenants.list(),
    nodes: ports.hierarchy.list(),
    workspaces: ports.workspaces.list(),
    ownerships: ports.ownerships.list(),
    metadata: ports.metadata.list(),
  };
}

import { ECM_FRAMEWORK_VERSION } from "@/constants/enterprise-contact-master";
import type { EcmRegistrySnapshot } from "@/types/enterprise-contact-master";
import { getEcmPorts } from "./composition";

export function getEcmFrameworkVersion(): string {
  return ECM_FRAMEWORK_VERSION;
}

export function getEcmRegistrySnapshot(): EcmRegistrySnapshot {
  const ports = getEcmPorts();
  return {
    contacts: ports.contacts.list(),
    auditReferences: ports.auditReferences.list(),
  };
}

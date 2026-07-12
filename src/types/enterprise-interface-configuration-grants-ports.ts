/**
 * ECG ports — repository contracts (SPR-005 extended).
 */

import type {
  EcgAuditReference,
  EcgConfigChangeAudit,
  EcgConfigPackage,
  EcgConfigurationDomain,
  EcgEngineRegistration,
  EcgRegistrySnapshot,
  EcgSectionDefinition,
} from "./enterprise-interface-configuration-grants";

export interface EcgSectionRepositoryPort {
  list(): EcgSectionDefinition[];
  findById(id: string): EcgSectionDefinition | undefined;
  findByCode(sectionCode: string): EcgSectionDefinition | undefined;
  listByKind(kind: string): EcgSectionDefinition[];
  save(section: EcgSectionDefinition): void;
  replaceAll(sections: EcgSectionDefinition[]): void;
}

export interface EcgDomainRepositoryPort {
  list(): EcgConfigurationDomain[];
  findByKey(domainKey: string): EcgConfigurationDomain | undefined;
  save(domain: EcgConfigurationDomain): void;
  replaceAll(domains: EcgConfigurationDomain[]): void;
}

export interface EcgEngineRepositoryPort {
  list(): EcgEngineRegistration[];
  findByKey(engineKey: string): EcgEngineRegistration | undefined;
  save(engine: EcgEngineRegistration): void;
  replaceAll(engines: EcgEngineRegistration[]): void;
}

export interface EcgPackageRepositoryPort {
  list(): EcgConfigPackage[];
  findById(id: string): EcgConfigPackage | undefined;
  listByDomain(domainKey: string): EcgConfigPackage[];
  findPublished(domainKey: string): EcgConfigPackage | undefined;
  findDraft(domainKey: string): EcgConfigPackage | undefined;
  save(pkg: EcgConfigPackage): void;
  replaceAll(packages: EcgConfigPackage[]): void;
}

export interface EcgConfigAuditRepositoryPort {
  list(): EcgConfigChangeAudit[];
  listByDomain(domainKey: string): EcgConfigChangeAudit[];
  save(entry: EcgConfigChangeAudit): void;
  replaceAll(entries: EcgConfigChangeAudit[]): void;
}

export interface EcgAuditReferenceRepositoryPort {
  list(): EcgAuditReference[];
  save(reference: EcgAuditReference): void;
  replaceAll(references: EcgAuditReference[]): void;
}

export interface EcgPorts {
  sections: EcgSectionRepositoryPort;
  domains: EcgDomainRepositoryPort;
  engines: EcgEngineRepositoryPort;
  packages: EcgPackageRepositoryPort;
  configAudits: EcgConfigAuditRepositoryPort;
  auditReferences: EcgAuditReferenceRepositoryPort;
}

export type PartialEcgPorts = Partial<EcgPorts>;
export type { EcgRegistrySnapshot };

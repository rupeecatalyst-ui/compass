/**
 * ECG configuration registry — domains, engines, packages.
 */

import {
  createEcgVersion,
  ECG_DOMAIN_CATALOGUE,
  ECG_ENGINE_CATALOGUE,
} from "@/constants/enterprise-interface-configuration-grants";
import type {
  EcgConfigLifecycleState,
  EcgConfigPackage,
  EcgConfigurationDomain,
  EcgDomainKey,
  EcgEngineKey,
  EcgEngineRegistration,
  EcgVersionDescriptor,
} from "@/types/enterprise-interface-configuration-grants";
import { recordEcgAudit } from "./audit-integration";
import { recordEcgConfigChange } from "./config-audit";
import { getEcgPorts } from "./composition";
import { assertEcgLifecycleTransition } from "./lifecycle";

export function registerEcgEngine(input: {
  engineKey: EcgEngineKey;
  engineName: string;
  frameworkVersion: string;
  domainKey: EcgDomainKey;
  configurationStatus?: EcgEngineRegistration["configurationStatus"];
  publishedVersionLabel?: string;
  lastPublishedOn?: string;
  adapterReady?: boolean;
}): EcgEngineRegistration {
  const existing = getEcgPorts().engines.findByKey(input.engineKey);
  const now = new Date().toISOString();
  const engine: EcgEngineRegistration = {
    id: existing?.id ?? crypto.randomUUID(),
    engineKey: input.engineKey,
    engineName: input.engineName,
    frameworkVersion: input.frameworkVersion,
    configurationStatus: input.configurationStatus ?? existing?.configurationStatus ?? "not_configured",
    publishedVersionLabel: input.publishedVersionLabel ?? existing?.publishedVersionLabel,
    lastPublishedOn: input.lastPublishedOn ?? existing?.lastPublishedOn,
    domainKey: input.domainKey,
    adapterReady: input.adapterReady ?? true,
    registeredOn: existing?.registeredOn ?? now,
  };
  getEcgPorts().engines.save(engine);
  if (!existing) {
    recordEcgAudit({
      entityId: engine.id,
      entityType: "engine",
      action: "created",
      actorId: "system",
      remarks: `ECG engine registered ${engine.engineKey}`,
    });
  }
  return engine;
}

export function listEcgEngines(): EcgEngineRegistration[] {
  return getEcgPorts().engines.list();
}

export function getEcgEngine(engineKey: EcgEngineKey): EcgEngineRegistration | undefined {
  return getEcgPorts().engines.findByKey(engineKey);
}

export function registerEcgDomain(input: {
  domainKey: EcgDomainKey;
  name: string;
  description: string;
  engineKey?: EcgEngineKey;
  status?: EcgConfigurationDomain["status"];
  lifecycleState?: EcgConfigLifecycleState;
  currentVersion?: EcgVersionDescriptor;
  publishedVersion?: EcgVersionDescriptor;
  publishedOn?: string;
  actorId?: string;
}): EcgConfigurationDomain {
  const existing = getEcgPorts().domains.findByKey(input.domainKey);
  const now = new Date().toISOString();
  const actorId = input.actorId ?? "system";
  const domain: EcgConfigurationDomain = {
    id: existing?.id ?? crypto.randomUUID(),
    domainKey: input.domainKey,
    name: input.name,
    description: input.description,
    engineKey: input.engineKey,
    status: input.status ?? existing?.status ?? "not_configured",
    lifecycleState: input.lifecycleState ?? existing?.lifecycleState ?? "draft",
    currentVersion: input.currentVersion ?? existing?.currentVersion ?? createEcgVersion(12, 1, 1),
    publishedVersion: input.publishedVersion ?? existing?.publishedVersion,
    publishedOn: input.publishedOn ?? existing?.publishedOn,
    lastUpdatedOn: now,
    lastUpdatedBy: actorId,
    enabled: true,
  };
  getEcgPorts().domains.save(domain);
  if (!existing) {
    recordEcgAudit({
      entityId: domain.id,
      entityType: "domain",
      action: "created",
      actorId,
      remarks: `ECG domain ${domain.domainKey}`,
    });
  }
  return domain;
}

export function listEcgDomains(): EcgConfigurationDomain[] {
  return getEcgPorts().domains.list();
}

export function getEcgDomain(domainKey: EcgDomainKey): EcgConfigurationDomain | undefined {
  return getEcgPorts().domains.findByKey(domainKey);
}

export function createEcgConfigPackage(input: {
  domainKey: EcgDomainKey;
  engineKey?: EcgEngineKey;
  version?: EcgVersionDescriptor;
  payload?: Record<string, unknown>;
  actorId: string;
  reason?: string;
}): EcgConfigPackage {
  const now = new Date().toISOString();
  const version = input.version ?? createEcgVersion(12, 1, 1);
  const pkg: EcgConfigPackage = {
    id: crypto.randomUUID(),
    domainKey: input.domainKey,
    engineKey: input.engineKey,
    lifecycleState: "draft",
    version,
    payload: input.payload ?? {},
    isPublished: false,
    isRollbackCandidate: false,
    createdBy: input.actorId,
    createdOn: now,
    modifiedBy: input.actorId,
    modifiedOn: now,
    reason: input.reason,
  };
  getEcgPorts().packages.save(pkg);
  recordEcgAudit({
    entityId: pkg.id,
    entityType: "package",
    action: "created",
    actorId: input.actorId,
    remarks: `ECG package draft ${pkg.domainKey} ${pkg.version.label}`,
  });
  recordEcgConfigChange({
    domainKey: input.domainKey,
    packageId: pkg.id,
    actorId: input.actorId,
    fieldPath: "package.created",
    previousValue: null,
    newValue: pkg.version.label,
    reason: input.reason ?? "Draft configuration package created",
    lifecycleState: "draft",
  });
  return pkg;
}

export function transitionEcgConfigPackage(input: {
  packageId: string;
  toState: EcgConfigLifecycleState;
  actorId: string;
  reason: string;
}): EcgConfigPackage {
  const pkg = getEcgPorts().packages.findById(input.packageId);
  if (!pkg) throw new Error("ECG config package not found");
  assertEcgLifecycleTransition(pkg.lifecycleState, input.toState);

  const now = new Date().toISOString();
  const previous = pkg.lifecycleState;
  let updated: EcgConfigPackage = {
    ...pkg,
    lifecycleState: input.toState,
    modifiedBy: input.actorId,
    modifiedOn: now,
    reason: input.reason,
  };

  if (input.toState === "publish") {
    // Unpublish prior packages for domain
    for (const other of getEcgPorts().packages.listByDomain(pkg.domainKey)) {
      if (other.id !== pkg.id && other.isPublished) {
        getEcgPorts().packages.save({
          ...other,
          isPublished: false,
          isRollbackCandidate: true,
          modifiedOn: now,
          modifiedBy: input.actorId,
        });
      }
    }
    updated = {
      ...updated,
      isPublished: true,
      isRollbackCandidate: false,
      publishedBy: input.actorId,
      publishedOn: now,
      version: {
        ...updated.version,
        draft: 0,
        label: `${updated.version.major}.${updated.version.minor}.0`,
      },
    };

    const domain = getEcgPorts().domains.findByKey(pkg.domainKey);
    if (domain) {
      getEcgPorts().domains.save({
        ...domain,
        lifecycleState: "publish",
        status: "healthy",
        publishedVersion: updated.version,
        publishedOn: now,
        currentVersion: updated.version,
        lastUpdatedOn: now,
        lastUpdatedBy: input.actorId,
      });
    }
    const engine = pkg.engineKey ? getEcgPorts().engines.findByKey(pkg.engineKey) : undefined;
    if (engine) {
      getEcgPorts().engines.save({
        ...engine,
        configurationStatus: "healthy",
        publishedVersionLabel: updated.version.label,
        lastPublishedOn: now,
      });
    }
  }

  if (input.toState === "rollback") {
    updated = {
      ...updated,
      isPublished: true,
      isRollbackCandidate: false,
      publishedBy: input.actorId,
      publishedOn: now,
    };
  }

  getEcgPorts().packages.save(updated);
  recordEcgAudit({
    entityId: updated.id,
    entityType: "package",
    action: "lifecycle_changed",
    actorId: input.actorId,
    remarks: `ECG ${previous} → ${input.toState}: ${input.reason}`,
  });
  recordEcgConfigChange({
    domainKey: pkg.domainKey,
    packageId: pkg.id,
    actorId: input.actorId,
    fieldPath: "lifecycleState",
    previousValue: previous,
    newValue: input.toState,
    reason: input.reason,
    lifecycleState: input.toState,
  });
  return updated;
}

export function listEcgConfigPackages(domainKey?: EcgDomainKey): EcgConfigPackage[] {
  const all = domainKey
    ? getEcgPorts().packages.listByDomain(domainKey)
    : getEcgPorts().packages.list();
  return [...all].sort(
    (a, b) => new Date(b.modifiedOn).getTime() - new Date(a.modifiedOn).getTime(),
  );
}

/** Seed domains + engines once. Does not migrate engine rules. */
export function initializeEcgConfigurationCenter(actorId = "system"): void {
  for (const seed of ECG_ENGINE_CATALOGUE) {
    registerEcgEngine({
      ...seed,
      configurationStatus: "incomplete",
      adapterReady: true,
    });
  }

  for (const seed of ECG_DOMAIN_CATALOGUE) {
    registerEcgDomain({
      ...seed,
      status: "incomplete",
      lifecycleState: "draft",
      currentVersion: createEcgVersion(12, 1, 1),
      actorId,
    });
  }

  // Seed one draft package for health_score / pulse as architecture examples
  for (const domainKey of ["health_score", "pulse", "workflow"] as EcgDomainKey[]) {
    if (getEcgPorts().packages.listByDomain(domainKey).length > 0) continue;
    const domain = getEcgPorts().domains.findByKey(domainKey);
    createEcgConfigPackage({
      domainKey,
      engineKey: domain?.engineKey,
      actorId,
      reason: "Architecture placeholder — no rule migration",
      payload: { placeholder: true, note: "Future ECG-managed config" },
    });
  }
}

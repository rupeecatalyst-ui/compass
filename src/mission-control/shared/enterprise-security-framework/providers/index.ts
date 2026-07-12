/**
 * Placeholder providers for the Enterprise Security Framework.
 */

import { listSecurityFrameworkCategories } from "../categories";
import type {
  SecurityCategory,
  SecurityComplianceSnapshot,
  SecurityDomainSignal,
  SecurityEventContract,
  SecurityPermission,
  SecurityPolicy,
  SecurityPublisher,
  SecurityRegistry,
  SecuritySession,
  SecurityThreat,
} from "../contracts";
import { listPlaceholderSecurityPolicies } from "../policies";
import {
  createSecurityRegistry,
  defaultSecurityRegistry,
} from "../registry";
import type { FrameworkSecurityHealth } from "../types";

export interface SecurityFrameworkConfiguration {
  version: string;
  allowRuntimePublisherRegistration: boolean;
  defaultHealth: FrameworkSecurityHealth;
  policyCount: number;
  publisherCount: number;
}

export interface SecurityRegistryProvider {
  listPublishers(): Promise<readonly SecurityPublisher[]>;
  getPublisher(id: string): Promise<SecurityPublisher | undefined>;
  listPolicies(): Promise<readonly SecurityPolicy[]>;
  listCategories(): Promise<readonly SecurityCategory[]>;
  getSnapshot(): Promise<{
    publisherCount: number;
    policyCount: number;
    eventCount: number;
    threatCount: number;
    asOf: string;
  }>;
}

export interface SecurityEventProvider {
  listEvents(): Promise<readonly SecurityEventContract[]>;
  getEvent(id: string): Promise<SecurityEventContract | undefined>;
}

export interface SecurityThreatProvider {
  listThreats(): Promise<readonly SecurityThreat[]>;
  getThreat(id: string): Promise<SecurityThreat | undefined>;
}

export interface SecuritySessionProvider {
  listSessions(): Promise<readonly SecuritySession[]>;
  getSession(id: string): Promise<SecuritySession | undefined>;
}

export interface SecurityPermissionProvider {
  listPermissions(): Promise<readonly SecurityPermission[]>;
}

export interface SecurityComplianceFrameworkProvider {
  getComplianceSnapshot(): Promise<SecurityComplianceSnapshot | undefined>;
}

export interface SecurityPolicyProvider {
  listPolicies(): Promise<readonly SecurityPolicy[]>;
  getPolicy(id: string): Promise<SecurityPolicy | undefined>;
}

export interface SecurityDomainProvider {
  listDomainSignals(): Promise<readonly SecurityDomainSignal[]>;
}

export interface SecurityConfigurationProvider {
  getConfiguration(): Promise<SecurityFrameworkConfiguration>;
}

export function createSecurityRegistryProvider(options?: {
  registry?: SecurityRegistry;
}): SecurityRegistryProvider {
  const registry = options?.registry ?? defaultSecurityRegistry;
  return {
    async listPublishers() {
      return registry.listPublishers();
    },
    async getPublisher(id) {
      return registry.getPublisher(id);
    },
    async listPolicies() {
      return registry.listPolicies();
    },
    async listCategories() {
      return listSecurityFrameworkCategories();
    },
    async getSnapshot() {
      return {
        publisherCount: registry.listPublishers().length,
        policyCount: registry.listPolicies().length,
        eventCount: registry.listEvents().length,
        threatCount: registry.listThreats().length,
        asOf: new Date().toISOString(),
      };
    },
  };
}

export function createSecurityEventProvider(options?: {
  registry?: SecurityRegistry;
}): SecurityEventProvider {
  const registry = options?.registry ?? defaultSecurityRegistry;
  return {
    async listEvents() {
      return registry.listEvents();
    },
    async getEvent(id) {
      return registry.listEvents().find((e) => e.id === id);
    },
  };
}

export function createSecurityThreatProvider(options?: {
  registry?: SecurityRegistry;
}): SecurityThreatProvider {
  const registry = options?.registry ?? defaultSecurityRegistry;
  return {
    async listThreats() {
      return registry.listThreats();
    },
    async getThreat(id) {
      return registry.listThreats().find((t) => t.id === id);
    },
  };
}

export function createSecuritySessionProvider(options?: {
  registry?: SecurityRegistry;
}): SecuritySessionProvider {
  const registry = options?.registry ?? defaultSecurityRegistry;
  return {
    async listSessions() {
      return registry.listSessions();
    },
    async getSession(id) {
      return registry.listSessions().find((s) => s.id === id);
    },
  };
}

export function createSecurityPermissionProvider(options?: {
  registry?: SecurityRegistry;
}): SecurityPermissionProvider {
  const registry = options?.registry ?? defaultSecurityRegistry;
  return {
    async listPermissions() {
      return registry.listPermissions();
    },
  };
}

export function createSecurityComplianceFrameworkProvider(options?: {
  registry?: SecurityRegistry;
}): SecurityComplianceFrameworkProvider {
  const registry = options?.registry ?? defaultSecurityRegistry;
  return {
    async getComplianceSnapshot() {
      return registry.getComplianceSnapshot();
    },
  };
}

export function createSecurityPolicyProvider(options?: {
  registry?: SecurityRegistry;
}): SecurityPolicyProvider {
  const registry = options?.registry ?? defaultSecurityRegistry;
  return {
    async listPolicies() {
      return registry.listPolicies().length
        ? registry.listPolicies()
        : listPlaceholderSecurityPolicies();
    },
    async getPolicy(id) {
      return registry.listPolicies().find((p) => p.id === id);
    },
  };
}

export function createSecurityDomainProvider(options?: {
  registry?: SecurityRegistry;
}): SecurityDomainProvider {
  const registry = options?.registry ?? defaultSecurityRegistry;
  return {
    async listDomainSignals() {
      return registry.listDomainSignals();
    },
  };
}

export function createSecurityConfigurationProvider(options?: {
  registry?: SecurityRegistry;
}): SecurityConfigurationProvider {
  const registry = options?.registry ?? defaultSecurityRegistry;
  return {
    async getConfiguration() {
      return {
        version: "0.1.0",
        allowRuntimePublisherRegistration: true,
        defaultHealth: "unknown",
        policyCount: registry.listPolicies().length,
        publisherCount: registry.listPublishers().length,
      };
    },
  };
}

export interface EnterpriseSecurityFramework {
  registry: SecurityRegistry;
  registryProvider: SecurityRegistryProvider;
  eventProvider: SecurityEventProvider;
  threatProvider: SecurityThreatProvider;
  sessionProvider: SecuritySessionProvider;
  permissionProvider: SecurityPermissionProvider;
  complianceProvider: SecurityComplianceFrameworkProvider;
  policyProvider: SecurityPolicyProvider;
  domainProvider: SecurityDomainProvider;
  configurationProvider: SecurityConfigurationProvider;
}

export function createEnterpriseSecurityFramework(options?: {
  registry?: SecurityRegistry;
}): EnterpriseSecurityFramework {
  const registry = options?.registry ?? createSecurityRegistry();
  return {
    registry,
    registryProvider: createSecurityRegistryProvider({ registry }),
    eventProvider: createSecurityEventProvider({ registry }),
    threatProvider: createSecurityThreatProvider({ registry }),
    sessionProvider: createSecuritySessionProvider({ registry }),
    permissionProvider: createSecurityPermissionProvider({ registry }),
    complianceProvider: createSecurityComplianceFrameworkProvider({ registry }),
    policyProvider: createSecurityPolicyProvider({ registry }),
    domainProvider: createSecurityDomainProvider({ registry }),
    configurationProvider: createSecurityConfigurationProvider({ registry }),
  };
}

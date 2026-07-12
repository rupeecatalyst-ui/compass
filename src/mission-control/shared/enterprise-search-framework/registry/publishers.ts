/**
 * Placeholder Search Publishers — module registration only.
 */

import type { SearchEntity, SearchPublisher, SearchRegistry } from "../contracts";
import { createSearchMetadata } from "../metadata";

export const PLACEHOLDER_SEARCH_PUBLISHERS: readonly SearchPublisher[] = [
  {
    id: "publisher-customer-360",
    displayName: "Customer 360",
    description: "Customer master and 360 profiles",
    status: "active",
    version: "0.1.0",
    module: "Customer 360",
    categoryIds: ["customers", "users"],
    capabilityTags: ["customers", "crm"],
    defaultScopeId: "scope-global",
    metadata: createSearchMetadata({ domain: "customer" }),
  },
  {
    id: "publisher-opportunity-lifecycle",
    displayName: "Opportunity Lifecycle",
    description: "Opportunity compass and lifecycle entities",
    status: "active",
    version: "0.1.0",
    module: "Opportunity Lifecycle",
    categoryIds: ["opportunities"],
    capabilityTags: ["opportunities", "pipeline"],
    defaultScopeId: "scope-global",
  },
  {
    id: "publisher-loan-workspace",
    displayName: "Loan Workspace",
    description: "Loan files and origination workspace",
    status: "active",
    version: "0.1.0",
    module: "Loan Workspace",
    categoryIds: ["loans"],
    capabilityTags: ["loans", "origination"],
    defaultScopeId: "scope-global",
  },
  {
    id: "publisher-partner-management",
    displayName: "Partner Management",
    description: "LIFE / partner network entities",
    status: "active",
    version: "0.1.0",
    module: "Partner Management",
    categoryIds: ["partners"],
    capabilityTags: ["partners", "life"],
    defaultScopeId: "scope-global",
  },
  {
    id: "publisher-document-intelligence",
    displayName: "Document Intelligence",
    description: "Document packs and intelligence artifacts",
    status: "active",
    version: "0.1.0",
    module: "Document Intelligence",
    categoryIds: ["documents"],
    capabilityTags: ["documents"],
    defaultScopeId: "scope-global",
  },
  {
    id: "publisher-product-intelligence",
    displayName: "Product Intelligence",
    description: "Product library and intelligence catalog",
    status: "active",
    version: "0.1.0",
    module: "Product Intelligence",
    categoryIds: ["products"],
    capabilityTags: ["products"],
    defaultScopeId: "scope-global",
  },
  {
    id: "publisher-mission-control",
    displayName: "Mission Control",
    description: "Mission Control surfaces and modules",
    status: "active",
    version: "0.1.0",
    module: "Mission Control",
    categoryIds: ["mission_control", "alerts"],
    capabilityTags: ["mission-control", "command"],
    defaultScopeId: "scope-mission-control",
  },
  {
    id: "publisher-horizon",
    displayName: "Horizon",
    description: "Strategic planning initiatives",
    status: "active",
    version: "0.1.0",
    module: "Horizon",
    categoryIds: ["horizon", "branches"],
    capabilityTags: ["horizon", "strategy"],
    defaultScopeId: "scope-horizon",
  },
  {
    id: "publisher-security",
    displayName: "Security",
    description: "Security operations searchable entities",
    status: "registered",
    version: "0.1.0",
    module: "Security",
    categoryIds: ["security", "alerts"],
    capabilityTags: ["security"],
    defaultScopeId: "scope-mission-control",
  },
  {
    id: "publisher-configuration",
    displayName: "Configuration",
    description: "Platform configuration surfaces",
    status: "active",
    version: "0.1.0",
    module: "Configuration",
    categoryIds: ["configuration"],
    capabilityTags: ["configuration", "admin"],
    defaultScopeId: "scope-global",
  },
  {
    id: "publisher-workflow-engine",
    displayName: "Workflow Engine",
    description: "Workflow definitions and stage libraries",
    status: "active",
    version: "0.1.0",
    module: "Workflow Engine",
    categoryIds: ["workflows"],
    capabilityTags: ["workflows"],
    defaultScopeId: "scope-global",
  },
];

function entity(
  partial: Omit<SearchEntity, "status" | "metadata" | "permissions" | "keywords"> & {
    keywords?: readonly string[];
    metadata?: SearchEntity["metadata"];
    permissions?: SearchEntity["permissions"];
    status?: SearchEntity["status"];
  },
): SearchEntity {
  return {
    status: partial.status ?? "published",
    keywords: partial.keywords ?? [],
    metadata: partial.metadata ?? createSearchMetadata(),
    permissions: partial.permissions ?? [
      {
        id: "search.view",
        resource: `search.${partial.entityType}`,
        action: "view",
      },
    ],
    ...partial,
  };
}

export function createPlaceholderSearchEntities(): SearchEntity[] {
  const now = Date.now();
  return [
    entity({
      id: "se-customer-west",
      entityType: "customer",
      title: "West Region Holdings",
      subtitle: "Customer · Active",
      description: "Placeholder Customer 360 entity for Search Framework.",
      module: "Customer 360",
      publisherId: "publisher-customer-360",
      categoryId: "customers",
      icon: "Users",
      route: "/customers",
      keywords: ["west", "customer", "holdings"],
      updatedAt: new Date(now - 2 * 3600000).toISOString(),
    }),
    entity({
      id: "se-opp-expansion",
      entityType: "opportunity",
      title: "West Expansion Opportunity",
      subtitle: "Opportunity · Qualified",
      description: "Placeholder Opportunity Lifecycle entity.",
      module: "Opportunity Lifecycle",
      publisherId: "publisher-opportunity-lifecycle",
      categoryId: "opportunities",
      icon: "Compass",
      route: "/opportunity-compass",
      keywords: ["opportunity", "expansion", "west"],
      updatedAt: new Date(now - 6 * 3600000).toISOString(),
    }),
    entity({
      id: "se-loan-4821",
      entityType: "loan_file",
      title: "Loan File LF-4821",
      subtitle: "Home Loan · Underwriting",
      description: "Placeholder Loan Workspace entity.",
      module: "Loan Workspace",
      publisherId: "publisher-loan-workspace",
      categoryId: "loans",
      icon: "FileText",
      route: "/loan-files",
      keywords: ["loan", "LF-4821", "underwriting"],
      updatedAt: new Date(now - 5 * 3600000).toISOString(),
    }),
    entity({
      id: "se-partner-life",
      entityType: "partner",
      title: "LIFE Partner Network",
      subtitle: "Partner · Enabled",
      description: "Placeholder Partner Management entity.",
      module: "Partner Management",
      publisherId: "publisher-partner-management",
      categoryId: "partners",
      icon: "Handshake",
      route: "/lenders",
      keywords: ["partner", "life", "network"],
      updatedAt: new Date(now - 86400000).toISOString(),
    }),
    entity({
      id: "se-doc-kyc",
      entityType: "document",
      title: "KYC Pack — Branch Opening",
      subtitle: "Document · Verified",
      description: "Placeholder Document Intelligence entity.",
      module: "Document Intelligence",
      publisherId: "publisher-document-intelligence",
      categoryId: "documents",
      icon: "FolderOpen",
      route: "/documents",
      keywords: ["kyc", "document", "branch"],
      updatedAt: new Date(now - 3 * 86400000).toISOString(),
    }),
    entity({
      id: "se-product-hl",
      entityType: "product",
      title: "Home Loan Classic",
      subtitle: "Product · Published",
      description: "Placeholder Product Intelligence entity.",
      module: "Product Intelligence",
      publisherId: "publisher-product-intelligence",
      categoryId: "products",
      icon: "Package",
      route: "/admin/product-library",
      keywords: ["product", "home loan"],
      updatedAt: new Date(now - 10 * 86400000).toISOString(),
    }),
    entity({
      id: "se-mc-situation",
      entityType: "mc_module",
      title: "Situation Room",
      subtitle: "Mission Control module",
      description: "Placeholder Mission Control surface entity.",
      module: "Mission Control",
      publisherId: "publisher-mission-control",
      categoryId: "mission_control",
      icon: "Radar",
      route: "/mission-control/situation-room",
      keywords: ["situation", "mission control"],
      updatedAt: new Date(now - 3600000).toISOString(),
    }),
    entity({
      id: "se-alert-sla",
      entityType: "alert",
      title: "SLA Breach · Underwriting Queue",
      subtitle: "Alert · High",
      description: "Placeholder Mission Control alert entity.",
      module: "Mission Control",
      publisherId: "publisher-mission-control",
      categoryId: "alerts",
      icon: "Bell",
      route: "/mission-control/alert-center",
      keywords: ["sla", "alert", "underwriting"],
      updatedAt: new Date(now - 40 * 60000).toISOString(),
    }),
    entity({
      id: "se-horizon-branch",
      entityType: "initiative",
      title: "West Region Branch Opening",
      subtitle: "Horizon · Initiative",
      description: "Placeholder Horizon initiative entity.",
      module: "Horizon",
      publisherId: "publisher-horizon",
      categoryId: "horizon",
      icon: "Orbit",
      route: "/horizon",
      keywords: ["horizon", "branch", "initiative"],
      updatedAt: new Date(now - 8 * 3600000).toISOString(),
    }),
    entity({
      id: "se-security-posture",
      entityType: "security_signal",
      title: "Security Posture Snapshot",
      subtitle: "Security · Placeholder",
      description: "Placeholder Security publisher entity.",
      module: "Security",
      publisherId: "publisher-security",
      categoryId: "security",
      icon: "Shield",
      route: "/mission-control/security-operations",
      keywords: ["security", "posture"],
      updatedAt: new Date(now - 2 * 86400000).toISOString(),
      status: "draft",
    }),
    entity({
      id: "se-config-modes",
      entityType: "configuration",
      title: "System Modes",
      subtitle: "Configuration",
      description: "Placeholder Configuration publisher entity.",
      module: "Configuration",
      publisherId: "publisher-configuration",
      categoryId: "configuration",
      icon: "SlidersHorizontal",
      route: "/admin/system-modes",
      keywords: ["configuration", "modes"],
      updatedAt: new Date(now - 15 * 86400000).toISOString(),
    }),
    entity({
      id: "se-wf-underwrite",
      entityType: "workflow",
      title: "Underwriting Stage Flow",
      subtitle: "Workflow · Active",
      description: "Placeholder Workflow Engine entity.",
      module: "Workflow Engine",
      publisherId: "publisher-workflow-engine",
      categoryId: "workflows",
      icon: "GitBranch",
      route: "/workflow",
      keywords: ["workflow", "underwriting"],
      updatedAt: new Date(now - 6 * 86400000).toISOString(),
    }),
  ];
}

export function createSearchPublisherRegistry(
  seed: readonly SearchPublisher[] = PLACEHOLDER_SEARCH_PUBLISHERS,
): {
  register(publisher: SearchPublisher): void;
  unregister(id: string): void;
  get(id: string): SearchPublisher | undefined;
  list(): readonly SearchPublisher[];
} {
  const store = new Map<string, SearchPublisher>(seed.map((p) => [p.id, p]));
  return {
    register(publisher) {
      store.set(publisher.id, publisher);
    },
    unregister(id) {
      store.delete(id);
    },
    get(id) {
      return store.get(id);
    },
    list() {
      return [...store.values()];
    },
  };
}

export const defaultSearchPublisherRegistry = createSearchPublisherRegistry();

export function listRegisteredSearchPublishers(): readonly SearchPublisher[] {
  return defaultSearchPublisherRegistry.list();
}

export function createSearchRegistry(options?: {
  publishers?: readonly SearchPublisher[];
  entities?: readonly SearchEntity[];
}): SearchRegistry {
  const publisherStore = new Map<string, SearchPublisher>(
    (options?.publishers ?? PLACEHOLDER_SEARCH_PUBLISHERS).map((p) => [p.id, p]),
  );
  const entityStore = new Map<string, SearchEntity>(
    (options?.entities ?? createPlaceholderSearchEntities()).map((e) => [e.id, e]),
  );

  return {
    registerPublisher(publisher) {
      publisherStore.set(publisher.id, publisher);
    },
    unregisterPublisher(id) {
      publisherStore.delete(id);
    },
    getPublisher(id) {
      return publisherStore.get(id);
    },
    listPublishers() {
      return [...publisherStore.values()];
    },
    registerEntity(entityItem) {
      entityStore.set(entityItem.id, entityItem);
    },
    unregisterEntity(id) {
      entityStore.delete(id);
    },
    getEntity(id) {
      return entityStore.get(id);
    },
    listEntities(filter) {
      let rows = [...entityStore.values()];
      if (filter?.publisherId) {
        rows = rows.filter((e) => e.publisherId === filter.publisherId);
      }
      if (filter?.categoryId) {
        rows = rows.filter((e) => e.categoryId === filter.categoryId);
      }
      if (filter?.module) {
        rows = rows.filter((e) => e.module === filter.module);
      }
      return rows;
    },
  };
}

export const defaultSearchRegistry = createSearchRegistry();

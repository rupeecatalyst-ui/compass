/**
 * EAF enterprise engine registry seed — foundation only, no engine logic.
 */

import { EAF_CAPABILITY_CODES } from "./capabilities";
import type { EafEngineRegistration } from "@/types/enterprise-asset-framework-engines";

export const EAF_ENGINE_CODES = {
  IDENTITY: "identity_engine",
  RELATIONSHIP: "relationship_engine",
  AUDIT: "audit_engine",
  CONFIGURATION: "configuration_engine",
  DOCUMENT: "document_engine",
  WORKFLOW: "workflow_engine",
  LIFECYCLE: "lifecycle_engine",
  VERSION: "version_engine",
  SEARCH: "search_engine",
  AI: "ai_engine",
} as const;

export type EafBuiltInEngineCode = (typeof EAF_ENGINE_CODES)[keyof typeof EAF_ENGINE_CODES];

export const EAF_DEFAULT_ENGINE_REGISTRATIONS: EafEngineRegistration[] = [
  {
    engineCode: EAF_ENGINE_CODES.IDENTITY,
    displayName: "Identity Engine",
    description: "Public identity assignment and resolution.",
    version: "0.0.0",
    providedCapabilities: [EAF_CAPABILITY_CODES.CONFIGURATION],
    enabled: true,
    sortOrder: 1,
  },
  {
    engineCode: EAF_ENGINE_CODES.RELATIONSHIP,
    displayName: "Relationship Engine",
    description: "Asset-to-asset relationship management.",
    version: "1.0.0",
    providedCapabilities: [EAF_CAPABILITY_CODES.RELATIONSHIPS],
    enabled: true,
    sortOrder: 2,
  },
  {
    engineCode: EAF_ENGINE_CODES.AUDIT,
    displayName: "Audit Engine",
    description: "Append-only enterprise audit trail.",
    version: "1.0.0",
    providedCapabilities: [EAF_CAPABILITY_CODES.AUDIT],
    enabled: true,
    sortOrder: 3,
  },
  {
    engineCode: EAF_ENGINE_CODES.CONFIGURATION,
    displayName: "Configuration Engine",
    description: "Runtime configuration provider.",
    version: "1.0.0",
    providedCapabilities: [EAF_CAPABILITY_CODES.CONFIGURATION, EAF_CAPABILITY_CODES.METADATA],
    enabled: true,
    sortOrder: 4,
  },
  {
    engineCode: EAF_ENGINE_CODES.DOCUMENT,
    displayName: "Document Engine",
    description: "Document asset management integration point.",
    version: "0.0.0",
    providedCapabilities: [EAF_CAPABILITY_CODES.METADATA],
    enabled: true,
    sortOrder: 5,
  },
  {
    engineCode: EAF_ENGINE_CODES.WORKFLOW,
    displayName: "Workflow Engine",
    description: "Enterprise workflow orchestration.",
    version: "1.0.0",
    providedCapabilities: [EAF_CAPABILITY_CODES.WORKFLOW],
    enabled: true,
    sortOrder: 6,
  },
  {
    engineCode: EAF_ENGINE_CODES.LIFECYCLE,
    displayName: "Lifecycle Engine",
    description: "Configuration-driven lifecycle transitions.",
    version: "1.0.0",
    providedCapabilities: [EAF_CAPABILITY_CODES.CONFIGURATION],
    enabled: true,
    sortOrder: 7,
  },
  {
    engineCode: EAF_ENGINE_CODES.VERSION,
    displayName: "Version Engine",
    description: "Semantic versioning utilities.",
    version: "1.0.0",
    providedCapabilities: [EAF_CAPABILITY_CODES.VERSIONING],
    enabled: true,
    sortOrder: 8,
  },
  {
    engineCode: EAF_ENGINE_CODES.SEARCH,
    displayName: "Search Engine",
    description: "Enterprise search indexing integration point.",
    version: "0.0.0",
    providedCapabilities: [EAF_CAPABILITY_CODES.SEARCH],
    enabled: true,
    sortOrder: 9,
  },
  {
    engineCode: EAF_ENGINE_CODES.AI,
    displayName: "AI Engine",
    description: "AI processing pipeline integration point.",
    version: "0.0.0",
    providedCapabilities: [EAF_CAPABILITY_CODES.AI],
    enabled: true,
    sortOrder: 10,
  },
];

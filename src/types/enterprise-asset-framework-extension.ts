/**
 * EAF domain extension contract — how future modules register with the framework.
 *
 * Domain modules (Customer, Loan, etc.) register OUTSIDE EAF using this contract.
 * EAF remains generic; extensions supply asset type codes and metadata schemas only.
 */

import type { EafAssetTypeCode, EafMetadataBag } from "@/types/enterprise-asset-framework";

export interface EafDomainExtensionRegistration {
  /** Unique extension identifier (e.g. "catalyst.customer-module"). */
  extensionId: string;

  /** Semantic version of the extension package. */
  extensionVersion: string;

  /** Asset type codes this extension owns — registered via EAF configuration. */
  assetTypeCodes: EafAssetTypeCode[];

  /**
   * Optional metadata schema reference — resolved by metadata engine in future sprints.
   * Keeps EAF free of domain field definitions.
   */
  metadataSchemaRef?: string;

  /** Declared capabilities — used for compliance and feature gating. */
  capabilities: EafDomainExtensionCapability[];

  enabled: boolean;
}

export type EafDomainExtensionCapability =
  | "lifecycle"
  | "relationships"
  | "versioning"
  | "audit"
  | "search"
  | "ai"
  | "permissions"
  | "dynamic_forms";

export interface EafDomainMetadataValidator<T extends EafMetadataBag = EafMetadataBag> {
  extensionId: string;
  validate(metadata: T): { valid: boolean; errors: string[] };
}

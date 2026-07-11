/**
 * EAF asset health status constants.
 */

import type { EafAssetHealthStatus } from "@/types/enterprise-asset-framework-definition";

export const EAF_ASSET_HEALTH_STATUS = {
  HEALTHY: "healthy",
  WARNING: "warning",
  DEPRECATED: "deprecated",
  EXPERIMENTAL: "experimental",
  INACTIVE: "inactive",
} as const;

export type EafBuiltInHealthStatus =
  (typeof EAF_ASSET_HEALTH_STATUS)[keyof typeof EAF_ASSET_HEALTH_STATUS];

export const EAF_ASSET_HEALTH_STATUS_LABELS: Record<EafAssetHealthStatus, string> = {
  healthy: "Healthy",
  warning: "Warning",
  deprecated: "Deprecated",
  experimental: "Experimental",
  inactive: "Inactive",
};

export const EAF_ASSET_HEALTH_STATUS_LIST: EafAssetHealthStatus[] = [
  EAF_ASSET_HEALTH_STATUS.HEALTHY,
  EAF_ASSET_HEALTH_STATUS.WARNING,
  EAF_ASSET_HEALTH_STATUS.DEPRECATED,
  EAF_ASSET_HEALTH_STATUS.EXPERIMENTAL,
  EAF_ASSET_HEALTH_STATUS.INACTIVE,
];

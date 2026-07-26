/**
 * CO-ARCH-001-I5a — Constants-backed Reference Master port (legacy SSOT).
 */
import type { ReferenceMasterDomainCode } from "@/constants/enterprise-master-data";
import { PROPERTY_TYPES } from "@/constants/loan-stage-master";
import {
  getEcmMasterLabel,
  getEcmMasterOption,
  listEcmMasterOptionsFromCatalog,
} from "@/constants/enterprise-contact-master/masters";
import {
  DEFAULT_OCCUPANCY_MASTER,
  OCCUPANCY_CATEGORIES,
} from "@/data/catalyst-one/occupancy-master-seed";
import type {
  ReferenceMasterPort,
  ReferenceMasterPortOption,
} from "@/types/reference-master-port";
import { referenceDomainToEcmDomain } from "../domain-map";

function toPortOption(
  option: {
    id: string;
    label: string;
    parentId?: string;
    meta?: Record<string, string>;
    enabled?: boolean;
    sortOrder?: number;
  },
): ReferenceMasterPortOption {
  return {
    id: option.id,
    label: option.label,
    parentId: option.parentId,
    meta: option.meta,
    enabled: option.enabled !== false,
    sortOrder: option.sortOrder,
    source: "constants",
  };
}

function listPropertyTypeOptions(): ReferenceMasterPortOption[] {
  return PROPERTY_TYPES.map((label, index) =>
    toPortOption({
      id: label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, ""),
      label,
      sortOrder: index + 1,
      enabled: true,
    }),
  );
}

function listOccupancyOptions(parentId?: string): ReferenceMasterPortOption[] {
  const categories = OCCUPANCY_CATEGORIES.filter((c) => c.enabled).map((category) =>
    toPortOption({
      id: category.id,
      label: category.label,
      sortOrder: category.sortOrder,
      enabled: true,
    }),
  );
  const entries = DEFAULT_OCCUPANCY_MASTER.filter((entry) => entry.enabled).map((entry) =>
    toPortOption({
      id: entry.id,
      label: entry.label,
      parentId: entry.categoryId,
      sortOrder: entry.sortOrder,
      enabled: true,
    }),
  );
  const all = [...categories, ...entries];
  if (!parentId) return all.filter((o) => !o.parentId);
  return all.filter((o) => o.parentId === parentId);
}

function listConstantsForDomain(
  domain: ReferenceMasterDomainCode,
  parentId?: string,
): ReferenceMasterPortOption[] {
  if (domain === "property_type") return listPropertyTypeOptions();
  if (domain === "occupancy") return listOccupancyOptions(parentId);
  const ecmDomain = referenceDomainToEcmDomain(domain);
  return listEcmMasterOptionsFromCatalog(ecmDomain, parentId).map(toPortOption);
}

export const constantsReferenceMasterPort: ReferenceMasterPort = {
  listOptions(domain, parentId) {
    return listConstantsForDomain(domain, parentId);
  },
  getLabel(domain, id) {
    if (!id) return "";
    if (domain === "property_type") {
      return listPropertyTypeOptions().find((o) => o.id === id)?.label ?? id;
    }
    if (domain === "occupancy") {
      return listOccupancyOptions().find((o) => o.id === id)?.label ?? id;
    }
    return getEcmMasterLabel(referenceDomainToEcmDomain(domain), id);
  },
  getOption(domain, id) {
    if (!id) return undefined;
    if (domain === "property_type" || domain === "occupancy") {
      return listConstantsForDomain(domain).find((o) => o.id === id);
    }
    const option = getEcmMasterOption(referenceDomainToEcmDomain(domain), id);
    return option ? toPortOption(option) : undefined;
  },
};

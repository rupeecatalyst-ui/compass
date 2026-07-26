/**
 * CO-ARCH-001-I5a — Reference Master client port contract.
 */
import type { ReferenceMasterDomainCode } from "@/constants/enterprise-master-data";

export type ReferenceMasterPortSource = "constants" | "database" | "merged";

export interface ReferenceMasterPortOption {
  id: string;
  label: string;
  parentId?: string;
  meta?: Record<string, string>;
  enabled?: boolean;
  sortOrder?: number;
  source: ReferenceMasterPortSource;
}

export interface ReferenceMasterPort {
  listOptions(
    domain: ReferenceMasterDomainCode,
    parentId?: string,
  ): ReferenceMasterPortOption[] | Promise<ReferenceMasterPortOption[]>;
  getLabel(domain: ReferenceMasterDomainCode, id?: string): string;
  getOption(
    domain: ReferenceMasterDomainCode,
    id?: string,
  ): ReferenceMasterPortOption | undefined;
}

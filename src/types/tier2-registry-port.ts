/**
 * CO-ARCH-001-I5b — Tier 2 Business Registry client port contract.
 */
import type {
  DocumentRegistryCategory,
  LenderInstitutionCategory,
  LenderProgramLifecycleStatus,
  ProductLifecycleStatus,
} from "@prisma/client";

export type Tier2RegistryPortSource = "constants" | "database" | "merged";

export interface Tier2RegistryPortOption {
  id: string;
  label: string;
  parentId?: string;
  meta?: Record<string, string>;
  enabled?: boolean;
  sortOrder?: number;
  source: Tier2RegistryPortSource;
}

export interface ProductRegistryPortOption extends Tier2RegistryPortOption {
  categoryId?: string;
  groupId?: string;
  lifecycleStatus?: ProductLifecycleStatus;
}

export interface DocumentRegistryPortOption extends Tier2RegistryPortOption {
  typeId?: string;
  category?: DocumentRegistryCategory;
}

export interface LenderRegistryPortOption extends Tier2RegistryPortOption {
  categoryId?: string;
  lenderId?: string;
  institutionCategory?: LenderInstitutionCategory;
  lifecycleStatus?: LenderProgramLifecycleStatus;
}

export interface ProductRegistryPort {
  listCategories(): ProductRegistryPortOption[];
  listGroups(categoryId?: string): ProductRegistryPortOption[];
  listProducts(groupId?: string): ProductRegistryPortOption[];
  getProductLabel(id?: string): string;
}

export interface DocumentRegistryPort {
  listTypes(): DocumentRegistryPortOption[];
  listDefinitions(typeId?: string): DocumentRegistryPortOption[];
  getDefinitionLabel(id?: string): string;
}

export interface LenderRegistryPort {
  listCategories(): LenderRegistryPortOption[];
  listLenders(categoryId?: string): LenderRegistryPortOption[];
  listPrograms(lenderId?: string): LenderRegistryPortOption[];
  getLenderLabel(id?: string): string;
}

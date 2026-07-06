/**
 * CRC-10.3 — Default occupancy master (Admin Console will manage overrides at runtime).
 * Decision Engine will consume Property Type + Occupancy — no rules in this sprint.
 */

export type OccupancyCategoryId = "residential" | "commercial" | "industrial" | "other";

export interface OccupancyCategoryMaster {
  id: OccupancyCategoryId;
  label: string;
  sortOrder: number;
  enabled: boolean;
}

export interface OccupancyMasterEntry {
  id: string;
  label: string;
  categoryId: OccupancyCategoryId;
  enabled: boolean;
  /**
   * When empty, available for all secured property-qualification products.
   * Admin Console can restrict per product (e.g. Home Loan only).
   */
  applicableProducts: string[];
  sortOrder: number;
}

export const OCCUPANCY_CATEGORIES: OccupancyCategoryMaster[] = [
  { id: "residential", label: "Residential", sortOrder: 1, enabled: true },
  { id: "commercial", label: "Commercial", sortOrder: 2, enabled: true },
  { id: "industrial", label: "Industrial", sortOrder: 3, enabled: true },
  { id: "other", label: "Others", sortOrder: 4, enabled: true },
];

export const DEFAULT_OCCUPANCY_MASTER: OccupancyMasterEntry[] = [
  {
    id: "occ_res_self_occupied",
    label: "Self Occupied",
    categoryId: "residential",
    enabled: true,
    applicableProducts: [],
    sortOrder: 1,
  },
  {
    id: "occ_res_rented",
    label: "Rented / Let Out",
    categoryId: "residential",
    enabled: true,
    applicableProducts: [],
    sortOrder: 2,
  },
  {
    id: "occ_res_vacant",
    label: "Vacant",
    categoryId: "residential",
    enabled: true,
    applicableProducts: [],
    sortOrder: 3,
  },
  {
    id: "occ_res_under_construction",
    label: "Under Construction",
    categoryId: "residential",
    enabled: true,
    applicableProducts: [],
    sortOrder: 4,
  },
  {
    id: "occ_res_ready_possession",
    label: "Ready Possession",
    categoryId: "residential",
    enabled: true,
    applicableProducts: [],
    sortOrder: 5,
  },
  {
    id: "occ_res_builder_inventory",
    label: "Builder Inventory",
    categoryId: "residential",
    enabled: true,
    applicableProducts: [],
    sortOrder: 6,
  },
  {
    id: "occ_com_self_occupied",
    label: "Self Occupied",
    categoryId: "commercial",
    enabled: true,
    applicableProducts: [],
    sortOrder: 1,
  },
  {
    id: "occ_com_leased",
    label: "Leased",
    categoryId: "commercial",
    enabled: true,
    applicableProducts: [],
    sortOrder: 2,
  },
  {
    id: "occ_com_vacant",
    label: "Vacant",
    categoryId: "commercial",
    enabled: true,
    applicableProducts: [],
    sortOrder: 3,
  },
  {
    id: "occ_ind_self_occupied",
    label: "Self Occupied",
    categoryId: "industrial",
    enabled: true,
    applicableProducts: [],
    sortOrder: 1,
  },
  {
    id: "occ_ind_leased",
    label: "Leased",
    categoryId: "industrial",
    enabled: true,
    applicableProducts: [],
    sortOrder: 2,
  },
  {
    id: "occ_ind_vacant",
    label: "Vacant",
    categoryId: "industrial",
    enabled: true,
    applicableProducts: [],
    sortOrder: 3,
  },
  {
    id: "occ_other_mixed",
    label: "Mixed Occupancy",
    categoryId: "other",
    enabled: true,
    applicableProducts: [],
    sortOrder: 1,
  },
  {
    id: "occ_other_other",
    label: "Other",
    categoryId: "other",
    enabled: true,
    applicableProducts: [],
    sortOrder: 2,
  },
];

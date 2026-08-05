/**
 * CO-LW-001 — Lending Programs Workspace types (orchestration projection — not a registry).
 */

import type {
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
} from "@/types/enterprise-lender-registry";
import type { ProductMasterOption } from "@/lib/enterprise-product-master/options";

export type LendingProgramsView = "lender" | "product";

/** Reference-only snapshot — masters / indexes. Never ops data. */
export type LendingProgramsSnapshot = {
  generatedAt: string;
  source: "client_compose";
  lenders: EnterpriseLenderRecord[];
  products: ProductMasterOption[];
  publishedPrograms: EnterpriseLenderProgramRecord[];
  /** productCode → lenderIds with capability or published program */
  capabilityByProduct: Record<string, string[]>;
  /** lenderId → product codes */
  capabilityByLender: Record<string, string[]>;
  regions: string[];
};

export type LendingProgramsLivePipeline = {
  dealCount: number;
  opportunityHints: number;
  disbursedCount: number;
  activeDealStages: Array<{ stage: string; count: number }>;
  recentDealLabels: Array<{
    id: string;
    label: string;
    stage: string;
    updatedAt: string;
  }>;
};

export type LendingProgramsTeamMember = {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  designation?: string;
  source: "ecm_banker" | "lender_contact";
};

export const LENDING_PROGRAMS_NOT_SPECIFIED = "Not Specified" as const;

export type BusinessFitKey =
  | "salaried"
  | "self_employed"
  | "balance_transfer"
  | "top_up"
  | "ready_property"
  | "under_construction"
  | "msme"
  | "working_capital";

export type BusinessFitCell = {
  key: BusinessFitKey;
  label: string;
  /** true only when program/lender data explicitly supports; else null = Not Specified */
  supported: boolean | null;
};

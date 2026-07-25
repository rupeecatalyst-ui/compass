/**
 * Chanakya Radar operational data source — Deal Registry SSOT.
 *
 * Radar visualises active Deals (not Opportunities).
 * Each Deal is an independent entity; multi-Deal customers appear as multiple rows
 * (no visual grouping yet — identity fields prepare for a future Product decision).
 */
import {
  loadDeals,
  loadDealsSync,
  subscribeDealsUpdated,
  type DealDataSource,
  type DealReadResult,
} from "@/lib/enterprise-deal/deal-data-access";
import type { LoanFile } from "@/types/catalyst-one";

export const CHANAKYA_RADAR_DEAL_CONSUMER = "chanakya_radar" as const;

/** Active operational deals for Radar (Deal Registry via DAL). */
export function listActiveRadarDealFiles(files: LoanFile[]): LoanFile[] {
  return files.filter((f) => !f.archived && f.stage !== "won");
}

export function loadRadarDealFilesSync(): DealReadResult {
  const result = loadDealsSync(CHANAKYA_RADAR_DEAL_CONSUMER);
  return {
    ...result,
    files: listActiveRadarDealFiles(result.files),
  };
}

export async function hydrateRadarDealFiles(): Promise<DealReadResult> {
  const result = await loadDeals(CHANAKYA_RADAR_DEAL_CONSUMER);
  return {
    ...result,
    files: listActiveRadarDealFiles(result.files),
  };
}

export function subscribeRadarDealSource(listener: () => void): () => void {
  return subscribeDealsUpdated(listener);
}

export type { DealDataSource };

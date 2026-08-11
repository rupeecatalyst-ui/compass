/**
 * CO-WP-PERF-002 — Short TTL reuse of Partner Business Pipeline projection.
 * Catalyst One remains SSOT; cache is a compute reuse only (stale-while-navigate).
 */
import type { PartnerBusinessPipelineDto } from "@/types/enterprise-partner-business";

const PIPELINE_TTL_MS = 30_000;

type Entry = {
  at: number;
  dto: PartnerBusinessPipelineDto;
};

const byPartnerId = new Map<string, Entry>();

export function readPartnerPipelineCache(
  partnerId: string,
): PartnerBusinessPipelineDto | null {
  const hit = byPartnerId.get(partnerId);
  if (!hit) return null;
  if (Date.now() - hit.at > PIPELINE_TTL_MS) {
    byPartnerId.delete(partnerId);
    return null;
  }
  return hit.dto;
}

export function writePartnerPipelineCache(
  partnerId: string,
  dto: PartnerBusinessPipelineDto,
): void {
  byPartnerId.set(partnerId, { at: Date.now(), dto });
}

export function invalidatePartnerPipelineCache(partnerId: string): void {
  byPartnerId.delete(partnerId);
}

export const PARTNER_PIPELINE_CACHE_TTL_MS = PIPELINE_TTL_MS;

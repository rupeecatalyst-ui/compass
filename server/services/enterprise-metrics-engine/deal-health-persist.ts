/**
 * Deal Health proxy persist policy (CO-C1-EME-DEAL-HEALTH-TIMESTAMP-001).
 *
 * Nightly / force / dry-run snapshots must not write health fields onto
 * EnterpriseDeal — Prisma @updatedAt would treat that as a business update.
 * Event refresh that explicitly requests deal.health may still stamp the
 * reserved Deal health columns (adjacent to a real Deal mutation).
 */
import type { EmeRunType } from "@/types/enterprise-metrics-engine";

export function shouldComputeDealHealthProxy(
  runType: EmeRunType,
  keysWanted: { has(key: string): boolean },
): boolean {
  return keysWanted.has("deal.health") || runType !== "event_refresh";
}

export function shouldPersistDealHealthOnDealRow(
  runType: EmeRunType,
  keysWanted: { has(key: string): boolean },
): boolean {
  return runType === "event_refresh" && keysWanted.has("deal.health");
}

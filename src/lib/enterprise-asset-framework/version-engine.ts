/**
 * EAF version framework — semantic versioning utilities.
 */

import type { EafAssetVersionRecord, EafInternalId } from "@/types/enterprise-asset-framework";

export type EafSemanticVersion = {
  major: number;
  minor: number;
  patch: number;
};

export function formatEafVersion(major: number, minor: number, patch: number): string {
  return `${major}.${minor}.${patch}`;
}

export function parseEafVersion(version: string): EafSemanticVersion {
  const parts = version.split(".").map((p) => Number.parseInt(p, 10));
  return {
    major: Number.isFinite(parts[0]) ? parts[0] : 1,
    minor: Number.isFinite(parts[1]) ? parts[1] : 0,
    patch: Number.isFinite(parts[2]) ? parts[2] : 0,
  };
}

export function compareEafVersions(a: string, b: string): number {
  const va = parseEafVersion(a);
  const vb = parseEafVersion(b);
  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

export function createEafVersionRecord(input: {
  assetId: EafInternalId;
  version: string;
  changeSummary: string;
  snapshotRef: string;
  createdBy: string;
  isCurrent?: boolean;
}): EafAssetVersionRecord {
  const parsed = parseEafVersion(input.version);
  return {
    id: crypto.randomUUID(),
    assetId: input.assetId,
    version: input.version,
    majorVersion: parsed.major,
    minorVersion: parsed.minor,
    patchVersion: parsed.patch,
    changeSummary: input.changeSummary,
    snapshotRef: input.snapshotRef,
    createdBy: input.createdBy,
    createdOn: new Date().toISOString(),
    isCurrent: input.isCurrent ?? true,
  };
}

export function getCurrentEafVersionRecord(
  records: EafAssetVersionRecord[],
  assetId: EafInternalId,
): EafAssetVersionRecord | undefined {
  return records.find((r) => r.assetId === assetId && r.isCurrent);
}

export function markEafVersionAsCurrent(
  records: EafAssetVersionRecord[],
  versionRecordId: string,
): EafAssetVersionRecord[] {
  const target = records.find((r) => r.id === versionRecordId);
  if (!target) return records;
  return records.map((r) =>
    r.assetId === target.assetId
      ? { ...r, isCurrent: r.id === versionRecordId }
      : r,
  );
}

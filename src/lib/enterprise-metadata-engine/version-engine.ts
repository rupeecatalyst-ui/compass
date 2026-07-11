/**
 * EME metadata versioning utilities.
 */

import type { EmeMetadataVersionRecord } from "@/types/enterprise-metadata-engine";

export type EmeSemanticVersion = {
  major: number;
  minor: number;
  patch: number;
};

export function formatEmeVersion(major: number, minor: number, patch: number): string {
  return `${major}.${minor}.${patch}`;
}

export function parseEmeVersion(version: string): EmeSemanticVersion {
  const parts = version.split(".").map((p) => Number.parseInt(p, 10));
  return {
    major: Number.isFinite(parts[0]) ? parts[0] : 1,
    minor: Number.isFinite(parts[1]) ? parts[1] : 0,
    patch: Number.isFinite(parts[2]) ? parts[2] : 0,
  };
}

export function createEmeMetadataVersionRecord(input: {
  metadataDefinitionId: string;
  schemaCode: string;
  version: string;
  changeSummary: string;
  snapshotRef: string;
  createdBy: string;
  isCurrent?: boolean;
}): EmeMetadataVersionRecord {
  const parsed = parseEmeVersion(input.version);
  return {
    id: crypto.randomUUID(),
    metadataDefinitionId: input.metadataDefinitionId,
    schemaCode: input.schemaCode,
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

export function getCurrentEmeMetadataVersion(
  records: EmeMetadataVersionRecord[],
  metadataDefinitionId: string,
): EmeMetadataVersionRecord | undefined {
  return records.find((r) => r.metadataDefinitionId === metadataDefinitionId && r.isCurrent);
}

export function bumpEmeMetadataVersion(
  currentVersion: string,
  bump: "major" | "minor" | "patch",
): string {
  const parsed = parseEmeVersion(currentVersion);
  const next =
    bump === "major"
      ? { major: parsed.major + 1, minor: 0, patch: 0 }
      : bump === "minor"
        ? { major: parsed.major, minor: parsed.minor + 1, patch: 0 }
        : { major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1 };
  return formatEmeVersion(next.major, next.minor, next.patch);
}

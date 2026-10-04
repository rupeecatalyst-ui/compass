/**
 * Certifies the committed Foundation V1 migration and rejects meaningful
 * working-tree edits. Checkout CRLF versus LF is not a content change.
 * The migration file itself is never written.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const FOUNDATION_V1_MIGRATION_RELATIVE_PATH =
  "prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql";

export const FOUNDATION_V1_MIGRATION_CERTIFIED_BYTES = 3660;

export const FOUNDATION_V1_MIGRATION_CERTIFIED_SHA256 =
  "1B05A9EAE8A0AD7A0227BF2847D51A2E39DEA1F96AACCE1C11CD2F6CBB8B3E5D";

const CR = 0x0d;
const LF = 0x0a;

export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

/** Translate CRLF pairs to LF. A lone CR is treated as content, not checkout. */
export function normalizeCheckoutNewlines(bytes: Buffer): Buffer | null {
  const parts: Buffer[] = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== CR) continue;
    if (index + 1 < bytes.length && bytes[index + 1] === LF) {
      parts.push(bytes.subarray(start, index), Buffer.from([LF]));
      index += 1;
      start = index + 1;
      continue;
    }
    return null;
  }
  parts.push(bytes.subarray(start));
  return Buffer.concat(parts);
}

export type FoundationV1MigrationAssessment = {
  unchanged: boolean;
  committedCertified: boolean;
  worktreeMeaningfulMatch: boolean;
};

export function assessFoundationV1Migration(input: {
  committedBlob: Buffer | null;
  worktreeBytes: Buffer | null;
}): FoundationV1MigrationAssessment {
  const committed = input.committedBlob;
  const committedCertified =
    committed != null &&
    committed.length === FOUNDATION_V1_MIGRATION_CERTIFIED_BYTES &&
    sha256Hex(committed) === FOUNDATION_V1_MIGRATION_CERTIFIED_SHA256;
  if (!committedCertified || committed == null || input.worktreeBytes == null) {
    return { unchanged: false, committedCertified, worktreeMeaningfulMatch: false };
  }
  const normalized = normalizeCheckoutNewlines(input.worktreeBytes);
  const worktreeMeaningfulMatch = normalized != null && normalized.equals(committed);
  return {
    unchanged: worktreeMeaningfulMatch,
    committedCertified,
    worktreeMeaningfulMatch,
  };
}

function readCommittedBlob(repoRoot: string): Buffer | null {
  const result = spawnSync("git", ["cat-file", "blob", `HEAD:${FOUNDATION_V1_MIGRATION_RELATIVE_PATH}`], {
    cwd: repoRoot,
    encoding: "buffer",
    windowsHide: true,
  });
  if (result.status !== 0 || !Buffer.isBuffer(result.stdout) || result.stdout.length === 0) return null;
  return result.stdout;
}

function toCrlf(bytes: Buffer): Buffer {
  const parts: Buffer[] = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== LF) continue;
    parts.push(bytes.subarray(start, index), Buffer.from([CR, LF]));
    start = index + 1;
  }
  parts.push(bytes.subarray(start));
  return Buffer.concat(parts);
}

function mutateContent(bytes: Buffer): Buffer {
  const copy = Buffer.from(bytes);
  const index = copy.findIndex((byte) => byte !== CR && byte !== LF);
  if (index < 0) return Buffer.from("mutated foundation migration\n");
  copy[index] = copy[index] ^ 0x01;
  return copy;
}

export type FoundationV1ImmutabilityProof = {
  unchanged: boolean;
  crlfCheckoutPasses: boolean;
  sqlMutationFails: boolean;
  deletionFails: boolean;
  replacementFails: boolean;
  blobMismatchFails: boolean;
};

export function proveFoundationV1MigrationImmutable(repoRoot: string): FoundationV1ImmutabilityProof {
  const committed = readCommittedBlob(repoRoot);
  const worktreePath = join(repoRoot, FOUNDATION_V1_MIGRATION_RELATIVE_PATH);
  const worktree = existsSync(worktreePath) ? readFileSync(worktreePath) : null;
  if (committed == null) {
    return {
      unchanged: false,
      crlfCheckoutPasses: false,
      sqlMutationFails: false,
      deletionFails: assessFoundationV1Migration({ committedBlob: null, worktreeBytes: null }).unchanged === false,
      replacementFails: false,
      blobMismatchFails: false,
    };
  }
  const live = assessFoundationV1Migration({ committedBlob: committed, worktreeBytes: worktree });
  const crlfOfCertified = toCrlf(committed);
  const crlfCheckoutPasses =
    live.unchanged &&
    !crlfOfCertified.equals(committed) &&
    assessFoundationV1Migration({ committedBlob: committed, worktreeBytes: crlfOfCertified }).unchanged;
  const mutated = mutateContent(committed);
  const sqlMutationFails =
    assessFoundationV1Migration({ committedBlob: committed, worktreeBytes: mutated }).unchanged === false &&
    assessFoundationV1Migration({ committedBlob: committed, worktreeBytes: toCrlf(mutated) }).unchanged === false;
  const deletionFails =
    assessFoundationV1Migration({ committedBlob: committed, worktreeBytes: null }).unchanged === false;
  const replacementFails =
    assessFoundationV1Migration({
      committedBlob: committed,
      worktreeBytes: Buffer.from("SELECT 1;\n"),
    }).unchanged === false;
  const mismatched = Buffer.from(committed);
  mismatched[mismatched.length - 1] ^= 0x01;
  const blobMismatchFails =
    assessFoundationV1Migration({ committedBlob: mismatched, worktreeBytes: committed }).unchanged === false &&
    assessFoundationV1Migration({ committedBlob: mismatched, worktreeBytes: committed }).committedCertified === false;
  return {
    unchanged: live.unchanged,
    crlfCheckoutPasses,
    sqlMutationFails,
    deletionFails,
    replacementFails,
    blobMismatchFails,
  };
}

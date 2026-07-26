/**
 * CO-ARCH-004 — Duplicate lender detection + safe merge.
 * Survivor keeps immutable LND code; duplicates soft-deleted after FK remaps.
 */
import {
  mergeAliasLists,
  normalizeLenderDuplicateKey,
  normalizeLenderNameKey,
} from "@/lib/enterprise-lender-registry/normalize";
import type {
  EnterpriseLenderContactRecord,
  EnterpriseLenderDocumentRecord,
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
} from "@/types/enterprise-lender-registry";

export interface LenderDuplicateCluster {
  key: string;
  lenderIds: string[];
  labels: string[];
  survivorId: string;
}

export interface LenderMergeAction {
  survivorId: string;
  survivorCode: string;
  survivorLabel: string;
  mergedIds: string[];
  mergedLabels: string[];
  programsMoved: number;
  contactsMoved: number;
  documentsMoved: number;
}

export interface LenderMergeReport {
  generatedAt: string;
  clustersDetected: number;
  mergesApplied: number;
  actions: LenderMergeAction[];
  unresolvedClusters: LenderDuplicateCluster[];
}

function pickSurvivor(lenders: EnterpriseLenderRecord[]): EnterpriseLenderRecord {
  const withLnd = lenders.filter((l) => /^LND\d{6}$/i.test(l.code));
  const pool = withLnd.length ? withLnd : lenders;
  return [...pool].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    return a.createdAt.localeCompare(b.createdAt);
  })[0];
}

export function detectLenderDuplicateClusters(
  lenders: EnterpriseLenderRecord[],
): LenderDuplicateCluster[] {
  const active = lenders.filter((l) => !l.isDeleted);
  const buckets = new Map<string, EnterpriseLenderRecord[]>();

  for (const lender of active) {
    const names = [
      lender.legalName,
      lender.displayName,
      lender.label,
      lender.shortName,
      ...(lender.aliases ?? []),
    ].filter(Boolean) as string[];
    const keys = new Set(names.map((n) => normalizeLenderDuplicateKey(n)).filter(Boolean));
    // Prefer legal/display for bucket primary key
    const primary =
      normalizeLenderDuplicateKey(lender.legalName || lender.displayName || lender.label) ||
      [...keys][0];
    if (!primary) continue;
    const list = buckets.get(primary) ?? [];
    list.push(lender);
    buckets.set(primary, list);
  }

  // Also merge buckets that share an alias key
  const byId = new Map(active.map((l) => [l.id, l]));
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const p = parent.get(id) ?? id;
    if (p !== id) {
      const root = find(p);
      parent.set(id, root);
      return root;
    }
    return p;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  for (const lender of active) {
    parent.set(lender.id, lender.id);
  }
  for (const [, group] of buckets) {
    for (let i = 1; i < group.length; i++) union(group[0].id, group[i].id);
  }
  // Cross-link via shared alias keys
  const keyOwners = new Map<string, string>();
  for (const lender of active) {
    const names = [
      lender.legalName,
      lender.displayName,
      lender.label,
      lender.shortName,
      ...(lender.aliases ?? []),
    ].filter(Boolean) as string[];
    for (const name of names) {
      const key = normalizeLenderDuplicateKey(name);
      if (!key) continue;
      const owner = keyOwners.get(key);
      if (owner) union(owner, lender.id);
      else keyOwners.set(key, lender.id);
    }
  }

  const clusters = new Map<string, EnterpriseLenderRecord[]>();
  for (const lender of active) {
    const root = find(lender.id);
    const list = clusters.get(root) ?? [];
    list.push(lender);
    clusters.set(root, list);
  }

  const out: LenderDuplicateCluster[] = [];
  for (const [, group] of clusters) {
    if (group.length < 2) continue;
    const survivor = pickSurvivor(group);
    out.push({
      key: normalizeLenderNameKey(survivor.legalName || survivor.label),
      lenderIds: group.map((g) => g.id),
      labels: group.map((g) => g.displayName || g.label),
      survivorId: survivor.id,
    });
  }
  return out;
}

export interface MergeBagMutable {
  lenders: EnterpriseLenderRecord[];
  programs: EnterpriseLenderProgramRecord[];
  contacts: EnterpriseLenderContactRecord[];
  documents: EnterpriseLenderDocumentRecord[];
}

/**
 * Apply merges into an in-memory bag. Does not delete until remaps succeed.
 * Soft-deletes duplicates with deletionReason documenting survivor code.
 */
export function applyLenderDuplicateMerges(
  bag: MergeBagMutable,
  actor: string,
  clusters?: LenderDuplicateCluster[],
): LenderMergeReport {
  const detected = clusters ?? detectLenderDuplicateClusters(bag.lenders);
  const at = new Date().toISOString();
  const actions: LenderMergeAction[] = [];

  for (const cluster of detected) {
    const survivor = bag.lenders.find((l) => l.id === cluster.survivorId && !l.isDeleted);
    if (!survivor) continue;
    const dupes = bag.lenders.filter(
      (l) => cluster.lenderIds.includes(l.id) && l.id !== survivor.id && !l.isDeleted,
    );
    if (!dupes.length) continue;

    let programsMoved = 0;
    let contactsMoved = 0;
    let documentsMoved = 0;

    for (const dupe of dupes) {
      for (const program of bag.programs) {
        if (program.lenderId === dupe.id && !program.isDeleted) {
          program.lenderId = survivor.id;
          program.modifiedBy = actor;
          program.updatedAt = at;
          programsMoved += 1;
        }
      }
      for (const contact of bag.contacts) {
        if (contact.lenderId === dupe.id && !contact.isDeleted) {
          contact.lenderId = survivor.id;
          contact.modifiedBy = actor;
          contact.updatedAt = at;
          contactsMoved += 1;
        }
      }
      for (const doc of bag.documents) {
        if (doc.lenderId === dupe.id && !doc.isDeleted) {
          doc.lenderId = survivor.id;
          doc.modifiedBy = actor;
          doc.updatedAt = at;
          documentsMoved += 1;
        }
      }

      survivor.aliases = mergeAliasLists(
        survivor.aliases,
        dupe.aliases,
        [dupe.label, dupe.displayName ?? "", dupe.shortName ?? "", dupe.legalName ?? ""],
      );
      survivor.legalName = survivor.legalName || dupe.legalName;
      survivor.displayName = survivor.displayName || dupe.displayName;
      survivor.shortName = survivor.shortName || dupe.shortName;
      survivor.website = survivor.website || dupe.website;
      survivor.headquartersLabel = survivor.headquartersLabel || dupe.headquartersLabel;
      survivor.customerCarePhone = survivor.customerCarePhone || dupe.customerCarePhone;
      survivor.customerCareEmail = survivor.customerCareEmail || dupe.customerCareEmail;
      survivor.classification = survivor.classification || dupe.classification;
      survivor.productsSupported = Array.from(
        new Set([...(survivor.productsSupported ?? []), ...(dupe.productsSupported ?? [])]),
      );
      survivor.modifiedBy = actor;
      survivor.updatedAt = at;
      survivor.versionNumber += 1;

      dupe.isDeleted = true;
      dupe.deletedAt = at;
      dupe.deletedBy = actor;
      dupe.deletionReason = `CO-ARCH-004 duplicate merge into ${survivor.code}`;
      dupe.enabled = false;
      dupe.status = "archived";
      dupe.lifecycleStatus = "retired";
      dupe.modifiedBy = actor;
      dupe.updatedAt = at;
    }

    actions.push({
      survivorId: survivor.id,
      survivorCode: survivor.code,
      survivorLabel: survivor.displayName || survivor.label,
      mergedIds: dupes.map((d) => d.id),
      mergedLabels: dupes.map((d) => d.displayName || d.label),
      programsMoved,
      contactsMoved,
      documentsMoved,
    });
  }

  return {
    generatedAt: at,
    clustersDetected: detected.length,
    mergesApplied: actions.length,
    actions,
    unresolvedClusters: detectLenderDuplicateClusters(bag.lenders),
  };
}

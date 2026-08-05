/**
 * CO-DOC-005 — Sync / hydrate Document Package Registry ↔ durable Postgres.
 * Best-effort: when migration is not applied, APIs fail softly and local cache remains.
 */
import { authenticatedJsonFetch, getAccessToken } from "@/lib/api-client";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type {
  DocumentPackageRecord,
  DurableDocumentPackageDto,
} from "@/types/document-package";
import {
  mergeDurablePackagesIntoLocalCache,
  reconstructPackagesFromRegistryRecords,
} from "./store";
import { getAllDocumentRegistryRecords } from "@/lib/document-registry/store";

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

export async function syncDocumentPackageToServer(
  pkg: DocumentPackageRecord,
): Promise<DurableDocumentPackageDto | null> {
  if (typeof window === "undefined") return null;
  if (!isEnterprisePersistencePrisma()) return null;
  if (!getAccessToken()) return null;
  const opportunityId = pkg.links.opportunityId?.trim();
  if (!opportunityId) return null;

  try {
    const res = await authenticatedJsonFetch("/api/enterprise-document-packages", {
      method: "POST",
      body: JSON.stringify({
        clientPackageId: pkg.clientPackageId || pkg.id,
        opportunityId,
        loanFileId: pkg.links.loanFileId ?? null,
        folderName: pkg.folderName,
        status: pkg.status,
        storageStatus: pkg.storageStatus,
        fileCount: pkg.fileCount,
        totalSizeBytes: pkg.totalSizeBytes,
        uploadedBy: pkg.uploadedBy,
        createdBy: pkg.createdBy,
        version: pkg.version,
        participantId: pkg.links.participantId ?? null,
        documentScope: pkg.links.documentScope ?? "applicant",
        contactId: pkg.links.contactId ?? null,
        customerId: pkg.links.customerId ?? null,
        parentEntityType: pkg.links.parentEntityType ?? "opportunity",
        parentEntityId:
          pkg.links.parentEntityId ?? opportunityId,
        documentIds: pkg.documentIds,
        relativePaths: pkg.relativePaths,
      }),
    });
    const body = (await res.json()) as Envelope<{ item: DurableDocumentPackageDto }>;
    if (!body.success || !body.data?.item) return null;
    mergeDurablePackagesIntoLocalCache([body.data.item]);
    return body.data.item;
  } catch {
    return null;
  }
}

export async function hydrateDocumentPackagesFromServer(input: {
  opportunityId: string;
}): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (!isEnterprisePersistencePrisma()) return 0;
  if (!getAccessToken()) return 0;
  const opportunityId = input.opportunityId.trim();
  if (!opportunityId) return 0;

  let fromServer = 0;
  try {
    const res = await authenticatedJsonFetch(
      `/api/enterprise-document-packages?opportunityId=${encodeURIComponent(opportunityId)}`,
    );
    const body = (await res.json()) as Envelope<{ items: DurableDocumentPackageDto[] }>;
    if (body.success && Array.isArray(body.data?.items)) {
      fromServer = mergeDurablePackagesIntoLocalCache(body.data.items);
    }
  } catch {
    /* table may not exist until migration approved */
  }

  // Always attempt reconstruct from local registry stamps (legacy / pre-migration).
  const reconstructed = reconstructPackagesFromRegistryRecords(
    getAllDocumentRegistryRecords().filter(
      (r) =>
        r.links.opportunityId === opportunityId ||
        !r.links.opportunityId,
    ),
  );

  return fromServer + reconstructed;
}

export async function searchDocumentPackages(query: string): Promise<
  Array<{
    id: string;
    folderName: string;
    opportunityId?: string;
    uploadedBy: string;
    matchHint?: string;
  }>
> {
  const q = query.trim();
  if (!q || typeof window === "undefined") return [];

  const localSearch = () => {
    try {
      const raw = localStorage.getItem("catalyst.document-packages.v2");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { packages: DocumentPackageRecord[] };
      const needle = q.toLowerCase();
      const docs = getAllDocumentRegistryRecords();
      const fileHits = new Map<string, string>();
      for (const r of docs) {
        if (r.status === "deleted") continue;
        const pid = r.links.packageId?.trim();
        if (!pid) continue;
        const hay = `${r.displayName} ${r.originalFilename}`.toLowerCase();
        if (hay.includes(needle) && !fileHits.has(pid)) {
          fileHits.set(pid, r.displayName || r.originalFilename);
        }
      }
      return (parsed.packages || [])
        .filter((p) => p.status !== "deleted")
        .filter((p) => {
          if (fileHits.has(p.id)) return true;
          return (
            p.folderName.toLowerCase().includes(needle) ||
            p.uploadedBy.toLowerCase().includes(needle) ||
            (p.links.opportunityId || "").toLowerCase().includes(needle) ||
            (p.links.customerId || "").toLowerCase().includes(needle) ||
            (p.links.contactId || "").toLowerCase().includes(needle) ||
            (p.links.parentEntityId || "").toLowerCase().includes(needle) ||
            (p.links.parentEntityType || "").toLowerCase().includes(needle)
          );
        })
        .slice(0, 20)
        .map((p) => ({
          id: p.id,
          folderName: p.folderName,
          opportunityId: p.links.opportunityId,
          uploadedBy: p.uploadedBy,
          matchHint: fileHits.get(p.id)
            ? `File: ${fileHits.get(p.id)}`
            : undefined,
        }));
    } catch {
      return [];
    }
  };

  if (!isEnterprisePersistencePrisma() || !getAccessToken()) {
    return localSearch();
  }
  try {
    const res = await authenticatedJsonFetch(
      `/api/enterprise-document-packages?q=${encodeURIComponent(q)}`,
    );
    const body = (await res.json()) as Envelope<{
      items: DurableDocumentPackageDto[];
    }>;
    const local = localSearch();
    if (!body.success || !body.data?.items) return local;
    const byId = new Map<
      string,
      {
        id: string;
        folderName: string;
        opportunityId?: string;
        uploadedBy: string;
        matchHint?: string;
      }
    >(local.map((p) => [p.id, p]));
    for (const p of body.data.items.slice(0, 20)) {
      const id = p.clientPackageId || p.id;
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          folderName: p.folderName,
          opportunityId: p.opportunityId,
          uploadedBy: p.uploadedBy,
        });
      }
    }
    return Array.from(byId.values()).slice(0, 20);
  } catch {
    return localSearch();
  }
}

/**
 * Supabase Storage adapter — activates only when SUPABASE_URL + SERVICE_ROLE are set.
 * Uses Storage HTTP API (no hard dependency on @supabase/supabase-js install).
 * Private bucket; no permanent public URLs. Signed URLs are not returned to CHANAKYA —
 * binaries are fetched server-side after Opportunity authorization.
 */
import "server-only";

import {
  ETD_OBJECT_STORAGE_BUCKET_ENV,
  ETD_OBJECT_STORAGE_DEFAULT_BUCKET,
  ETD_OBJECT_STORAGE_MAX_BYTES,
  ETD_STORAGE_PROVIDER_SUPABASE,
} from "@/constants/enterprise-document-object-storage";
import {
  assertStorageKeyMatchesOpportunity,
  buildDocumentObjectStorageKey,
} from "./build-storage-key";
import type {
  DocumentObjectGetResult,
  DocumentObjectPutInput,
  DocumentObjectPutResult,
  DocumentObjectStoragePort,
} from "./ports";

function supabaseConfig(): { url: string; key: string; bucket: string } | null {
  const url = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  const bucket =
    String(process.env[ETD_OBJECT_STORAGE_BUCKET_ENV] || "").trim() ||
    ETD_OBJECT_STORAGE_DEFAULT_BUCKET;
  return { url: url.replace(/\/$/, ""), key, bucket };
}

export const supabaseDocumentObjectStorage: DocumentObjectStoragePort = {
  providerId: ETD_STORAGE_PROVIDER_SUPABASE,

  isAvailable() {
    return Boolean(supabaseConfig());
  },

  async put(input: DocumentObjectPutInput): Promise<DocumentObjectPutResult> {
    const cfg = supabaseConfig();
    if (!cfg) {
      throw Object.assign(new Error("Supabase Storage is not configured"), {
        code: "STORAGE_UNAVAILABLE",
        status: 503,
      });
    }
    if (input.bytes.byteLength === 0 || input.bytes.byteLength > ETD_OBJECT_STORAGE_MAX_BYTES) {
      throw Object.assign(new Error("Invalid object size for Supabase Storage"), {
        code: "OBJECT_SIZE",
        status: 413,
      });
    }

    const storageKey = buildDocumentObjectStorageKey({
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      documentId: input.documentId,
      version: input.version,
      contentHash: input.contentHash,
    });

    const endpoint = `${cfg.url}/storage/v1/object/${encodeURIComponent(cfg.bucket)}/${storageKey
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
        "Content-Type": input.mimeType || "application/octet-stream",
        "x-upsert": "true",
      },
      body: Buffer.from(input.bytes),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw Object.assign(
        new Error(`Supabase Storage upload failed (${res.status})`),
        {
          code: "SUPABASE_STORAGE_PUT_FAILED",
          status: 502,
          detail: detail.slice(0, 200),
        },
      );
    }

    return {
      storageKey,
      storageProvider: ETD_STORAGE_PROVIDER_SUPABASE,
      byteLength: input.bytes.byteLength,
      contentHash: input.contentHash,
    };
  },

  async get(input: {
    organizationId: string;
    opportunityId: string;
    storageKey: string;
  }): Promise<DocumentObjectGetResult | null> {
    const cfg = supabaseConfig();
    if (!cfg) return null;
    if (
      !assertStorageKeyMatchesOpportunity(
        input.storageKey,
        input.organizationId,
        input.opportunityId,
      )
    ) {
      return null;
    }

    const endpoint = `${cfg.url}/storage/v1/object/authenticated/${encodeURIComponent(cfg.bucket)}/${input.storageKey
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
      },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;
    return {
      bytes: Uint8Array.from(buf),
      mimeType: res.headers.get("content-type") || "application/octet-stream",
      byteLength: buf.length,
      contentHash: null,
    };
  },
};

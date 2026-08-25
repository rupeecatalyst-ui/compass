/**
 * Resolve durable object storage:
 * 1) Supabase Storage when SERVICE_ROLE is configured (preferred cloud object store)
 * 2) Postgres blob table (Hostinger-compatible; metadata/binary separated)
 */
import "server-only";

import { postgresDocumentObjectStorage } from "./postgres-blob-adapter";
import type { DocumentObjectStoragePort } from "./ports";
import { supabaseDocumentObjectStorage } from "./supabase-storage-adapter";

export function resolveDocumentObjectStorage(): DocumentObjectStoragePort {
  if (supabaseDocumentObjectStorage.isAvailable()) {
    return supabaseDocumentObjectStorage;
  }
  return postgresDocumentObjectStorage;
}

export function describeDocumentObjectStorage(): {
  providerId: string;
  available: boolean;
  preferred: "supabase_storage" | "postgres_blob";
  supabaseConfigured: boolean;
} {
  const supabaseConfigured = supabaseDocumentObjectStorage.isAvailable();
  const port = resolveDocumentObjectStorage();
  return {
    providerId: port.providerId,
    available: port.isAvailable(),
    preferred: supabaseConfigured ? "supabase_storage" : "postgres_blob",
    supabaseConfigured,
  };
}

/**
 * CO-CHANAKYA-DOCUMENT-STORAGE-009 — Durable object storage for transaction documents.
 *
 * Metadata stays on EnterpriseTransactionDocument.
 * Binaries larger than the inline BYTEA soft-cap go to the object store (storageKey).
 */

/** Inline Postgres `contentBytes` soft-cap (unchanged — do not raise as the large-file solution). */
export const ETD_INLINE_CONTENT_BYTES_MAX = 4 * 1024 * 1024;

/**
 * Max size accepted by the durable object store (bank statements ~4.5–6.2 MB).
 * Hostinger-compatible postgres blob adapter and future Supabase Storage share this ceiling.
 */
export const ETD_OBJECT_STORAGE_MAX_BYTES = 16 * 1024 * 1024;

/** Provider ids written to `storage_provider`. */
export const ETD_STORAGE_PROVIDER_POSTGRES_BLOB = "postgres_blob" as const;
export const ETD_STORAGE_PROVIDER_SUPABASE = "supabase_storage" as const;

export const ETD_OBJECT_STORAGE_BUCKET_ENV = "ETD_OBJECT_STORAGE_BUCKET" as const;
export const ETD_OBJECT_STORAGE_DEFAULT_BUCKET = "enterprise-transaction-documents" as const;

export const ETD_OBJECT_STORAGE_SPRINT = "CO-CHANAKYA-DOCUMENT-STORAGE-009" as const;

/**
 * CO-CHANAKYA-DOCUMENT-STORAGE-009 — Document object storage port.
 * Binary store is separate from ETD metadata. No permanent public URLs.
 */

export type DocumentObjectPutInput = {
  organizationId: string;
  opportunityId: string;
  documentId: string;
  version: number;
  contentHash: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type DocumentObjectPutResult = {
  storageKey: string;
  storageProvider: string;
  byteLength: number;
  contentHash: string;
};

export type DocumentObjectGetResult = {
  bytes: Uint8Array;
  mimeType: string;
  byteLength: number;
  contentHash: string | null;
};

export type DocumentObjectStoragePort = {
  readonly providerId: string;
  isAvailable(): boolean;
  put(input: DocumentObjectPutInput): Promise<DocumentObjectPutResult>;
  get(input: {
    organizationId: string;
    opportunityId: string;
    storageKey: string;
  }): Promise<DocumentObjectGetResult | null>;
};

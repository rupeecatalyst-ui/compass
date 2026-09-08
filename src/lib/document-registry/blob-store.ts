/**
 * Ephemeral in-memory document bytes for the current session.
 * Protected binaries are not persisted to IndexedDB, localStorage, or sessionStorage.
 */

const DB_NAME = "catalyst-document-registry";
const DB_VERSION = 1;
const STORE_NAME = "blobs";

const ephemeralBlobs = new Map<string, Blob>();
const liveObjectUrls = new Set<string>();

function rememberObjectUrl(url: string): string {
  liveObjectUrls.add(url);
  return url;
}

export function revokeDocumentObjectUrl(url: string | null | undefined): void {
  const value = url?.trim();
  if (!value || !value.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(value);
  } catch {
    /* already revoked */
  }
  liveObjectUrls.delete(value);
}

export function revokeAllDocumentObjectUrls(): void {
  for (const url of liveObjectUrls) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* already revoked */
    }
  }
  liveObjectUrls.clear();
}

export function clearEphemeralDocumentBlobs(): void {
  ephemeralBlobs.clear();
  revokeAllDocumentObjectUrls();
}

function openLegacyDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => resolve(null);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/** Clear legacy IndexedDB binary cache without touching server storage. */
export async function clearLegacyIndexedDbDocumentBlobs(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openLegacyDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.close();
      resolve();
      return;
    }
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      resolve();
    };
    tx.objectStore(STORE_NAME).clear();
  });
}

export async function saveDocumentBlob(blobId: string, blob: Blob): Promise<void> {
  ephemeralBlobs.set(blobId, blob);
}

export async function getDocumentBlob(blobId: string): Promise<Blob | null> {
  return ephemeralBlobs.get(blobId) ?? null;
}

export async function deleteDocumentBlob(blobId: string): Promise<void> {
  ephemeralBlobs.delete(blobId);
}

export async function createBlobObjectUrl(blobId: string): Promise<string | null> {
  const blob = await getDocumentBlob(blobId);
  if (!blob) return null;
  return rememberObjectUrl(URL.createObjectURL(blob));
}

export function trackDocumentObjectUrl(url: string): string {
  return rememberObjectUrl(url);
}

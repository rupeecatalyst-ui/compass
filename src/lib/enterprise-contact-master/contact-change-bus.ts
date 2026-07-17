/**
 * ECM Contact Registry change bus — keeps all surfaces on the latest SSOT.
 * In-process only (same JS heap). No stale React snapshots after save.
 */

let version = 0;
const listeners = new Set<() => void>();

export function getEcmContactRegistryVersion(): number {
  return version;
}

export function subscribeEcmContactRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Call after every successful contact create / update / archive. */
export function notifyEcmContactRegistryChanged(): void {
  version += 1;
  for (const listener of listeners) {
    listener();
  }
}

/** Test / composition reset — force all subscribers to re-read. */
export function resetEcmContactRegistryChangeBus(): void {
  version += 1;
  for (const listener of listeners) {
    listener();
  }
}

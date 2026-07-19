/**
 * Enterprise Table Standard — preference key helpers.
 * Layout prefs are scoped per authenticated user.
 */

export function buildEnterpriseGridStorageKey(
  baseKey: string,
  userId?: string | null,
): string {
  const uid = (userId ?? "anonymous").trim() || "anonymous";
  return `${baseKey}::user::${uid}`;
}

/**
 * Match a campaign from-address to an existing sender identity.
 * Does not create, approve, or verify an identity.
 */

export function senderIdentityIdForAddress(
  identities: Array<{ id: string; fromAddress: string; active: boolean }>,
  fromAddress: string | null | undefined,
): string | null {
  const normalized = (fromAddress ?? "").trim().toLowerCase();
  if (!normalized) return null;
  const match = identities.find(
    (identity) => identity.active && identity.fromAddress.trim().toLowerCase() === normalized,
  );
  return match?.id ?? null;
}

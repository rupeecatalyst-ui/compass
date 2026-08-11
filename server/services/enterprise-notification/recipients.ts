/**
 * CO-NOTIFICATION-001 — Recipient resolution (org hierarchy + admin scope).
 * Never notify the actor of their own activity (default policy).
 */
import "server-only";

import { prisma } from "@server/lib/prisma";
import { ROLES } from "@/constants/roles";
import {
  buildRecipientRows,
  excludeActorFromRecipients,
  type ResolvedRecipient,
} from "@/lib/enterprise-notification-engine/recipients-pure";

export type { ResolvedRecipient };
export { buildRecipientRows, excludeActorFromRecipients };

/**
 * Resolve Catalyst One recipients for an enterprise event.
 * - Actor excluded
 * - Actor's reporting manager included when present
 * - SUPER_ADMIN / ADMIN (active) included for enterprise observability
 * - Partner recipient only for external events (not partner's own action)
 */
export async function resolveNotificationRecipients(input: {
  organizationId: string;
  actorUserId?: string | null;
  sourceWealthPartnerId?: string | null;
  /** When true, partner is the actor — do not notify that partner. */
  actorIsPartner?: boolean;
}): Promise<ResolvedRecipient[]> {
  const out: ResolvedRecipient[] = [];
  const seenUsers = new Set<string>();
  const actorId = input.actorUserId?.trim() || null;

  if (actorId) {
    seenUsers.add(actorId);
    try {
      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { reportingManagerId: true, isActive: true },
      });
      const managerId = actor?.reportingManagerId?.trim();
      if (managerId && !seenUsers.has(managerId)) {
        const manager = await prisma.user.findUnique({
          where: { id: managerId },
          select: { id: true, isActive: true },
        });
        if (manager?.isActive) {
          seenUsers.add(manager.id);
          out.push({ kind: "user", userId: manager.id, reason: "reporting_manager" });
        }
      }
    } catch {
      /* soft */
    }
  }

  try {
    const admins = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
        ...(actorId ? { id: { not: actorId } } : {}),
      },
      select: { id: true },
      take: 50,
    });
    for (const admin of admins) {
      if (seenUsers.has(admin.id)) continue;
      seenUsers.add(admin.id);
      out.push({ kind: "user", userId: admin.id, reason: "admin_scope" });
    }
  } catch {
    /* soft */
  }

  const partnerId = input.sourceWealthPartnerId?.trim();
  if (partnerId && !input.actorIsPartner) {
    out.push({ kind: "partner", partnerId, reason: "partner_ownership" });
  }

  return excludeActorFromRecipients(out, actorId);
}

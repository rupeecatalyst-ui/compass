/**
 * CO-INV-001 — Wealth Partner activation adapter (first invitee kind).
 * Does not invent partner identity — activates existing EnterpriseWealthPartner only.
 */
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  registerInvitationAdapter,
  type InvitationActivationAdapter,
} from "@server/services/invitation-engine/invitation-engine.service";

const wealthPartnerAdapter: InvitationActivationAdapter = {
  inviteeKind: "wealth_partner",
  async resolveRecipient(entityId) {
    const organizationId = await resolvePilotOrganizationId();
    const partner = await prisma.enterpriseWealthPartner.findFirst({
      where: { id: entityId, organizationId, isDeleted: false },
    });
    if (!partner) {
      throw Object.assign(new Error("Wealth Partner not found"), {
        statusCode: 404,
        code: "PARTNER_NOT_FOUND",
      });
    }
    const email = (partner.email || "").trim();
    if (!email) {
      throw Object.assign(
        new Error("Add a partner email on the Profile tab before sending an invitation"),
        { statusCode: 400, code: "EMAIL_REQUIRED" },
      );
    }
    return {
      email,
      name: partner.displayName,
      label: partner.code,
    };
  },
  async onActivated(input) {
    const organizationId = await resolvePilotOrganizationId();
    const partner = await prisma.enterpriseWealthPartner.findFirst({
      where: { id: input.entityId, organizationId, isDeleted: false },
    });
    if (!partner) return;

    const profileJson = {
      ...(partner.profileJson && typeof partner.profileJson === "object"
        ? (partner.profileJson as Record<string, unknown>)
        : {}),
      activation: {
        invitationId: input.invitationId,
        activatedUserId: input.userId,
        activatedAt: new Date().toISOString(),
        city: input.profileCity ?? null,
      },
    };

    await prisma.enterpriseWealthPartner.update({
      where: { id: partner.id },
      data: {
        lifecycleStatus: "active",
        operationalStatus: "active",
        email: input.email,
        mobile: input.mobile || partner.mobile,
        cityLabel: input.profileCity || partner.cityLabel,
        profileJson: profileJson as object,
        modifiedBy: input.actorUserId,
      },
    });

    if (partner.contactId) {
      await prisma.ecmContact.updateMany({
        where: { id: partner.contactId, organizationId },
        data: {
          linkedUserId: input.userId,
          platformAccess: "both",
        },
      });
    }

    await prisma.enterpriseWealthPartnerActivity.create({
      data: {
        organizationId,
        wealthPartnerId: partner.id,
        activityType: "invitation_activated",
        title: "Partner account activated",
        detail: `Activated via Enterprise Invitation Engine (${input.invitationId})`,
        actorUserId: input.actorUserId,
      },
    });
  },
};

let registered = false;
export function ensureWealthPartnerInvitationAdapterRegistered() {
  if (registered) return;
  registerInvitationAdapter(wealthPartnerAdapter);
  registered = true;
}

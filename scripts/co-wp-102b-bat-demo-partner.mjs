/**
 * CO-WP-102B — Create permanent BAT Demo Wealth Partner and re-link wp-bat user.
 * Does not modify Neeraj Asrani partner identity fields — only retires BAT activation stamp.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { hashPassword } from "../server/utils/password.ts";
import {
  WEALTH_PARTNER_BAT_DEMO_CODE,
  WEALTH_PARTNER_BAT_DEMO_DISPLAY_NAME,
  WEALTH_PARTNER_BAT_ISOLATION_PROFILE,
  WEALTH_PARTNER_BAT_USER_EMAIL,
} from "../src/constants/enterprise-wealth-partner-bat.ts";

const prisma = new PrismaClient();

const NEERAJ_PARTNER_ID = "cms6e1e540003ld04mk5u5ubz";
const NEERAJ_USER_ID = "cms94ov100000js04tstlodje";
const BAT_MOBILE = "90000000999";

async function main() {
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!org) throw new Error("No organization found");

  const actor =
    (await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { id: true },
    })) ||
    (await prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true },
    }));
  if (!actor) throw new Error("No actor user for createdBy");

  const tempPassword = `WpBat!${randomBytes(4).toString("hex")}9`;
  const passwordHash = await hashPassword(tempPassword);

  let batUser = await prisma.user.findUnique({
    where: { email: WEALTH_PARTNER_BAT_USER_EMAIL },
  });
  if (batUser) {
    batUser = await prisma.user.update({
      where: { id: batUser.id },
      data: {
        passwordHash,
        isActive: true,
        firstName: "Wealth",
        lastName: "Partner BAT",
      },
    });
  } else {
    batUser = await prisma.user.create({
      data: {
        email: WEALTH_PARTNER_BAT_USER_EMAIL,
        passwordHash,
        firstName: "Wealth",
        lastName: "Partner BAT",
        role: "VIEWER",
        isActive: true,
      },
    });
  }

  // Contact identity for Demo partner (minimal — not a customer journey)
  let contact = await prisma.ecmContact.findFirst({
    where: {
      organizationId: org.id,
      isDeleted: false,
      OR: [
        { mobilePrimary: BAT_MOBILE },
        { personalEmail: WEALTH_PARTNER_BAT_USER_EMAIL },
        { officialEmail: WEALTH_PARTNER_BAT_USER_EMAIL },
      ],
    },
  });

  if (!contact) {
    contact = await prisma.ecmContact.create({
      data: {
        organizationId: org.id,
        name: WEALTH_PARTNER_BAT_DEMO_DISPLAY_NAME,
        mobilePrimary: BAT_MOBILE,
        personalEmail: WEALTH_PARTNER_BAT_USER_EMAIL,
        primaryRole: "partner",
        roles: ["partner"],
        additionalRoles: [],
        status: "active",
        platformAccess: "both",
        linkedUserId: batUser.id,
        createdBy: actor.id,
        modifiedBy: actor.id,
      },
    });
  } else {
    contact = await prisma.ecmContact.update({
      where: { id: contact.id },
      data: {
        name: WEALTH_PARTNER_BAT_DEMO_DISPLAY_NAME,
        personalEmail: WEALTH_PARTNER_BAT_USER_EMAIL,
        linkedUserId: batUser.id,
        platformAccess: "both",
        status: "active",
        isDeleted: false,
        modifiedBy: actor.id,
      },
    });
  }

  const batIsolation = {
    ...WEALTH_PARTNER_BAT_ISOLATION_PROFILE,
    code: WEALTH_PARTNER_BAT_DEMO_CODE,
    establishedAt: new Date().toISOString(),
    sprint: "CO-WP-102B",
  };

  let demoPartner = await prisma.enterpriseWealthPartner.findFirst({
    where: {
      organizationId: org.id,
      code: WEALTH_PARTNER_BAT_DEMO_CODE,
    },
  });

  const profileJson = {
    batIsolation,
    activation: {
      activatedUserId: batUser.id,
      activatedAt: new Date().toISOString(),
      source: "CO-WP-102B",
      purpose: "BAT / UAT / Regression",
    },
  };

  if (!demoPartner) {
    demoPartner = await prisma.enterpriseWealthPartner.create({
      data: {
        organizationId: org.id,
        code: WEALTH_PARTNER_BAT_DEMO_CODE,
        displayName: WEALTH_PARTNER_BAT_DEMO_DISPLAY_NAME,
        partnerType: "others",
        identityKind: "contact",
        contactId: contact.id,
        identityLabel: WEALTH_PARTNER_BAT_DEMO_DISPLAY_NAME,
        lifecycleStatus: "active",
        operationalStatus: "active",
        email: WEALTH_PARTNER_BAT_USER_EMAIL,
        mobile: BAT_MOBILE,
        notes:
          "Permanent BAT / UAT / Regression Wealth Partner. Isolated from commissions, KPIs, rankings, marketing, and operational analytics. Owns no business history.",
        profileJson,
        commercialStatus: "excluded_bat_demo",
        commercialReferralSharePercent: null,
        commercialSoleExecutorSharePercent: null,
        commercialJointExecutorSharePercent: null,
        status: "active",
        enabled: true,
        createdBy: actor.id,
        modifiedBy: actor.id,
      },
    });
  } else {
    if (demoPartner.isDeleted) {
      demoPartner = await prisma.enterpriseWealthPartner.update({
        where: { id: demoPartner.id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        },
      });
    }
    demoPartner = await prisma.enterpriseWealthPartner.update({
      where: { id: demoPartner.id },
      data: {
        displayName: WEALTH_PARTNER_BAT_DEMO_DISPLAY_NAME,
        contactId: contact.id,
        identityKind: "contact",
        identityLabel: WEALTH_PARTNER_BAT_DEMO_DISPLAY_NAME,
        lifecycleStatus: "active",
        operationalStatus: "active",
        email: WEALTH_PARTNER_BAT_USER_EMAIL,
        mobile: BAT_MOBILE,
        notes:
          "Permanent BAT / UAT / Regression Wealth Partner. Isolated from commissions, KPIs, rankings, marketing, and operational analytics. Owns no business history.",
        profileJson,
        commercialStatus: "excluded_bat_demo",
        commercialReferralSharePercent: null,
        commercialSoleExecutorSharePercent: null,
        commercialJointExecutorSharePercent: null,
        status: "active",
        enabled: true,
        isDeleted: false,
        modifiedBy: actor.id,
      },
    });
  }

  // Ensure zero business history on demo partner
  const [commissions, activities, network, banks] = await Promise.all([
    prisma.enterpriseWealthPartnerCommission.count({
      where: { wealthPartnerId: demoPartner.id, isDeleted: false },
    }),
    prisma.enterpriseWealthPartnerActivity.count({
      where: { wealthPartnerId: demoPartner.id },
    }),
    prisma.enterpriseWealthPartnerNetworkMember.count({
      where: { parentPartnerId: demoPartner.id, isDeleted: false },
    }),
    prisma.enterpriseWealthPartnerBankAccount.count({
      where: { wealthPartnerId: demoPartner.id, isDeleted: false },
    }),
  ]);

  // Soft-delete any accidental commission / network / bank on demo (should be zero)
  if (commissions || network || banks) {
    await prisma.enterpriseWealthPartnerCommission.updateMany({
      where: { wealthPartnerId: demoPartner.id, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: actor.id },
    });
    await prisma.enterpriseWealthPartnerNetworkMember.updateMany({
      where: { parentPartnerId: demoPartner.id, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: actor.id },
    });
    await prisma.enterpriseWealthPartnerBankAccount.updateMany({
      where: { wealthPartnerId: demoPartner.id, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: actor.id },
    });
  }

  // Retire BAT linkage on Neeraj Asrani — restore his activation; do not change identity fields
  const neeraj = await prisma.enterpriseWealthPartner.findUnique({
    where: { id: NEERAJ_PARTNER_ID },
  });
  if (neeraj) {
    const prev =
      neeraj.profileJson && typeof neeraj.profileJson === "object" && !Array.isArray(neeraj.profileJson)
        ? { ...neeraj.profileJson }
        : {};
    const prevActivation =
      prev.activation && typeof prev.activation === "object" && !Array.isArray(prev.activation)
        ? { ...prev.activation }
        : {};
    prev.activation = {
      ...prevActivation,
      activatedUserId: NEERAJ_USER_ID,
      activatedAt: prevActivation.activatedAt || new Date().toISOString(),
      batLinkageRetiredAt: new Date().toISOString(),
      batLinkageRetiredBy: "CO-WP-102B",
      note: "BAT login moved to WPDEMO001 — production partner activation restored",
    };
    // Remove batIsolation if somehow stamped
    delete prev.batIsolation;
    await prisma.enterpriseWealthPartner.update({
      where: { id: neeraj.id },
      data: {
        profileJson: prev,
        modifiedBy: actor.id,
      },
    });
  }

  // Ensure BAT user is not linked via any other contact to a production partner
  const otherLinks = await prisma.ecmContact.findMany({
    where: {
      linkedUserId: batUser.id,
      isDeleted: false,
      id: { not: contact.id },
    },
    select: { id: true },
  });
  if (otherLinks.length) {
    await prisma.ecmContact.updateMany({
      where: { id: { in: otherLinks.map((c) => c.id) } },
      data: { linkedUserId: null, modifiedBy: actor.id },
    });
  }

  console.log(
    JSON.stringify(
      {
        partnerUuid: demoPartner.id,
        partnerCode: demoPartner.code,
        partnerName: demoPartner.displayName,
        email: batUser.email,
        temporaryPassword: tempPassword,
        userId: batUser.id,
        contactId: contact.id,
        organizationId: org.id,
        historyBeforeCleanup: { commissions, activities, network, banks },
        neerajBatRetired: Boolean(neeraj),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

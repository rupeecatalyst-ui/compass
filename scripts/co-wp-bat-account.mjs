/**
 * One-shot: locate or create BAT Partner login (no demo business data).
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { hashPassword } from "../server/utils/password.ts";

const prisma = new PrismaClient();
const BAT_EMAIL = "wp-bat@rupeecatalyst.com";
const MODE = process.argv[2] || "discover"; // discover | provision

async function discover() {
  const results = [];

  const linked = await prisma.ecmContact.findMany({
    where: { linkedUserId: { not: null }, isDeleted: false },
    select: { id: true, linkedUserId: true, name: true, personalEmail: true, officialEmail: true },
    take: 50,
  });

  for (const c of linked) {
    const partner = await prisma.enterpriseWealthPartner.findFirst({
      where: { contactId: c.id, isDeleted: false },
      select: {
        id: true,
        code: true,
        displayName: true,
        lifecycleStatus: true,
        operationalStatus: true,
        email: true,
      },
    });
    const user = c.linkedUserId
      ? await prisma.user.findUnique({
          where: { id: c.linkedUserId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        })
      : null;
    if (partner && user) {
      results.push({ via: "contact.linkedUserId", contactId: c.id, contactName: c.name, user, partner });
    }
  }

  const activated = await prisma.enterpriseWealthPartner.findMany({
    where: {
      isDeleted: false,
      profileJson: { path: ["activation", "activatedUserId"], not: null },
    },
    select: {
      id: true,
      code: true,
      displayName: true,
      contactId: true,
      profileJson: true,
      lifecycleStatus: true,
      operationalStatus: true,
      email: true,
    },
    take: 20,
  });

  for (const p of activated) {
    const uid = p.profileJson?.activation?.activatedUserId;
    if (!uid) continue;
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });
    if (user) {
      results.push({ via: "activation.activatedUserId", user, partner: p });
    }
  }

  console.log(JSON.stringify({ count: results.length, results }, null, 2));
  return results;
}

async function provision() {
  // Use the known existing active partner (do not create partner / demo business data)
  const partner = await prisma.enterpriseWealthPartner.findFirst({
    where: {
      isDeleted: false,
      id: "cms6e1e540003ld04mk5u5ubz",
    },
  });

  if (!partner) {
    throw new Error("Expected existing Wealth Partner cms6e1e540003ld04mk5u5ubz not found");
  }

  const tempPassword = `WpBat!${randomBytes(4).toString("hex")}9`;
  const passwordHash = await hashPassword(tempPassword);

  let user = await prisma.user.findUnique({ where: { email: BAT_EMAIL } });
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isActive: true,
        firstName: "Wealth",
        lastName: "Partner BAT",
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: BAT_EMAIL,
        passwordHash,
        firstName: "Wealth",
        lastName: "Partner BAT",
        role: "VIEWER",
        isActive: true,
      },
    });
  }

  /**
   * Preserve existing Contact.linkedUserId (Neeraj) — do not steal that binding.
   * BAT binds via activation.activatedUserId (supported by partner-binding resolver).
   */
  const profile =
    partner.profileJson && typeof partner.profileJson === "object" && !Array.isArray(partner.profileJson)
      ? { ...partner.profileJson }
      : {};
  const activation =
    profile.activation && typeof profile.activation === "object" && !Array.isArray(profile.activation)
      ? { ...profile.activation }
      : {};
  activation.activatedUserId = user.id;
  activation.activatedAt = new Date().toISOString();
  activation.source = "CO-WP-BAT";
  activation.note = "BAT login; primary contact link unchanged";
  profile.activation = activation;

  await prisma.enterpriseWealthPartner.update({
    where: { id: partner.id },
    data: { profileJson: profile },
  });

  console.log(
    JSON.stringify(
      {
        email: user.email,
        temporaryPassword: tempPassword,
        partnerName: partner.displayName,
        partnerCode: partner.code,
        partnerUuid: partner.id,
        userId: user.id,
        contactId: partner.contactId,
        lifecycleStatus: partner.lifecycleStatus,
        operationalStatus: partner.operationalStatus,
        binding: "activation.activatedUserId (existing partner; contact link preserved)",
      },
      null,
      2,
    ),
  );
}

async function main() {
  if (MODE === "discover") {
    await discover();
  } else if (MODE === "provision") {
    await provision();
  } else if (MODE === "reset-existing") {
    // Reset password for first discovered linked pair (do not create new partner data)
    const results = await discover();
    if (!results.length) {
      console.log(JSON.stringify({ error: "none_found" }));
      return;
    }
    const pick = results[0];
    const tempPassword = `WpBat!${randomBytes(4).toString("hex")}9`;
    const passwordHash = await hashPassword(tempPassword);
    await prisma.user.update({
      where: { id: pick.user.id },
      data: { passwordHash, isActive: true },
    });
    console.log(
      JSON.stringify(
        {
          email: pick.user.email,
          temporaryPassword: tempPassword,
          partnerName: pick.partner.displayName,
          partnerCode: pick.partner.code,
          partnerUuid: pick.partner.id,
          userId: pick.user.id,
          note: "Existing linked user — password reset for BAT only",
        },
        null,
        2,
      ),
    );
  } else {
    throw new Error(`Unknown mode ${MODE}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

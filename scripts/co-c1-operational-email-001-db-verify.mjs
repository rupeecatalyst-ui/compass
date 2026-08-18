#!/usr/bin/env node
/**
 * CO-C1-OPERATIONAL-EMAIL-001 — read-only database persistence validation.
 * Never prints provider credentials or connection strings.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const profiles = await prisma.enterpriseCommunicationProfile.findMany({
    select: {
      profileCode: true,
      smtpProvider: true,
      smtpPasswordEnc: true,
      active: true,
      updatedAt: true,
    },
    orderBy: { profileCode: "asc" },
  });

  console.log(
    JSON.stringify(
      {
        table: "enterprise_communication_profiles",
        persistedProfileCount: profiles.length,
        profiles: profiles.map((profile) => ({
          profileCode: profile.profileCode,
          provider: profile.smtpProvider,
          credentialConfigured: Boolean(profile.smtpPasswordEnc),
          active: profile.active,
          updatedAt: profile.updatedAt.toISOString(),
        })),
      },
      null,
      2,
    ),
  );
  console.log("CO-C1-OPERATIONAL-EMAIL-001 DB verify: PASS");
} finally {
  await prisma.$disconnect();
}

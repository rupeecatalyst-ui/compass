import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const n = await p.enterpriseWealthPartner.findUnique({
  where: { id: "cms6e1e540003ld04mk5u5ubz" },
  select: { id: true, code: true, displayName: true, profileJson: true },
});
const d = await p.enterpriseWealthPartner.findFirst({
  where: { code: "WPDEMO001" },
  select: {
    id: true,
    code: true,
    displayName: true,
    commercialStatus: true,
    profileJson: true,
  },
});
const act = n?.profileJson?.activation || {};
console.log(
  JSON.stringify(
    {
      neeraj: {
        id: n?.id,
        code: n?.code,
        activationUserId: act.activatedUserId,
        batRetired: Boolean(act.batLinkageRetiredAt),
      },
      demo: {
        id: d?.id,
        code: d?.code,
        name: d?.displayName,
        commercialStatus: d?.commercialStatus,
        batIsolation: d?.profileJson?.batIsolation || null,
      },
    },
    null,
    2,
  ),
);
await p.$disconnect();

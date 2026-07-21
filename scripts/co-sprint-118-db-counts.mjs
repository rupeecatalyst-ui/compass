import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const [users, contacts, companies, links, org] = await Promise.all([
  p.user.count(),
  p.ecmContact.count(),
  p.ecmCompany.count(),
  p.ecmCompanyContactLink.count(),
  p.organization.findFirst({ where: { slug: "rupee-catalyst" } }),
]);
console.log(
  JSON.stringify(
    {
      organization: org?.name ?? null,
      users,
      contacts,
      companies,
      links,
    },
    null,
    2,
  ),
);
await p.$disconnect();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const d = await prisma.enterpriseWealthPartner.findFirst({
    where: { code: "WPDEMO001" },
  });
  if (!d) throw new Error("WPDEMO001 missing");
  const profile =
    d.profileJson && typeof d.profileJson === "object" && !Array.isArray(d.profileJson)
      ? { ...d.profileJson }
      : {};
  profile.professionalTitle = "Wealth Partner";
  await prisma.enterpriseWealthPartner.update({
    where: { id: d.id },
    data: { profileJson: profile },
  });
  console.log(JSON.stringify({ ok: true, partnerId: d.id, professionalTitle: "Wealth Partner" }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

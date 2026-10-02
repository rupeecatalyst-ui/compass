/**
 * Publishes Home Loan journeys into the isolated local cluster only.
 * Does not create a Contact, Opportunity, Deal, recommendation, or document.
 */
import { prisma } from "../server/lib/prisma";
import { buildIdcJourneyDraft } from "../server/services/compass-customer-gateway/compass-journey-config.service";
import {
  importJourneyDraft,
  previewProductJourney,
  publishProductJourney,
  resolvePublishedJourney,
  saveProductJourneyDraft,
} from "../src/lib/product-journey/publication";

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "compass-local-proof" },
    update: {},
    create: { slug: "compass-local-proof", name: "COMPASS Local Proof" },
  });
  for (const code of ["HOME_LOAN", "HOME_LOAN_BT"]) {
    const draft = await buildIdcJourneyDraft(code, org.id);
    const imported = await importJourneyDraft({ organizationId: org.id, actorId: "local-proof", draft });
    const refresh = process.argv.includes("--next-version");
    if (imported.imported || refresh) {
      if (refresh && !imported.imported) {
        await saveProductJourneyDraft(org.id, draft, "local-proof");
      }
      await previewProductJourney(org.id, draft.productCode, {}, "local-proof");
      const published = await publishProductJourney(org.id, draft.productCode, "local-proof");
      if (!published.ok) throw new Error(published.errors.join(","));
    }
    const live = await resolvePublishedJourney(org.id, draft.productCode, null);
    console.log(`${draft.productCode} version ${live?.journeyVersion ?? "none"}`);
  }
  const [contacts, opportunities, deals, documents] = await Promise.all([
    prisma.ecmContact.count(),
    prisma.enterpriseOpportunity.count(),
    prisma.enterpriseDeal.count(),
    prisma.enterpriseTransactionDocument.count(),
  ]);
  console.log(JSON.stringify({ contacts, opportunities, deals, documents }));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

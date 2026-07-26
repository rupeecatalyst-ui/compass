/**
 * CO-P0-004 — Trace business case: Priyesh Jain (Pilot DB only).
 * Prints verified rows only. No connection strings / secrets.
 */
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

const NAME = "Priyesh Jain";

function projectRef(url) {
  if (!url) return null;
  const m = url.match(/postgres\.([a-z0-9]+):/i);
  if (m?.[1]) return m[1];
  try {
    const h = new URL(url).hostname;
    const a =
      h.match(/^db\.([a-z0-9]+)\.supabase\.co$/i) ||
      h.match(/^([a-z0-9]+)\.pooler\.supabase\.com$/i);
    return a ? a[1] : null;
  } catch {
    return null;
  }
}

(async () => {
  const report = {
    incident: "CO-P0-004",
    customerQuery: NAME,
    database: {
      projectRef: projectRef(process.env.DATABASE_URL),
      persistenceMode: process.env.ENTERPRISE_PERSISTENCE_MODE || null,
      connected: false,
    },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    report.database.connected = true;

    // 1) Contacts — all matches including soft-deleted
    const contacts = await prisma.ecmContact.findMany({
      where: {
        OR: [
          { name: { equals: NAME, mode: "insensitive" } },
          { name: { contains: "Priyesh", mode: "insensitive" } },
          { name: { contains: "Jain", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        mobilePrimary: true,
        primaryRole: true,
        status: true,
        enabled: true,
        isDeleted: true,
        deletedAt: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Narrow exact / close name matches for primary answer
    const exact = contacts.filter(
      (c) => c.name.trim().toLowerCase() === NAME.toLowerCase(),
    );
    const priyesh = contacts.filter((c) =>
      c.name.toLowerCase().includes("priyesh"),
    );

    report.contactSearch = {
      totalRowsReturned: contacts.length,
      exactNameMatches: exact.map((c) => ({
        id: c.id,
        name: c.name,
        organizationId: c.organizationId,
        mobilePrimary: c.mobilePrimary,
        primaryRole: c.primaryRole,
        status: c.status,
        enabled: c.enabled,
        isDeleted: c.isDeleted,
        deletedAt: c.deletedAt,
        archivedAt: c.archivedAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      priyeshNameMatches: priyesh.map((c) => ({
        id: c.id,
        name: c.name,
        isDeleted: c.isDeleted,
        organizationId: c.organizationId,
        createdAt: c.createdAt,
      })),
    };

    const contactIds = [...new Set([...exact, ...priyesh].map((c) => c.id))];

    // 2) Deals linked by primaryContactId OR primaryContactName OR participant
    const dealsByContactId =
      contactIds.length === 0
        ? []
        : await prisma.enterpriseDeal.findMany({
            where: { primaryContactId: { in: contactIds } },
            select: {
              id: true,
              dealNumber: true,
              organizationId: true,
              legacyLoanFileId: true,
              primaryContactId: true,
              primaryContactName: true,
              grossStage: true,
              subStage: true,
              lifecycleStatus: true,
              operationalStatus: true,
              archived: true,
              isDeleted: true,
              deletedAt: true,
              createdAt: true,
              createdBy: true,
              updatedAt: true,
            },
          });

    const dealsByName = await prisma.enterpriseDeal.findMany({
      where: {
        OR: [
          { primaryContactName: { equals: NAME, mode: "insensitive" } },
          { primaryContactName: { contains: "Priyesh", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        dealNumber: true,
        organizationId: true,
        legacyLoanFileId: true,
        primaryContactId: true,
        primaryContactName: true,
        grossStage: true,
        subStage: true,
        lifecycleStatus: true,
        operationalStatus: true,
        archived: true,
        isDeleted: true,
        deletedAt: true,
        createdAt: true,
        createdBy: true,
        updatedAt: true,
      },
    });

    const participants =
      contactIds.length === 0
        ? []
        : await prisma.enterpriseDealParticipant.findMany({
            where: { ecmContactId: { in: contactIds } },
            select: {
              id: true,
              dealId: true,
              ecmContactId: true,
              role: true,
              isDeleted: true,
              createdAt: true,
            },
          });

    const participantDealIds = [...new Set(participants.map((p) => p.dealId))];
    const dealsByParticipant =
      participantDealIds.length === 0
        ? []
        : await prisma.enterpriseDeal.findMany({
            where: { id: { in: participantDealIds } },
            select: {
              id: true,
              dealNumber: true,
              organizationId: true,
              legacyLoanFileId: true,
              primaryContactId: true,
              primaryContactName: true,
              grossStage: true,
              subStage: true,
              lifecycleStatus: true,
              operationalStatus: true,
              archived: true,
              isDeleted: true,
              deletedAt: true,
              createdAt: true,
              createdBy: true,
              updatedAt: true,
            },
          });

    const dealMap = new Map();
    for (const d of [...dealsByContactId, ...dealsByName, ...dealsByParticipant]) {
      dealMap.set(d.id, d);
    }
    const deals = [...dealMap.values()];

    report.deals = {
      byPrimaryContactId: dealsByContactId.length,
      byPrimaryContactName: dealsByName.length,
      byParticipant: dealsByParticipant.length,
      uniqueDealCount: deals.length,
      rows: deals,
      participants,
    };

    // 3) Documents + lender counterparties for found deals
    const dealIds = deals.map((d) => d.id);
    if (dealIds.length > 0) {
      const docs = await prisma.enterpriseDealDocumentLink.findMany({
        where: { dealId: { in: dealIds } },
        select: {
          id: true,
          dealId: true,
          status: true,
          storageKey: true,
          uploadedAt: true,
          isDeleted: true,
          createdAt: true,
        },
      });
      const counterparties =
        await prisma.enterpriseDealCounterpartyAssignment.findMany({
          where: { dealId: { in: dealIds } },
          select: {
            id: true,
            dealId: true,
            counterpartyType: true,
            counterpartyRegistryId: true,
            programId: true,
            isPrimary: true,
            pipelineStage: true,
            pipelineSubStage: true,
            isDeleted: true,
            createdAt: true,
          },
        });
      report.documents = docs;
      report.lenderWorkspaceCounterparties = counterparties;
    } else {
      report.documents = [];
      report.lenderWorkspaceCounterparties = [];
    }

    // 4) Registry totals for context (evidence of empty vs filtered)
    report.registryTotals = {
      enterpriseDealTotal: await prisma.enterpriseDeal.count(),
      enterpriseDealActive: await prisma.enterpriseDeal.count({
        where: { isDeleted: false, archived: false },
      }),
      ecmContactTotal: await prisma.ecmContact.count(),
      ecmContactNamedPriyesh: await prisma.ecmContact.count({
        where: { name: { contains: "Priyesh", mode: "insensitive" } },
      }),
    };

    // 5) Failure locus (deterministic from verified rows)
    const hasExactContact = exact.length > 0;
    const hasLiveExact = exact.some((c) => !c.isDeleted);
    const hasDeal = deals.length > 0;
    const hasLiveDeal = deals.some((d) => !d.isDeleted && !d.archived);

    let failureLocus = null;
    if (!hasExactContact && priyesh.length === 0) {
      failureLocus =
        "Contact not found in ecm_contacts (Pilot). Contact save either never reached this database, used a different project/tenant, or name differs.";
    } else if (hasExactContact && !hasLiveExact) {
      failureLocus =
        "Contact exists but is soft-deleted (is_deleted=true). Deal linkage may be blocked or hidden by soft-delete filters.";
    } else if (hasLiveExact && !hasDeal) {
      failureLocus =
        "Contact saved in ecm_contacts, but no row in enterprise_deals (by primaryContactId, primaryContactName, or enterprise_deal_participants). Deal creation did not persist to Enterprise Deal Registry on this Pilot project — likely localStorage-only create and/or dual-write off/failed (not a wrong-table hit on enterprise_deals).";
    } else if (hasDeal && !hasLiveDeal) {
      failureLocus =
        "Deal row(s) exist but are soft-deleted and/or archived — query filtering / soft delete.";
    } else if (hasLiveDeal) {
      failureLocus = null;
    }

    report.answers = {
      contactExists: hasExactContact || priyesh.length > 0,
      exactContactExists: hasExactContact,
      contactIds: exact.map((c) => c.id),
      enterpriseDealLinked: hasDeal,
      liveEnterpriseDealLinked: hasLiveDeal,
      documentsLinked: (report.documents || []).some(
        (d) => d.storageKey || d.uploadedAt,
      ),
      lenderWorkspaceLinked: (report.lenderWorkspaceCounterparties || []).length > 0,
      failureLocus,
    };
  } catch (e) {
    report.database.connected = false;
    report.error = e.message;
  }

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
})();

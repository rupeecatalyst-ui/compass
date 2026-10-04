import { Prisma } from "@prisma/client";
import type { JourneyDraft, PublishedJourneyDefinition } from "@/lib/product-journey/publication";
import {
  ProductJourneyStoreError,
  type JourneyAuditRecord,
  type ProductJourneyStore,
} from "@/lib/product-journey/store";
import { prisma } from "@server/lib/prisma";

/**
 * Postgres is the product-journey authority.
 * Published definition JSON is inserted once and is not updated.
 */

function asDraft(value: Prisma.JsonValue): JourneyDraft {
  return value as JourneyDraft;
}

function asPublished(value: Prisma.JsonValue, row: {
  versionNumber: number;
  lifecycle: "published" | "superseded" | "retired";
  effectiveFrom: Date;
  publishedAt: Date;
  publishedBy: string;
  configurationHash: string;
  sourceReference: string | null;
  supersededAt: Date | null;
  retiredAt: Date | null;
}): PublishedJourneyDefinition {
  const stored = value as PublishedJourneyDefinition;
  return {
    ...stored,
    journeyVersion: row.versionNumber,
    lifecycle: row.lifecycle,
    effectiveFrom: row.effectiveFrom.toISOString(),
    publishedAt: row.publishedAt.toISOString(),
    publishedBy: row.publishedBy,
    configurationHash: row.configurationHash,
    sourceReference: row.sourceReference ?? stored.sourceReference,
    supersededAt: row.supersededAt?.toISOString(),
    retiredAt: row.retiredAt?.toISOString(),
  };
}

function unavailable(error: unknown): never {
  if (error instanceof ProductJourneyStoreError) throw error;
  throw new ProductJourneyStoreError(
    "STORE_UNAVAILABLE",
    "The product journey registry is unavailable.",
  );
}

export function createPrismaProductJourneyStore(): ProductJourneyStore {
  return {
    async read(organizationId, productCode) {
      try {
        const code = productCode.trim().toLowerCase();
        const journey = await prisma.enterpriseProductJourney.findUnique({
          where: { organizationId_productCode: { organizationId, productCode: code } },
          include: { draft: true, versions: { orderBy: { versionNumber: "asc" } } },
        });
        if (!journey) return null;
        const audits = await prisma.organizationAuditEntry.findMany({
          where: { organizationId, entityType: "product_journey", entityId: code },
          orderBy: { occurredAt: "asc" },
        });
        return {
          organizationId,
          productCode: code,
          bookRevision: journey.bookRevision,
          publiclyEnabled: journey.publiclyEnabled,
          effectiveVersion: journey.effectiveVersionNumber,
          draft: journey.draft ? asDraft(journey.draft.definition) : null,
          versions: journey.versions.map((version) => asPublished(version.definition, version)),
          audits: audits.map((entry) => {
            const value = (entry.newValue ?? {}) as Partial<JourneyAuditRecord>;
            return {
              action: entry.action,
              productCode: code,
              version: value.version ?? null,
              previousVersion: value.previousVersion ?? null,
              actorId: entry.actorUserId,
              validationResult: value.validationResult ?? "",
              configurationHash: value.configurationHash ?? null,
              at: entry.occurredAt.toISOString(),
            };
          }),
        };
      } catch (error) {
        unavailable(error);
      }
    },

    async compareAndSwap(organizationId, productCode, expectedRevision, next) {
      const code = productCode.trim().toLowerCase();
      try {
        await prisma.$transaction(async (tx) => {
          const current = await tx.enterpriseProductJourney.findUnique({
            where: { organizationId_productCode: { organizationId, productCode: code } },
            include: { versions: true },
          });
          if ((current?.bookRevision ?? 0) !== expectedRevision) {
            throw new ProductJourneyStoreError(
              "JOURNEY_CONFLICT",
              "The journey draft changed before it could be saved.",
            );
          }
          const journey = current
            ? await tx.enterpriseProductJourney.update({
                where: { id: current.id },
                data: {
                  publicLabel: next.draft?.productLabel || next.versions.at(-1)?.productLabel || code,
                  publiclyEnabled: next.publiclyEnabled,
                  effectiveVersionNumber: next.effectiveVersion,
                  bookRevision: next.bookRevision,
                  modifiedBy: next.audits.at(-1)?.actorId || current.modifiedBy,
                },
              })
            : await tx.enterpriseProductJourney.create({
                data: {
                  organizationId,
                  productCode: code,
                  publicLabel: next.draft?.productLabel || code,
                  publiclyEnabled: next.publiclyEnabled,
                  effectiveVersionNumber: next.effectiveVersion,
                  bookRevision: next.bookRevision,
                  createdBy: next.audits.at(-1)?.actorId || "product-journey",
                  modifiedBy: next.audits.at(-1)?.actorId || "product-journey",
                },
              });

          if (next.draft) {
            await tx.enterpriseProductJourneyDraft.upsert({
              where: { journeyId: journey.id },
              create: {
                journeyId: journey.id,
                organizationId,
                revision: next.bookRevision,
                validationStatus: next.draft.lifecycle === "validated" ? "validated" : "draft",
                previewed: next.draft.previewed,
                definition: next.draft as unknown as Prisma.InputJsonValue,
                createdBy: next.audits.at(-1)?.actorId || "product-journey",
                updatedBy: next.audits.at(-1)?.actorId || "product-journey",
              },
              update: {
                revision: next.bookRevision,
                validationStatus: next.draft.lifecycle === "validated" ? "validated" : "draft",
                previewed: next.draft.previewed,
                definition: next.draft as unknown as Prisma.InputJsonValue,
                updatedBy: next.audits.at(-1)?.actorId || "product-journey",
              },
            });
          }

          const existingVersions = new Map((current?.versions ?? []).map((version) => [version.versionNumber, version]));
          for (const version of next.versions) {
            const existing = existingVersions.get(version.journeyVersion);
            if (!existing) {
              await tx.enterpriseProductJourneyVersion.create({
                data: {
                  journeyId: journey.id,
                  organizationId,
                  productCode: code,
                  versionNumber: version.journeyVersion,
                  lifecycle: version.lifecycle,
                  effectiveFrom: new Date(version.effectiveFrom),
                  publishedBy: version.publishedBy || "product-journey",
                  publishedAt: new Date(version.publishedAt),
                  supersededAt: version.supersededAt ? new Date(version.supersededAt) : null,
                  retiredAt: version.retiredAt ? new Date(version.retiredAt) : null,
                  configurationHash: version.configurationHash || "",
                  sourceReference: version.sourceReference ?? null,
                  definition: version as unknown as Prisma.InputJsonValue,
                },
              });
              continue;
            }
            if (existing.lifecycle !== version.lifecycle) {
              await tx.enterpriseProductJourneyVersion.update({
                where: { id: existing.id },
                data: {
                  lifecycle: version.lifecycle,
                  supersededAt: version.supersededAt ? new Date(version.supersededAt) : existing.supersededAt,
                  retiredAt: version.retiredAt ? new Date(version.retiredAt) : existing.retiredAt,
                },
              });
            }
          }

          const known = new Set(
            (current ? await tx.organizationAuditEntry.findMany({
              where: { organizationId, entityType: "product_journey", entityId: code },
              select: { occurredAt: true, action: true },
            }) : []).map((entry) => `${entry.action}:${entry.occurredAt.toISOString()}`),
          );
          for (const audit of next.audits) {
            const stamp = `${audit.action}:${audit.at}`;
            if (known.has(stamp)) continue;
            await tx.organizationAuditEntry.create({
              data: {
                organizationId,
                action: audit.action,
                entityType: "product_journey",
                entityId: code,
                actorUserId: audit.actorId,
                previousValue: { version: audit.previousVersion },
                newValue: {
                  version: audit.version,
                  previousVersion: audit.previousVersion,
                  validationResult: audit.validationResult,
                  configurationHash: audit.configurationHash,
                },
                occurredAt: new Date(audit.at),
              },
            });
          }
        });
      } catch (error) {
        unavailable(error);
      }
    },
  };
}

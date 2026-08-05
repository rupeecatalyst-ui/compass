/**
 * CO-LENDER-ECOSYSTEM-001 — Lender contacts & documents (Prisma).
 * Soft-delete only. Never hard-deletes lender, program, or mapping rows.
 */
import type { LenderContactDepartment, LenderDocumentKind } from "@prisma/client";

import type {
  CreateLenderContactInput,
  CreateLenderDocumentInput,
  EnterpriseLenderContactRecord,
  EnterpriseLenderDocumentRecord,
} from "@/types/enterprise-lender-registry";
import { prisma } from "@server/lib/prisma";

import { mapContactRow, mapDocumentRow } from "./mappers";

export class LenderContactsDocumentsRepository {
  async listContacts(
    organizationId: string,
    lenderId: string,
  ): Promise<EnterpriseLenderContactRecord[]> {
    const rows = await prisma.enterpriseLenderContact.findMany({
      where: { organizationId, lenderId, isDeleted: false },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(mapContactRow);
  }

  async replaceContacts(
    organizationId: string,
    lenderId: string,
    contacts: CreateLenderContactInput[],
    actorId: string,
  ): Promise<EnterpriseLenderContactRecord[]> {
    const existing = await prisma.enterpriseLenderContact.findMany({
      where: { organizationId, lenderId, isDeleted: false },
    });
    const keepIds = new Set(
      contacts.map((c) => c.id).filter((id): id is string => Boolean(id)),
    );
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const row of existing) {
        if (!keepIds.has(row.id)) {
          await tx.enterpriseLenderContact.update({
            where: { id: row.id },
            data: {
              isDeleted: true,
              deletedAt: now,
              modifiedBy: actorId,
            },
          });
        }
      }

      for (const [i, input] of contacts.entries()) {
        const data = {
          name: input.name.trim(),
          designation: input.designation?.trim() || null,
          department: input.department as LenderContactDepartment,
          mobile: input.mobile?.trim() || null,
          email: input.email?.trim() || null,
          preferredContactMethod: input.preferredContactMethod?.trim() || null,
          enabled: input.enabled ?? true,
          sortOrder: input.sortOrder ?? i,
          modifiedBy: actorId,
          isDeleted: false,
          deletedAt: null,
        };

        if (input.id && existing.some((e) => e.id === input.id)) {
          await tx.enterpriseLenderContact.update({
            where: { id: input.id },
            data,
          });
        } else {
          await tx.enterpriseLenderContact.create({
            data: {
              organizationId,
              lenderId,
              ...data,
              createdBy: input.createdBy || actorId,
            },
          });
        }
      }
    });

    return this.listContacts(organizationId, lenderId);
  }

  async listDocuments(
    organizationId: string,
    lenderId: string,
  ): Promise<EnterpriseLenderDocumentRecord[]> {
    const rows = await prisma.enterpriseLenderDocument.findMany({
      where: { organizationId, lenderId, isDeleted: false },
      orderBy: [{ createdAt: "asc" }],
    });
    return rows.map(mapDocumentRow);
  }

  async replaceDocuments(
    organizationId: string,
    lenderId: string,
    docs: CreateLenderDocumentInput[],
    actorId: string,
  ): Promise<EnterpriseLenderDocumentRecord[]> {
    const existing = await prisma.enterpriseLenderDocument.findMany({
      where: { organizationId, lenderId, isDeleted: false },
    });
    const keepIds = new Set(
      docs.map((d) => d.id).filter((id): id is string => Boolean(id)),
    );
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const row of existing) {
        if (!keepIds.has(row.id)) {
          await tx.enterpriseLenderDocument.update({
            where: { id: row.id },
            data: {
              isDeleted: true,
              deletedAt: now,
              modifiedBy: actorId,
            },
          });
        }
      }

      for (const input of docs) {
        const data = {
          kind: input.kind as LenderDocumentKind,
          title: input.title.trim(),
          fileName: input.fileName?.trim() || null,
          fileUrl: input.fileUrl?.trim() || null,
          mimeType: input.mimeType?.trim() || null,
          notes: input.notes?.trim() || null,
          enabled: input.enabled ?? true,
          modifiedBy: actorId,
          isDeleted: false,
          deletedAt: null,
        };

        if (input.id && existing.some((e) => e.id === input.id)) {
          await tx.enterpriseLenderDocument.update({
            where: { id: input.id },
            data,
          });
        } else {
          await tx.enterpriseLenderDocument.create({
            data: {
              organizationId,
              lenderId,
              ...data,
              createdBy: input.createdBy || actorId,
            },
          });
        }
      }
    });

    return this.listDocuments(organizationId, lenderId);
  }
}

export const lenderContactsDocumentsRepository =
  new LenderContactsDocumentsRepository();

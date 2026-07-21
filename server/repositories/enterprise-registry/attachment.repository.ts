import { prisma } from "@server/lib/prisma";
import type { CreateRegistryAttachmentInput } from "@/types/enterprise-master-data";
import { mapPrismaAttachmentToDomain } from "./mappers";

export class EnterpriseRegistryAttachmentRepository {
  async create(input: CreateRegistryAttachmentInput) {
    const row = await prisma.enterpriseRegistryAttachment.create({
      data: {
        organizationId: input.organizationId,
        registryModule: input.registryModule,
        entityId: input.entityId,
        fileName: input.fileName,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        uploadedBy: input.uploadedBy,
      },
    });
    return mapPrismaAttachmentToDomain(row);
  }

  async listByEntity(
    organizationId: string,
    registryModule: CreateRegistryAttachmentInput["registryModule"],
    entityId: string,
  ) {
    const rows = await prisma.enterpriseRegistryAttachment.findMany({
      where: { organizationId, registryModule, entityId },
      orderBy: { uploadedAt: "desc" },
    });
    return rows.map(mapPrismaAttachmentToDomain);
  }
}

export const enterpriseRegistryAttachmentRepository =
  new EnterpriseRegistryAttachmentRepository();

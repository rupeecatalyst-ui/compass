import type { RegistryImportBatchStatus } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import type { CreateRegistryImportBatchInput } from "@/types/enterprise-master-data";
import { mapPrismaImportBatchToDomain } from "./mappers";

export class EnterpriseRegistryImportBatchRepository {
  async create(input: CreateRegistryImportBatchInput) {
    const row = await prisma.enterpriseRegistryImportBatch.create({
      data: {
        organizationId: input.organizationId,
        registryModule: input.registryModule,
        fileName: input.fileName,
        importedBy: input.importedBy,
      },
    });
    return mapPrismaImportBatchToDomain(row);
  }

  async updateProgress(
    id: string,
    patch: {
      status?: RegistryImportBatchStatus;
      rowCount?: number;
      successCount?: number;
      errorCount?: number;
      errorSummary?: Record<string, unknown>;
      startedAt?: Date;
      completedAt?: Date;
    },
  ) {
    const row = await prisma.enterpriseRegistryImportBatch.update({
      where: { id },
      data: {
        status: patch.status,
        rowCount: patch.rowCount,
        successCount: patch.successCount,
        errorCount: patch.errorCount,
        errorSummary: patch.errorSummary,
        startedAt: patch.startedAt,
        completedAt: patch.completedAt,
      },
    });
    return mapPrismaImportBatchToDomain(row);
  }

  async findById(id: string) {
    const row = await prisma.enterpriseRegistryImportBatch.findUnique({ where: { id } });
    return row ? mapPrismaImportBatchToDomain(row) : null;
  }
}

export const enterpriseRegistryImportBatchRepository =
  new EnterpriseRegistryImportBatchRepository();

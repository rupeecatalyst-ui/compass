import type { RegistryStatus } from "@prisma/client";
import type {
  CreateProductCategoryInput,
  CreateProductGroupInput,
  CreateProductRegistryInput,
  ProductCategoryQuery,
  ProductGroupQuery,
  ProductRegistryQuery,
  UpdateProductCategoryInput,
  UpdateProductGroupInput,
  UpdateProductRegistryInput,
} from "@/types/enterprise-product-registry";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { productRegistryRepository } from "@server/repositories/product-registry/product-registry.repository";
import { enterpriseRegistryAuditService } from "@server/services/enterprise-registry/audit.service";

function auditSnapshot(record: {
  id: string;
  code: string;
  label: string;
  status: RegistryStatus;
  enabled: boolean;
}) {
  return {
    id: record.id,
    code: record.code,
    label: record.label,
    status: record.status,
    enabled: record.enabled,
  };
}

export class ProductRegistryService {
  async queryCategories(query: ProductCategoryQuery) {
    const organizationId = await resolvePilotOrganizationId();
    return productRegistryRepository.queryCategories(organizationId, query);
  }

  async getCategoryById(id: string) {
    return productRegistryRepository.findCategoryById(id);
  }

  async createCategory(input: CreateProductCategoryInput, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const duplicate = await productRegistryRepository.findCategoryByCode(
      organizationId,
      input.code,
    );
    if (duplicate) {
      throw new Error(`Product category "${input.code}" already exists.`);
    }

    const created = await productRegistryRepository.createCategory(organizationId, input);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: created.id,
      entityCode: created.code,
      action: "created",
      newValue: auditSnapshot(created),
      actorUserId: input.createdBy,
      actorName,
    });
    return created;
  }

  async updateCategory(id: string, input: UpdateProductCategoryInput, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await productRegistryRepository.findCategoryById(id);
    if (!existing) throw new Error("Product category not found.");

    const updated = await productRegistryRepository.updateCategory(id, input);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: updated.id,
      entityCode: updated.code,
      action: "updated",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: input.modifiedBy,
      actorName,
    });
    return updated;
  }

  async activateCategory(id: string, actorId: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await productRegistryRepository.findCategoryById(id);
    if (!existing) throw new Error("Product category not found.");

    const updated = await productRegistryRepository.setCategoryStatus(
      id,
      "active",
      actorId,
      true,
    );
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: updated.id,
      entityCode: updated.code,
      action: "activated",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: actorId,
      actorName,
    });
    return updated;
  }

  async deactivateCategory(id: string, actorId: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await productRegistryRepository.findCategoryById(id);
    if (!existing) throw new Error("Product category not found.");

    const updated = await productRegistryRepository.setCategoryStatus(
      id,
      "inactive",
      actorId,
      false,
    );
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: updated.id,
      entityCode: updated.code,
      action: "deactivated",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: actorId,
      actorName,
    });
    return updated;
  }

  async softDeleteCategory(id: string, actorId: string, reason?: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await productRegistryRepository.findCategoryById(id);
    if (!existing) throw new Error("Product category not found.");

    const updated = await productRegistryRepository.softDeleteCategory(id, actorId, reason);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: updated.id,
      entityCode: updated.code,
      action: "soft_deleted",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: actorId,
      actorName,
      reason,
    });
    return updated;
  }

  async queryGroups(query: ProductGroupQuery) {
    const organizationId = await resolvePilotOrganizationId();
    return productRegistryRepository.queryGroups(organizationId, query);
  }

  async getGroupById(id: string) {
    return productRegistryRepository.findGroupById(id);
  }

  async createGroup(input: CreateProductGroupInput, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const category = await productRegistryRepository.findCategoryById(input.categoryId);
    if (!category || category.organizationId !== organizationId) {
      throw new Error("Product category not found.");
    }

    const duplicate = await productRegistryRepository.findGroupByCode(organizationId, input.code);
    if (duplicate) throw new Error(`Product group "${input.code}" already exists.`);

    const created = await productRegistryRepository.createGroup(organizationId, input);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: created.id,
      entityCode: created.code,
      action: "created",
      newValue: auditSnapshot(created),
      actorUserId: input.createdBy,
      actorName,
    });
    return created;
  }

  async updateGroup(id: string, input: UpdateProductGroupInput, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await productRegistryRepository.findGroupById(id);
    if (!existing) throw new Error("Product group not found.");

    if (input.categoryId) {
      const category = await productRegistryRepository.findCategoryById(input.categoryId);
      if (!category || category.organizationId !== organizationId) {
        throw new Error("Product category not found.");
      }
    }

    const updated = await productRegistryRepository.updateGroup(id, input);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: updated.id,
      entityCode: updated.code,
      action: "updated",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: input.modifiedBy,
      actorName,
    });
    return updated;
  }

  async activateGroup(id: string, actorId: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await productRegistryRepository.findGroupById(id);
    if (!existing) throw new Error("Product group not found.");

    const updated = await productRegistryRepository.setGroupStatus(id, "active", actorId, true);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: updated.id,
      entityCode: updated.code,
      action: "activated",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: actorId,
      actorName,
    });
    return updated;
  }

  async deactivateGroup(id: string, actorId: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await productRegistryRepository.findGroupById(id);
    if (!existing) throw new Error("Product group not found.");

    const updated = await productRegistryRepository.setGroupStatus(id, "inactive", actorId, false);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: updated.id,
      entityCode: updated.code,
      action: "deactivated",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: actorId,
      actorName,
    });
    return updated;
  }

  async softDeleteGroup(id: string, actorId: string, reason?: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await productRegistryRepository.findGroupById(id);
    if (!existing) throw new Error("Product group not found.");

    const updated = await productRegistryRepository.softDeleteGroup(id, actorId, reason);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: updated.id,
      entityCode: updated.code,
      action: "soft_deleted",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: actorId,
      actorName,
      reason,
    });
    return updated;
  }

  async queryProducts(query: ProductRegistryQuery) {
    const organizationId = await resolvePilotOrganizationId();
    return productRegistryRepository.queryProducts(organizationId, query);
  }

  async getProductById(id: string) {
    return productRegistryRepository.findProductById(id);
  }

  async createProduct(input: CreateProductRegistryInput, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const category = await productRegistryRepository.findCategoryById(input.categoryId);
    const group = await productRegistryRepository.findGroupById(input.groupId);
    if (!category || category.organizationId !== organizationId) {
      throw new Error("Product category not found.");
    }
    if (!group || group.organizationId !== organizationId || group.categoryId !== category.id) {
      throw new Error("Product group not found for category.");
    }

    const duplicate = await productRegistryRepository.findProductByCode(organizationId, input.code);
    if (duplicate) throw new Error(`Product "${input.code}" already exists.`);

    const created = await productRegistryRepository.createProduct(organizationId, input);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: created.id,
      entityCode: created.code,
      action: "created",
      newValue: auditSnapshot(created),
      actorUserId: input.createdBy,
      actorName,
    });
    return created;
  }

  async updateProduct(id: string, input: UpdateProductRegistryInput, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await productRegistryRepository.findProductById(id);
    if (!existing) throw new Error("Product not found.");

    if (input.categoryId) {
      const category = await productRegistryRepository.findCategoryById(input.categoryId);
      if (!category || category.organizationId !== organizationId) {
        throw new Error("Product category not found.");
      }
    }
    if (input.groupId) {
      const group = await productRegistryRepository.findGroupById(input.groupId);
      const categoryId = input.categoryId ?? existing.categoryId;
      if (!group || group.organizationId !== organizationId || group.categoryId !== categoryId) {
        throw new Error("Product group not found for category.");
      }
    }

    const updated = await productRegistryRepository.updateProduct(id, input);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: updated.id,
      entityCode: updated.code,
      action: "updated",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: input.modifiedBy,
      actorName,
    });
    return updated;
  }

  async activateProduct(id: string, actorId: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await productRegistryRepository.findProductById(id);
    if (!existing) throw new Error("Product not found.");

    const updated = await productRegistryRepository.setProductStatus(id, "active", actorId, true);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: updated.id,
      entityCode: updated.code,
      action: "activated",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: actorId,
      actorName,
    });
    return updated;
  }

  async deactivateProduct(id: string, actorId: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await productRegistryRepository.findProductById(id);
    if (!existing) throw new Error("Product not found.");

    const updated = await productRegistryRepository.setProductStatus(
      id,
      "inactive",
      actorId,
      false,
    );
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: updated.id,
      entityCode: updated.code,
      action: "deactivated",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: actorId,
      actorName,
    });
    return updated;
  }

  async softDeleteProduct(id: string, actorId: string, reason?: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await productRegistryRepository.findProductById(id);
    if (!existing) throw new Error("Product not found.");

    const updated = await productRegistryRepository.softDeleteProduct(id, actorId, reason);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "product",
      entityId: updated.id,
      entityCode: updated.code,
      action: "soft_deleted",
      previousValue: auditSnapshot(existing),
      newValue: auditSnapshot(updated),
      actorUserId: actorId,
      actorName,
      reason,
    });
    return updated;
  }
}

export const productRegistryService = new ProductRegistryService();

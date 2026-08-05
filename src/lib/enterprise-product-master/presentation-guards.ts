/**
 * CO-PR-005 — Guards for presentation canonicalisation (no row deletes).
 */

import {
  classifyProductsForPresentation,
  preferCanonicalSurvivor,
} from "@/lib/enterprise-product-master/presentation-canonical";
import {
  normalizeProductCodeKey,
  resolveProductSelectionFamilyKey,
} from "@/constants/enterprise-product-master";
import type { EnterpriseProductRecord } from "@/types/enterprise-product-registry";
import { productRegistryService } from "@server/services/product-registry/product-registry.service";

export async function assertCreateWouldNotBeLegacyDuplicate(input: {
  code: string;
  label: string;
}): Promise<void> {
  const existing = await productRegistryService.queryProducts({
    pageSize: 500,
    status: "all",
  });
  const family = resolveProductSelectionFamilyKey(input);
  const peers = existing.items.filter(
    (p) =>
      resolveProductSelectionFamilyKey({ code: p.code, label: p.label }) === family,
  );
  if (peers.length === 0) return;

  const candidate = {
    code: input.code,
    label: input.label,
    sortOrder: 9999,
    enabled: true,
  };
  let survivor = peers[0]!;
  for (let i = 1; i < peers.length; i++) {
    survivor = preferCanonicalSurvivor(survivor, peers[i]!);
  }
  const wouldBeSurvivor = preferCanonicalSurvivor(survivor, candidate);
  if (normalizeProductCodeKey(wouldBeSurvivor.code) !== normalizeProductCodeKey(input.code)) {
    throw Object.assign(
      new Error(
        `A canonical Product already exists in this family (${survivor.code}). ` +
          `Manage that Product instead of creating a Legacy / Historical duplicate.`,
      ),
      { statusCode: 409, code: "LEGACY_DUPLICATE_BLOCKED" },
    );
  }
}

export async function assertProductIsCanonicalForAdminMutation(
  productId: string,
): Promise<EnterpriseProductRecord> {
  const existing = await productRegistryService.queryProducts({
    pageSize: 500,
    status: "all",
  });
  const target = existing.items.find((p) => p.id === productId);
  if (!target) {
    throw Object.assign(new Error("Product not found"), {
      statusCode: 404,
      code: "PRODUCT_NOT_FOUND",
    });
  }
  const classified = classifyProductsForPresentation(existing.items);
  const row = classified.find((p) => p.id === productId);
  if (row?.presentationRole === "legacy") {
    throw Object.assign(
      new Error(
        `Product ${target.code} is Legacy / Historical (compatibility only). ` +
          `Manage canonical Product ${row.canonicalSurvivorCode ?? "in this family"} instead.`,
      ),
      { statusCode: 409, code: "LEGACY_PRODUCT_NOT_EDITABLE" },
    );
  }
  return target;
}

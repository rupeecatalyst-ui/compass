/**
 * CO-ADMIN-005 / CO-ADMIN-006 — Product Master admin API client.
 */
import { getAccessToken } from "@/lib/api-client";
import type {
  EnterpriseProductCategoryRecord,
  EnterpriseProductGroupRecord,
  EnterpriseProductRecord,
} from "@/types/enterprise-product-registry";
import { invalidateProductMasterOptionsCache } from "@/lib/enterprise-product-master/options";

async function authHeaders(): Promise<HeadersInit> {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

export async function listProductMaster(params?: {
  search?: string;
  enabled?: string;
  lifecycleStatus?: string;
  /**
   * CO-PR-005 — default `canonical` hides Legacy / Historical duplicates.
   * Pass `all` only for read-only inventory (not for normal administration).
   */
  presentation?: "canonical" | "all";
}): Promise<{ items: EnterpriseProductRecord[]; total: number; presentation?: string }> {
  const qs = new URLSearchParams({
    pageSize: "200",
    sortBy: "sortOrder",
    sortDir: "asc",
    status: "all",
    presentation: params?.presentation ?? "canonical",
    ...(params?.search ? { search: params.search } : {}),
    ...(params?.enabled ? { enabled: params.enabled } : {}),
    ...(params?.lifecycleStatus ? { lifecycleStatus: params.lifecycleStatus } : {}),
  });
  const res = await fetch(`/api/product-registry/products?${qs}`, {
    headers: await authHeaders(),
  });
  return parse(res);
}

export async function listProductCategories(params?: {
  enabled?: string;
  status?: string;
}) {
  const qs = new URLSearchParams({
    pageSize: "100",
    sortBy: "sortOrder",
    sortDir: "asc",
    status: params?.status ?? "all",
    ...(params?.enabled ? { enabled: params.enabled } : {}),
  });
  const res = await fetch(`/api/product-registry/categories?${qs}`, {
    headers: await authHeaders(),
  });
  return parse<{ items: EnterpriseProductCategoryRecord[]; total: number }>(res);
}

export async function listProductGroups(categoryId?: string, params?: { enabled?: string }) {
  const qs = new URLSearchParams({
    pageSize: "100",
    sortBy: "sortOrder",
    sortDir: "asc",
    status: "all",
    ...(categoryId ? { categoryId } : {}),
    ...(params?.enabled ? { enabled: params.enabled } : {}),
  });
  const res = await fetch(`/api/product-registry/groups?${qs}`, {
    headers: await authHeaders(),
  });
  return parse<{ items: EnterpriseProductGroupRecord[]; total: number }>(res);
}

export async function createProductCategory(body: Record<string, unknown>) {
  const res = await fetch("/api/product-registry/categories", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parse<EnterpriseProductCategoryRecord>(res);
  invalidateProductMasterOptionsCache();
  return data;
}

export async function updateProductCategory(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/product-registry/categories/${id}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parse<EnterpriseProductCategoryRecord>(res);
  invalidateProductMasterOptionsCache();
  return data;
}

export async function activateProductCategory(id: string) {
  const res = await fetch(`/api/product-registry/categories/${id}/activate`, {
    method: "POST",
    headers: await authHeaders(),
  });
  return parse<EnterpriseProductCategoryRecord>(res);
}

export async function deactivateProductCategory(id: string) {
  const res = await fetch(`/api/product-registry/categories/${id}/deactivate`, {
    method: "POST",
    headers: await authHeaders(),
  });
  return parse<EnterpriseProductCategoryRecord>(res);
}

export async function deleteProductCategory(id: string, reason?: string) {
  const res = await fetch(`/api/product-registry/categories/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
    body: JSON.stringify({ reason }),
  });
  return parse<EnterpriseProductCategoryRecord>(res);
}

export async function createProductGroup(body: Record<string, unknown>) {
  const res = await fetch("/api/product-registry/groups", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parse<EnterpriseProductGroupRecord>(res);
  invalidateProductMasterOptionsCache();
  return data;
}

export async function updateProductGroup(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/product-registry/groups/${id}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parse<EnterpriseProductGroupRecord>(res);
  invalidateProductMasterOptionsCache();
  return data;
}

export async function activateProductGroup(id: string) {
  const res = await fetch(`/api/product-registry/groups/${id}/activate`, {
    method: "POST",
    headers: await authHeaders(),
  });
  return parse<EnterpriseProductGroupRecord>(res);
}

export async function deactivateProductGroup(id: string) {
  const res = await fetch(`/api/product-registry/groups/${id}/deactivate`, {
    method: "POST",
    headers: await authHeaders(),
  });
  return parse<EnterpriseProductGroupRecord>(res);
}

export async function deleteProductGroup(id: string, reason?: string) {
  const res = await fetch(`/api/product-registry/groups/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
    body: JSON.stringify({ reason }),
  });
  return parse<EnterpriseProductGroupRecord>(res);
}

export async function createProductMaster(body: Record<string, unknown>) {
  const res = await fetch("/api/product-registry/products", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parse<EnterpriseProductRecord>(res);
  invalidateProductMasterOptionsCache();
  return data;
}

export async function updateProductMaster(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/product-registry/products/${id}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parse<EnterpriseProductRecord>(res);
  invalidateProductMasterOptionsCache();
  return data;
}

export async function activateProductMaster(id: string) {
  const res = await fetch(`/api/product-registry/products/${id}/activate`, {
    method: "POST",
    headers: await authHeaders(),
  });
  const data = await parse<EnterpriseProductRecord>(res);
  invalidateProductMasterOptionsCache();
  return data;
}

export async function deactivateProductMaster(id: string) {
  const res = await fetch(`/api/product-registry/products/${id}/deactivate`, {
    method: "POST",
    headers: await authHeaders(),
  });
  const data = await parse<EnterpriseProductRecord>(res);
  invalidateProductMasterOptionsCache();
  return data;
}

export async function archiveProductMaster(id: string, reason?: string) {
  const res = await fetch(`/api/product-registry/products/${id}/archive`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ reason }),
  });
  const data = await parse<EnterpriseProductRecord>(res);
  invalidateProductMasterOptionsCache();
  return data;
}

export async function duplicateProductMaster(id: string, code: string, label?: string) {
  const res = await fetch(`/api/product-registry/products/${id}/duplicate`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ code, label }),
  });
  const data = await parse<EnterpriseProductRecord>(res);
  invalidateProductMasterOptionsCache();
  return data;
}

export async function seedCanonicalProducts() {
  const res = await fetch("/api/product-registry/seed", {
    method: "POST",
    headers: await authHeaders(),
  });
  return parse<{ product: { products: { created: number; updated: number; skipped: number } } }>(
    res,
  );
}

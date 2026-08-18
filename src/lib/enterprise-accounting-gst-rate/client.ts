import { authenticatedJsonFetch } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type { EnterpriseAccountingGstRateDto } from "@/types/enterprise-accounting-gst-rate";

async function read<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error?.message ?? "GST Rate request failed");
  }
  return body.data;
}

export const accountingGstRateApiClient = {
  async list(query?: { activeOnly?: boolean }) {
    const params = new URLSearchParams();
    if (query?.activeOnly) params.set("activeOnly", "true");
    const qs = params.toString();
    const data = await read<{ items: EnterpriseAccountingGstRateDto[] }>(
      await authenticatedJsonFetch(`/api/admin/accounting/gst-rates${qs ? `?${qs}` : ""}`),
    );
    return data.items ?? [];
  },

  async create(body: Record<string, unknown>) {
    return read<EnterpriseAccountingGstRateDto>(
      await authenticatedJsonFetch("/api/admin/accounting/gst-rates", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  },

  async update(id: string, body: Record<string, unknown>) {
    return read<EnterpriseAccountingGstRateDto>(
      await authenticatedJsonFetch(`/api/admin/accounting/gst-rates/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    );
  },
};

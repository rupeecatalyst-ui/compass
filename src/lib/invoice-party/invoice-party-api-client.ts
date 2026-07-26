/**
 * Browser client — Accounting Invoice Party Master (Deal Invoice Party source).
 */
import { authenticatedJsonFetch } from "@/lib/api-client";

export type InvoicePartyRecord = {
  id: string;
  displayName: string;
  legalName: string;
  billingName: string;
  partyType: string;
  /** @deprecated */
  payeeType?: string;
  contactId?: string | null;
  companyId?: string | null;
  gstin?: string | null;
  pan?: string | null;
  billingAddress?: string | null;
  stateLabel?: string | null;
  invoiceEmail?: string | null;
  tdsApplicable: boolean;
  tdsRatePercent?: number | null;
  gstStatus?: string | null;
  enabled: boolean;
  contact?: { id: string; name: string; mobilePrimary?: string } | null;
  company?: { id: string; companyName: string } | null;
};

/** @deprecated */
export type AccountingPayeeRecord = InvoicePartyRecord;

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

async function partyFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedJsonFetch(url, init);
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || !body.success) {
    const err = new Error(body?.error?.message || `Invoice Party API failed (${res.status})`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = body?.error?.code;
    throw err;
  }
  return body.data as T;
}

export const invoicePartyApiClient = {
  async listActive(): Promise<InvoicePartyRecord[]> {
    const data = await partyFetch<{ items: InvoicePartyRecord[] }>(
      "/api/invoice-parties?activeOnly=true",
    );
    return data.items ?? [];
  },

  async list(q?: string): Promise<InvoicePartyRecord[]> {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const data = await partyFetch<{ items: InvoicePartyRecord[] }>(
      `/api/invoice-parties?${params.toString()}`,
    );
    return data.items ?? [];
  },

  async create(body: Record<string, unknown>): Promise<InvoicePartyRecord> {
    return partyFetch("/api/invoice-parties", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async update(id: string, body: Record<string, unknown>): Promise<InvoicePartyRecord> {
    return partyFetch(`/api/invoice-parties/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
};

/** @deprecated */
export const accountingPayeeApiClient = invoicePartyApiClient;

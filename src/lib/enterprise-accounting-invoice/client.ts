import { authenticatedJsonFetch } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  ApplyInvoiceSignatureInput,
  EnterpriseAccountingInvoiceDto,
  RaiseEnterpriseAccountingInvoiceInput,
  SendEnterpriseAccountingInvoiceInput,
} from "@/types/enterprise-accounting-invoice";
import type { DerivedAccountingPaymentSummary } from "@/types/enterprise-accounting-payment";

async function read<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error?.message ?? "Accounting Invoice request failed");
  }
  return body.data;
}

export const enterpriseAccountingInvoiceClient = {
  async list() {
    const data = await read<{
      items: EnterpriseAccountingInvoiceDto[];
      summary: DerivedAccountingPaymentSummary;
    }>(await authenticatedJsonFetch("/api/accounting-invoices"));
    return {
      items: data.items ?? [],
      summary: data.summary,
    };
  },

  async get(invoiceId: string) {
    return read<EnterpriseAccountingInvoiceDto>(
      await authenticatedJsonFetch(`/api/accounting-invoices/${encodeURIComponent(invoiceId)}`),
    );
  },

  async raise(input: RaiseEnterpriseAccountingInvoiceInput) {
    return read<EnterpriseAccountingInvoiceDto>(
      await authenticatedJsonFetch("/api/accounting-invoices", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  },

  async applySignature(input: ApplyInvoiceSignatureInput) {
    return read<EnterpriseAccountingInvoiceDto>(
      await authenticatedJsonFetch(
        `/api/accounting-invoices/${encodeURIComponent(input.invoiceId)}/signature`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
    );
  },

  async send(input: SendEnterpriseAccountingInvoiceInput) {
    return read<EnterpriseAccountingInvoiceDto>(
      await authenticatedJsonFetch(
        `/api/accounting-invoices/${encodeURIComponent(input.invoiceId)}/send`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
    );
  },

  async downloadPdf(invoiceId: string): Promise<Blob> {
    const response = await authenticatedJsonFetch(
      `/api/accounting-invoices/${encodeURIComponent(invoiceId)}/pdf`,
    );
    if (!response.ok) {
      let message = "PDF download failed";
      try {
        const body = (await response.json()) as ApiResponse<unknown>;
        message = body.error?.message ?? message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    return response.blob();
  },
};

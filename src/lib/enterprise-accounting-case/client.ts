import { authenticatedJsonFetch } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  ConfirmPostDisbursementInput,
  EnterpriseAccountingCaseQuery,
  UpdateEnterpriseAccountingCaseInput,
} from "@/types/enterprise-accounting-case";

export type EnterpriseAccountingCaseDealDto = {
  dealNumber?: string | null;
  opportunityId?: string | null;
  primaryContactName?: string | null;
  productLabel?: string | null;
  primaryCounterpartyName?: string | null;
  invoicePartyId?: string | null;
  invoiceParty?: {
    id: string;
    displayName: string;
    gstin?: string | null;
    tdsApplicable?: boolean;
    tdsRatePercent?: number | null;
  } | null;
};

export type EnterpriseAccountingCaseDto = Record<string, unknown> & {
  id: string;
  dealId: string;
  rowVersion: number;
  deal?: EnterpriseAccountingCaseDealDto | null;
};

async function read<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error?.message ?? "Accounting Case request failed");
  }
  return body.data;
}

export const enterpriseAccountingCaseClient = {
  async list(query: EnterpriseAccountingCaseQuery = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    return read<{
      items: EnterpriseAccountingCaseDto[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(
      await authenticatedJsonFetch(
        `/api/accounting-cases${params.size ? `?${params.toString()}` : ""}`,
      ),
    );
  },

  async get(caseId: string) {
    return read<EnterpriseAccountingCaseDto>(
      await authenticatedJsonFetch(`/api/accounting-cases/${encodeURIComponent(caseId)}`),
    );
  },

  async update(caseId: string, input: UpdateEnterpriseAccountingCaseInput) {
    return read<EnterpriseAccountingCaseDto>(
      await authenticatedJsonFetch(`/api/accounting-cases/${encodeURIComponent(caseId)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    );
  },

  async confirm(dealId: string, input: ConfirmPostDisbursementInput) {
    return read<{
      dealId: string;
      accountingCaseId: string;
      rowVersion: number;
      confirmedAt: string;
    }>(
      await authenticatedJsonFetch(
        `/api/enterprise-deals/${encodeURIComponent(dealId)}/post-disbursement-confirmation`,
        { method: "PATCH", body: JSON.stringify(input) },
      ),
    );
  },
};

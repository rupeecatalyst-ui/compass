import { authenticatedJsonFetch } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  CreateEnterpriseAccountingCreditNoteInput,
  EnterpriseAccountingCreditNoteDto,
} from "@/types/enterprise-accounting-credit-note";

async function read<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error?.message ?? "Accounting Credit Note request failed");
  }
  return body.data;
}

export const enterpriseAccountingCreditNoteClient = {
  async create(input: CreateEnterpriseAccountingCreditNoteInput) {
    return read<EnterpriseAccountingCreditNoteDto>(
      await authenticatedJsonFetch("/api/accounting-credit-notes", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  },
};

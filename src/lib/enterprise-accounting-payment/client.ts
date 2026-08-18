import { authenticatedJsonFetch } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  EnterpriseAccountingPaymentDto,
  PostEnterpriseAccountingPaymentInput,
  VoidEnterpriseAccountingPaymentInput,
} from "@/types/enterprise-accounting-payment";

async function read<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error?.message ?? "Accounting Payment request failed");
  }
  return body.data;
}

export const enterpriseAccountingPaymentClient = {
  async post(input: PostEnterpriseAccountingPaymentInput) {
    return read<EnterpriseAccountingPaymentDto>(
      await authenticatedJsonFetch("/api/accounting-payments", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  },

  async void(paymentId: string, input: VoidEnterpriseAccountingPaymentInput) {
    return read<EnterpriseAccountingPaymentDto>(
      await authenticatedJsonFetch(
        `/api/accounting-payments/${encodeURIComponent(paymentId)}/void`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
    );
  },
};

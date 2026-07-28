/**
 * CO-LEND-001 — Browser client for Lender Program Portal APIs.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  LenderProgramPortalInvite,
  LenderProgramSubmission,
  LenderProgramVerifier,
  LenderProgramPayload,
  LenderProgramDocumentLink,
} from "@/types/lender-program-portal";

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

async function parse<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as Envelope<T> & {
    meta?: { otpPreview?: string };
  };
  if (!res.ok || !body.success) {
    const err = new Error(body.error?.message || `Request failed (${res.status})`) as Error & {
      code?: string;
      otpPreview?: string;
    };
    err.code = body.error?.code;
    if ((body as { otpPreview?: string }).otpPreview) {
      err.otpPreview = (body as { otpPreview?: string }).otpPreview;
    }
    // Attach otp preview from meta if present
    const meta = (body as { data?: { otpPreview?: string } }).data;
    if (meta && typeof meta === "object" && "otpPreview" in (meta as object)) {
      err.otpPreview = (meta as { otpPreview?: string }).otpPreview;
    }
    throw err;
  }
  return body.data as T;
}

export const lenderProgramPortalClient = {
  async createInvite(input: {
    lenderId: string;
    ttlDays?: number;
    maxUses?: number | null;
    notes?: string;
  }): Promise<LenderProgramPortalInvite> {
    const res = await authenticatedJsonFetch("/api/admin/lender-program-portal/invites", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return parse(res);
  },

  async listInvites(): Promise<LenderProgramPortalInvite[]> {
    const res = await authenticatedJsonFetch("/api/admin/lender-program-portal/invites");
    const data = await parse<{ items: LenderProgramPortalInvite[] }>(res);
    return data.items;
  },

  async revokeInvite(inviteId: string, reason?: string): Promise<void> {
    const res = await authenticatedJsonFetch(
      `/api/admin/lender-program-portal/invites/${inviteId}/revoke`,
      { method: "POST", body: JSON.stringify({ reason }) },
    );
    await parse(res);
  },

  async listSubmissions(status?: string): Promise<LenderProgramSubmission[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await authenticatedJsonFetch(
      `/api/admin/lender-program-portal/submissions${q}`,
    );
    const data = await parse<{ items: LenderProgramSubmission[] }>(res);
    return data.items;
  },

  async getSubmission(id: string): Promise<LenderProgramSubmission> {
    const res = await authenticatedJsonFetch(
      `/api/admin/lender-program-portal/submissions/${id}`,
    );
    return parse(res);
  },

  async reviewSubmission(
    id: string,
    action: "approve" | "reject" | "clarify" | "publish" | "schedule" | "save_draft",
    body?: {
      comments?: string;
      clarificationNotes?: string;
      rejectionReason?: string;
      schedulePublishAt?: string;
    },
  ): Promise<LenderProgramSubmission> {
    const res = await authenticatedJsonFetch(
      `/api/admin/lender-program-portal/submissions/${id}/review`,
      { method: "POST", body: JSON.stringify({ action, ...body }) },
    );
    return parse(res);
  },
};

/** Public (unauthenticated) portal client — token in path/body. */
export const lenderProgramPortalPublicClient = {
  async resolve(token: string): Promise<{
    lenderId: string;
    lenderName: string;
    inviteId: string;
    expiresAt: string;
    otpRequired: boolean;
    otpVerified: boolean;
    products: Array<{ code: string; label: string }>;
  }> {
    const res = await fetch(
      `/api/lender-program-portal/${encodeURIComponent(token)}`,
    );
    return parse(res);
  },

  async requestOtp(
    token: string,
    verifier: LenderProgramVerifier,
  ): Promise<{
    ok: true;
    emailOtpPreview?: string;
    mobileOtpPreview?: string;
    otpPreview?: string;
  }> {
    const res = await fetch(
      `/api/lender-program-portal/${encodeURIComponent(token)}/otp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifier),
      },
    );
    return parse(res);
  },

  async verifyOtp(
    token: string,
    input: { emailCode: string; mobileCode: string } | string,
  ): Promise<{ ok: true; emailVerified?: boolean; mobileVerified?: boolean }> {
    const body =
      typeof input === "string"
        ? { code: input }
        : { emailCode: input.emailCode, mobileCode: input.mobileCode };
    const res = await fetch(
      `/api/lender-program-portal/${encodeURIComponent(token)}/otp/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return parse(res);
  },

  async submit(
    token: string,
    input: {
      productCode: string;
      programName: string;
      payload: LenderProgramPayload;
      documentLinks?: LenderProgramDocumentLink[];
      verifier: LenderProgramVerifier;
    },
  ): Promise<LenderProgramSubmission> {
    const res = await fetch(
      `/api/lender-program-portal/${encodeURIComponent(token)}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    return parse(res);
  },
};

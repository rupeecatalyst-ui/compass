/**
 * CO-AI-ACCESS-001 — Reject unauthenticated user identity hints on integration routes.
 */

const SPOOF_HEADERS = [
  "x-user-id",
  "x-catalyst-user-id",
  "x-impersonate-user-id",
] as const;

export type IdentitySpoofRejection = {
  code: "IDENTITY_SPOOFING_REJECTED";
  message: string;
};

export function rejectSpoofedUserIdentity(request: Request): IdentitySpoofRejection | null {
  const url = new URL(request.url);
  if (url.searchParams.has("userId") || url.searchParams.has("user_id")) {
    return {
      code: "IDENTITY_SPOOFING_REJECTED",
      message: "userId query parameters are not accepted on ChatGPT integration endpoints.",
    };
  }

  for (const header of SPOOF_HEADERS) {
    if (request.headers.get(header)?.trim()) {
      return {
        code: "IDENTITY_SPOOFING_REJECTED",
        message: "User identity headers are not accepted without authenticated JWT proof.",
      };
    }
  }

  return null;
}

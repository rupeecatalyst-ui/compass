/**
 * CO-MARKETING-HOSTINGER-SMTP-001 — Injected SMTP transport. Network is never implied.
 */

export type MarketingSmtpMessage = {
  to: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

export type MarketingSmtpTransportResult = {
  accepted: boolean;
  providerMessageId: string | null;
  retryable: boolean;
  errorCode?: string | null;
};

export type MarketingSmtpVerifyResult = {
  status: "CONNECTED" | "FAILED" | "NOT_CONFIGURED" | "BLOCKED";
  code: string | null;
  notice: string;
};

export type MarketingSmtpTransport = {
  send(message: MarketingSmtpMessage): Promise<MarketingSmtpTransportResult>;
  verify(): Promise<MarketingSmtpVerifyResult>;
};

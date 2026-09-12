/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 / HOSTINGER-SMTP-001 — Provider-neutral live-email readiness.
 * Reports configuration presence only. Never reads or echoes secret values. Never connects.
 */

import {
  ENTERPRISE_MARKETING_EMAIL_MODE,
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
  MARKETING_EMAIL_PROVIDER_ENV_KEYS,
} from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_PHASE1_FROM_EMAIL,
  MARKETING_PHASE1_FROM_NAME,
  MARKETING_PHASE1_LIVE_RECIPIENT_CEILING,
  MARKETING_PHASE1_REPLY_TO,
  MARKETING_SMTP_BLOCK,
  MARKETING_SMTP_ENV,
} from "@/constants/enterprise-marketing-engine/hostinger-smtp";
import {
  MARKETING_LIVE_ADAPTER_EXECUTION_BLOCKED,
  MARKETING_LIVE_ADAPTER_NOT_CONNECTED,
  MARKETING_LIVE_PROVIDER_DECISION_REQUIRED,
  MARKETING_LIVE_PROVIDER_NOTICE,
  MARKETING_LIVE_PROVIDER_STATUS,
  MARKETING_PROVIDER_CONNECT_BLOCKED,
  MARKETING_PROVIDER_VERIFICATION_AWAITING,
} from "@/constants/enterprise-marketing-engine/live-email-provider";
import { MARKETING_UNSUBSCRIBE_SECRET_ENV } from "@/constants/enterprise-marketing-engine/unsubscribe";
import { assessMarketingSmtpConfig } from "@/lib/enterprise-marketing-engine/smtp-config";

export type MarketingProviderEnvPresence = {
  resend: boolean;
  sendgrid: boolean;
  ses: boolean;
  smtp: boolean;
};

function envPresent(name: string): boolean {
  if (typeof process === "undefined") return false;
  return Boolean((process.env[name] ?? "").trim());
}

export function readMarketingProviderEnvPresence(): MarketingProviderEnvPresence {
  return {
    resend: envPresent(MARKETING_EMAIL_PROVIDER_ENV_KEYS.resend),
    sendgrid: envPresent(MARKETING_EMAIL_PROVIDER_ENV_KEYS.sendgrid),
    ses: envPresent(MARKETING_EMAIL_PROVIDER_ENV_KEYS.ses),
    smtp: envPresent(MARKETING_EMAIL_PROVIDER_ENV_KEYS.smtp),
  };
}

export type MarketingLiveEmailProviderReadiness = {
  emailMode: typeof ENTERPRISE_MARKETING_EMAIL_MODE;
  executionEnabled: false;
  providerConnectEnabled: false;
  dryRunActive: boolean;
  liveSendAuthorized: false;
  canConnect: false;
  canLiveSend: false;
  providerDecisionRequired: false;
  providerStatus: typeof MARKETING_LIVE_PROVIDER_STATUS;
  selectedProvider: "smtp";
  phase1LiveRecipientCeiling: typeof MARKETING_PHASE1_LIVE_RECIPIENT_CEILING;
  phase1Sender: {
    fromName: typeof MARKETING_PHASE1_FROM_NAME;
    fromEmail: typeof MARKETING_PHASE1_FROM_EMAIL;
    replyTo: typeof MARKETING_PHASE1_REPLY_TO;
  };
  credentialConfigured: MarketingProviderEnvPresence;
  anyCredentialPresent: boolean;
  smtp: ReturnType<typeof assessMarketingSmtpConfig>;
  unsubscribeSecretPresent: boolean;
  publicOriginPresent: boolean;
  providerVerificationState: typeof MARKETING_PROVIDER_VERIFICATION_AWAITING;
  blockedReasons: string[];
  notice: string;
};

export function assessMarketingLiveEmailProviderReadiness(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): MarketingLiveEmailProviderReadiness {
  const credentialConfigured = {
    resend: Boolean((env[MARKETING_EMAIL_PROVIDER_ENV_KEYS.resend] ?? "").trim()),
    sendgrid: Boolean((env[MARKETING_EMAIL_PROVIDER_ENV_KEYS.sendgrid] ?? "").trim()),
    ses: Boolean((env[MARKETING_EMAIL_PROVIDER_ENV_KEYS.ses] ?? "").trim()),
    smtp: Boolean((env[MARKETING_EMAIL_PROVIDER_ENV_KEYS.smtp] ?? "").trim()),
  };
  const anyCredentialPresent = Object.values(credentialConfigured).some(Boolean);
  const smtp = assessMarketingSmtpConfig(env);
  const unsubscribeSecretPresent = Boolean((env[MARKETING_UNSUBSCRIBE_SECRET_ENV] ?? "").trim());
  const publicOriginPresent = Boolean(
    (env.NEXT_PUBLIC_APP_URL ?? env.NEXTAUTH_URL ?? env.APP_URL ?? "").trim(),
  );
  const dryRunActive = ENTERPRISE_MARKETING_EMAIL_MODE !== "off";
  const blockedReasons = [
    MARKETING_LIVE_ADAPTER_EXECUTION_BLOCKED,
    MARKETING_PROVIDER_CONNECT_BLOCKED,
    MARKETING_LIVE_ADAPTER_NOT_CONNECTED,
    MARKETING_SMTP_BLOCK.executionDisabled,
    MARKETING_SMTP_BLOCK.providerConnectDisabled,
    ...smtp.blockers,
  ];
  if (!unsubscribeSecretPresent) blockedReasons.push(MARKETING_SMTP_BLOCK.unsubscribeSecretMissing);
  if (!publicOriginPresent) blockedReasons.push(MARKETING_SMTP_BLOCK.publicOriginMissing);
  return {
    emailMode: ENTERPRISE_MARKETING_EMAIL_MODE,
    executionEnabled: false,
    providerConnectEnabled: false,
    dryRunActive,
    liveSendAuthorized: false,
    canConnect: false,
    canLiveSend: false,
    providerDecisionRequired: MARKETING_LIVE_PROVIDER_DECISION_REQUIRED,
    providerStatus: MARKETING_LIVE_PROVIDER_STATUS,
    selectedProvider: "smtp",
    phase1LiveRecipientCeiling: MARKETING_PHASE1_LIVE_RECIPIENT_CEILING,
    phase1Sender: {
      fromName: MARKETING_PHASE1_FROM_NAME,
      fromEmail: MARKETING_PHASE1_FROM_EMAIL,
      replyTo: MARKETING_PHASE1_REPLY_TO,
    },
    credentialConfigured,
    anyCredentialPresent,
    smtp,
    unsubscribeSecretPresent,
    publicOriginPresent,
    providerVerificationState: MARKETING_PROVIDER_VERIFICATION_AWAITING,
    blockedReasons,
    notice: MARKETING_LIVE_PROVIDER_NOTICE,
  };
}

export function marketingLiveEmailFallbackIsDryRun(): boolean {
  if (ENTERPRISE_MARKETING_EMAIL_MODE === "off") return false;
  if (ENTERPRISE_MARKETING_EMAIL_MODE === "live") return false;
  return true;
}

export { MARKETING_SMTP_ENV };

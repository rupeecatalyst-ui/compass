/**
 * CO-INV-001 — Professional invitation email templates (Rupee Catalyst branding).
 */
import type { InvitationEmailPayload } from "@/types/enterprise-invitation-engine";

export interface BuildInvitationEmailInput {
  recipientName: string;
  recipientEmail: string;
  inviteeKindLabel: string;
  activationUrl: string;
  expiresAtIso: string;
  fromDisplayName: string;
  fromEmail: string;
  supportEmail: string;
  supportPhone?: string | null;
  brandLogoUrl?: string | null;
  organizationName?: string;
}

function formatExpiry(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function buildInvitationEmail(input: BuildInvitationEmailInput): InvitationEmailPayload {
  const org = input.organizationName || "Rupee Catalyst";
  const expiry = formatExpiry(input.expiresAtIso);
  const supportLine = [
    input.supportEmail,
    input.supportPhone ? `Phone: ${input.supportPhone}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const subject = `You're invited to join ${org} as a ${input.inviteeKindLabel}`;

  const text = [
    `Dear ${input.recipientName},`,
    "",
    `Welcome to ${org}.`,
    "",
    `You have been invited to activate your ${input.inviteeKindLabel} account on Catalyst Connect.`,
    "",
    `Activate your account: ${input.activationUrl}`,
    "",
    `This secure link expires on ${expiry} and can be used once.`,
    "",
    `If you did not expect this invitation, please ignore this email or contact support (${supportLine}).`,
    "",
    `Regards,`,
    `${input.fromDisplayName}`,
    org,
  ].join("\n");

  const logoBlock = input.brandLogoUrl
    ? `<img src="${input.brandLogoUrl}" alt="${org}" width="160" style="display:block;margin:0 auto 20px;max-width:160px;height:auto;" />`
    : `<div style="font-size:22px;font-weight:700;color:#0f766e;text-align:center;margin-bottom:16px;">${org}</div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f7f7;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 28px 8px;">${logoBlock}</td></tr>
        <tr><td style="padding:0 28px 8px;">
          <h1 style="margin:0 0 8px;font-size:20px;line-height:1.35;color:#0f172a;">Welcome, ${escapeHtml(input.recipientName)}</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#334155;">
            You have been invited to activate your <strong>${escapeHtml(input.inviteeKindLabel)}</strong> account with ${escapeHtml(org)}.
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:#334155;">
            Click the button below to create your password, accept Terms &amp; Conditions, and complete your profile.
          </p>
          <p style="text-align:center;margin:0 0 24px;">
            <a href="${input.activationUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;">
              Activate Account
            </a>
          </p>
          <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#64748b;">
            This secure link expires on <strong>${escapeHtml(expiry)}</strong> (IST) and is single-use.
          </p>
          <p style="margin:0 0 20px;font-size:11px;line-height:1.5;color:#94a3b8;word-break:break-all;">
            If the button does not work, open this URL:<br/>${escapeHtml(input.activationUrl)}
          </p>
        </td></tr>
        <tr><td style="padding:16px 28px 28px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">
            Need help? Contact support: ${escapeHtml(supportLine)}
          </p>
          <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">
            ${escapeHtml(input.fromDisplayName)} · ${escapeHtml(org)}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject,
    html,
    text,
    fromDisplayName: input.fromDisplayName,
    fromEmail: input.fromEmail,
    toEmail: input.recipientEmail,
    toName: input.recipientName,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

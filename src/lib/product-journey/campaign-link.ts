import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Opaque campaign-recipient token.
 * The payload identifies the campaign and recipient. It never contains an email address.
 */

export type CampaignRecipientClaims = {
  v: 1;
  kind: "campaign-recipient";
  campaignId: string;
  recipientRef: string;
  productCode: string;
  sourceCode: string;
  campaignLabel: string;
  exp: number;
};

export type CampaignIdentityDecision = "matched" | "separate" | "conflict";

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromB64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(`campaign-recipient.${body}`).digest("base64url");
}

function signaturesMatch(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issueCampaignRecipientToken(
  input: {
    campaignId: string;
    recipientRef: string;
    productCode: string;
    sourceCode: string;
    campaignLabel: string;
    ttlSec?: number;
  },
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): string {
  if (!secret.trim()) throw new Error("CAMPAIGN_LINK_SECRET_MISSING");
  const payload: CampaignRecipientClaims = {
    v: 1,
    kind: "campaign-recipient",
    campaignId: input.campaignId,
    recipientRef: input.recipientRef,
    productCode: input.productCode,
    sourceCode: input.sourceCode,
    campaignLabel: input.campaignLabel,
    exp: nowSec + (input.ttlSec ?? 60 * 60 * 24 * 14),
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

export function verifyCampaignRecipientToken(
  token: string,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): CampaignRecipientClaims {
  if (!secret.trim()) throw new Error("CAMPAIGN_LINK_SECRET_MISSING");
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("CAMPAIGN_TOKEN_INVALID");
  const [body, sig] = parts;
  if (!signaturesMatch(sig, sign(body, secret))) throw new Error("CAMPAIGN_TOKEN_INVALID");
  let claims: CampaignRecipientClaims;
  try {
    claims = JSON.parse(fromB64url(body)) as CampaignRecipientClaims;
  } catch {
    throw new Error("CAMPAIGN_TOKEN_INVALID");
  }
  if (claims.kind !== "campaign-recipient" || claims.v !== 1) throw new Error("CAMPAIGN_TOKEN_INVALID");
  if (!claims.campaignId || !claims.recipientRef || !claims.productCode) {
    throw new Error("CAMPAIGN_TOKEN_INVALID");
  }
  if (!claims.exp || claims.exp < nowSec) throw new Error("CAMPAIGN_TOKEN_EXPIRED");
  if (JSON.stringify(claims).includes("@")) throw new Error("CAMPAIGN_TOKEN_INVALID");
  return claims;
}

export function campaignTokenContainsEmail(token: string): boolean {
  return token.includes("@");
}

function mobileDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").slice(-10);
}

/**
 * A forwarded link must not attach the visitor to the original recipient.
 * Matching mobiles may continue as that recipient. A different mobile conflicts.
 * A recipient with no mobile on file stays unbound.
 */
export function decideCampaignIdentity(input: {
  recipientMobile: string | null;
  enteredMobile: string;
}): CampaignIdentityDecision {
  const known = mobileDigits(input.recipientMobile);
  const entered = mobileDigits(input.enteredMobile);
  if (!known) return "separate";
  if (known === entered) return "matched";
  return "conflict";
}

export function knownCampaignEmailMaySkipEntry(input: {
  decision: CampaignIdentityDecision;
  emailOnFile: string | null;
}): { skip: boolean; independentlyVerified: false } {
  const email = (input.emailOnFile ?? "").trim();
  const usable = input.decision === "matched" && email.includes("@");
  return { skip: usable, independentlyVerified: false };
}

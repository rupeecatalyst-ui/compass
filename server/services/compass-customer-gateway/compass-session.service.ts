import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { CompassJourneyError } from "./compass-journey-errors";
import type {
  CompassJourneySessionClaims,
  CompassProductCode,
} from "@/types/compass-customer-gateway";

const DEFAULT_TTL_SEC = 60 * 60 * 24; // 24h

function secret(): string {
  const s =
    process.env.COMPASS_JOURNEY_SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!s) {
    throw new Error("COMPASS_JOURNEY_SESSION_SECRET is not configured");
  }
  return s;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

export function issueCompassJourneyToken(input: {
  journeyRef: string;
  contactRef: string;
  opportunityRef: string;
  productCode: CompassProductCode;
  ttlSec?: number;
}): string {
  const sid = randomBytes(16).toString("hex");
  const exp = Math.floor(Date.now() / 1000) + (input.ttlSec ?? DEFAULT_TTL_SEC);
  const payload: CompassJourneySessionClaims = {
    sid,
    journeyRef: input.journeyRef,
    contactRef: input.contactRef,
    opportunityRef: input.opportunityRef,
    productCode: input.productCode,
    exp,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyCompassJourneyToken(token: string): CompassJourneySessionClaims {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new CompassJourneyError("INVALID_SESSION", "Your session is invalid. Please restart the journey.", 401);
  }
  const [body, sig] = parts;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new CompassJourneyError("INVALID_SESSION", "Your session is invalid. Please restart the journey.", 401);
  }
  let claims: CompassJourneySessionClaims;
  try {
    claims = JSON.parse(fromB64url(body).toString("utf8")) as CompassJourneySessionClaims;
  } catch {
    throw new CompassJourneyError("INVALID_SESSION", "Your session is invalid. Please restart the journey.", 401);
  }
  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) {
    throw new CompassJourneyError("SESSION_EXPIRED", "Your session has expired. Please restart the journey.", 401);
  }
  return claims;
}

export function newJourneyRef(): string {
  return `cjg_${randomBytes(12).toString("hex")}`;
}

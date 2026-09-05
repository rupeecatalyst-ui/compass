/**
 * Non-deployable visual harness — never calls fetch, Hostinger, Google, or a provider.
 */
import { resolveMarketingFixture } from "../fixture-data.js";

export async function authenticatedJsonFetch(url, init) {
  if (typeof url !== "string") {
    throw new Error("visual harness blocked non-string request");
  }
  if (/hostinger|googleapis|google\.com|smtp|twilio|whatsapp/i.test(url)) {
    throw new Error(`visual harness blocked external request: ${url}`);
  }
  return resolveMarketingFixture(url, init);
}

export function getAccessToken() {
  return null;
}

export function getRefreshToken() {
  return null;
}

export async function apiRequest() {
  throw new Error("visual harness blocked axios apiRequest");
}

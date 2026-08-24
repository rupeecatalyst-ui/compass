import { NextResponse } from "next/server";
import { beginOAuthAuthorization } from "@server/services/chatgpt-integration/chatgpt-oauth.service";
import { mapOAuthRouteError } from "@/lib/chatgpt-integration/oauth-route-utils";

/** OAuth 2.0 authorization endpoint (authorization code + PKCE). */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  try {
    const result = beginOAuthAuthorization({
      responseType: url.searchParams.get("response_type") ?? "",
      clientId: url.searchParams.get("client_id") ?? "",
      redirectUri: url.searchParams.get("redirect_uri") ?? "",
      scope: url.searchParams.get("scope"),
      state: url.searchParams.get("state") ?? "",
      codeChallenge: url.searchParams.get("code_challenge") ?? "",
      codeChallengeMethod: url.searchParams.get("code_challenge_method") ?? "",
    });
    return NextResponse.redirect(new URL(result.consentPath, url.origin));
  } catch (err) {
    return mapOAuthRouteError(err, "oauth.authorize");
  }
}

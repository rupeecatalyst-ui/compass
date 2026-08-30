import "server-only";

import {
  buildCatalystOneGatewayHeaders,
  resolveCatalystOneProtectionBypass,
} from "./headers";

type GatewayEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

function catalystBaseUrl(): string {
  return (
    process.env.CATALYST_ONE_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_CATALYST_ONE_API_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function gatewayKey(): string {
  const key = process.env.COMPASS_GATEWAY_API_KEY?.trim();
  if (!key) {
    throw new Error("COMPASS_GATEWAY_API_KEY is not configured.");
  }
  return key;
}

async function callCatalystOne<T>(
  path: string,
  init?: RequestInit & { journeyToken?: string | null },
): Promise<T> {
  const headers = buildCatalystOneGatewayHeaders({
    extra: init?.headers,
    gatewayKey: gatewayKey(),
    protectionBypass: resolveCatalystOneProtectionBypass(),
    journeyToken: init?.journeyToken,
  });
  if (init?.body && !headers.has("content-type") && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${catalystBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as GatewayEnvelope<T> | null;
  if (!response.ok || !payload?.success || payload.data === undefined) {
    const message =
      payload?.error?.message ||
      `Catalyst One gateway request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload.data;
}

export const catalystOneGateway = {
  getJourneyConfig(productCode: string) {
    return callCatalystOne(`/api/compass/journey/config?productCode=${encodeURIComponent(productCode)}`);
  },
  startJourney(body: unknown) {
    return callCatalystOne("/api/compass/journey/start", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  patchAnswers(journeyToken: string, body: unknown) {
    return callCatalystOne("/api/compass/journey/answers", {
      method: "PATCH",
      journeyToken,
      body: JSON.stringify(body),
    });
  },
  analyze(journeyToken: string) {
    return callCatalystOne("/api/compass/journey/analyze", {
      method: "POST",
      journeyToken,
      body: JSON.stringify({}),
    });
  },
  getLod(journeyToken: string) {
    return callCatalystOne("/api/compass/journey/lod", {
      method: "GET",
      journeyToken,
    });
  },
  uploadDocuments(journeyToken: string, formData: FormData) {
    return callCatalystOne("/api/compass/journey/documents", {
      method: "POST",
      journeyToken,
      body: formData,
    });
  },
  submit(journeyToken: string, body: unknown) {
    return callCatalystOne("/api/compass/journey/submit", {
      method: "POST",
      journeyToken,
      body: JSON.stringify(body),
    });
  },
};

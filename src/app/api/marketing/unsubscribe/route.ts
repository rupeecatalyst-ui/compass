/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 — Public marketing unsubscribe API.
 * No authentication. Generic invalid responses. Never echoes email or fingerprint.
 */

import { NextResponse } from "next/server";
import {
  MARKETING_UNSUBSCRIBE_ALREADY_COPY,
  MARKETING_UNSUBSCRIBE_GENERIC_INVALID,
  MARKETING_UNSUBSCRIBE_SUCCESS_COPY,
} from "@/constants/enterprise-marketing-engine/unsubscribe";
import { marketingUnsubscribeService } from "@server/services/enterprise-marketing-engine/unsubscribe.service";

export const dynamic = "force-dynamic";

function tokenFrom(request: Request, body: Record<string, unknown>): string {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("token");
  const fromBody = typeof body.token === "string" ? body.token : "";
  return (fromBody || fromQuery || "").trim();
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await request.json().catch(() => ({}))) as Record<string, unknown>;
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    return Object.fromEntries(new URLSearchParams(text));
  }
  return {};
}

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  const token = tokenFrom(request, {});
  const peek = marketingUnsubscribeService.peek(token);
  if (!peek.valid) {
    return json(400, { ok: false, message: MARKETING_UNSUBSCRIBE_GENERIC_INVALID });
  }
  return json(200, { ok: true, valid: true });
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const token = tokenFrom(request, body);
  const result = marketingUnsubscribeService.confirm(token);
  const contentType = request.headers.get("content-type") ?? "";
  const wantsHtml = contentType.includes("application/x-www-form-urlencoded");
  if (!result.valid) {
    if (wantsHtml) {
      return NextResponse.redirect(new URL("/marketing/unsubscribe/invalid", request.url), 303);
    }
    return json(400, { ok: false, message: MARKETING_UNSUBSCRIBE_GENERIC_INVALID });
  }
  if (wantsHtml) {
    const path = `/marketing/unsubscribe/${encodeURIComponent(token)}?confirmed=${result.alreadyUnsubscribed ? "already" : "1"}`;
    return NextResponse.redirect(new URL(path, request.url), 303);
  }
  return json(200, {
    ok: true,
    alreadyUnsubscribed: result.alreadyUnsubscribed,
    message: result.alreadyUnsubscribed
      ? MARKETING_UNSUBSCRIBE_ALREADY_COPY
      : MARKETING_UNSUBSCRIBE_SUCCESS_COPY,
  });
}

import { NextResponse } from "next/server";

export function rejectCrossOrigin(request: Request): NextResponse | null {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return NextResponse.json({ error: "This request was not accepted." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "This request was not accepted." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "This request was not accepted." }, { status: 403 });
    }
  }
  return null;
}

export function customerSafeError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (!message || /prisma|\/src\/|ECONN|password|secret|syntax error|select |insert |update /i.test(message)) {
    return fallback;
  }
  return message;
}

import { NextResponse } from "next/server";
import { catalystOneGateway } from "@/lib/catalyst-one-gateway/server";

function readToken(request: Request): string | null {
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return request.headers.get("x-compass-journey-token")?.trim() || null;
}

export async function POST(request: Request) {
  const token = readToken(request);
  if (!token) return NextResponse.json({ error: "Missing journey session" }, { status: 401 });
  try {
    const formData = await request.formData();
    const data = await catalystOneGateway.uploadDocuments(token, formData);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

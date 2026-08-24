/**
 * CO-CHATGPT-INTEGRATION-V1 — Fail closed for unknown integration paths.
 */
import { NextResponse } from "next/server";
import { createCorrelationId } from "@/lib/ops/correlation";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Unknown ChatGPT integration endpoint.",
        statusCode: 404,
        correlationId: createCorrelationId(),
      },
    },
    { status: 404 },
  );
}

export async function POST(): Promise<NextResponse> {
  return GET();
}

export async function PUT(): Promise<NextResponse> {
  return GET();
}

export async function PATCH(): Promise<NextResponse> {
  return GET();
}

export async function DELETE(): Promise<NextResponse> {
  return GET();
}

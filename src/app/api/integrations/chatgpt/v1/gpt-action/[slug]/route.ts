/**
 * CO-CHATGPT-GPT-ACTION-001 — Dynamic GPT Action lane (OAuth-only, read-only).
 */
import { NextResponse } from "next/server";
import { createCorrelationId } from "@/lib/ops/correlation";
import {
  CHATGPT_GPT_ACTION_ENDPOINTS,
  resolveChatGptGptActionSlug,
} from "@/lib/chatgpt-integration/gpt-action-endpoints";
import { createChatGptGptActionRouteHandlers } from "@/lib/chatgpt-integration/gpt-action-route-handler";

type RouteContext = { params: Promise<{ slug: string }> };

const handlerCache = new Map<
  string,
  ReturnType<typeof createChatGptGptActionRouteHandlers>
>();

function handlersForSlug(slug: string) {
  const resolved = resolveChatGptGptActionSlug(slug);
  if (!resolved) return null;
  let cached = handlerCache.get(resolved);
  if (!cached) {
    cached = createChatGptGptActionRouteHandlers(CHATGPT_GPT_ACTION_ENDPOINTS[resolved]);
    handlerCache.set(resolved, cached);
  }
  return cached;
}

function notFound(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Unknown ChatGPT GPT Action endpoint.",
        statusCode: 404,
        correlationId: createCorrelationId(),
      },
    },
    { status: 404 },
  );
}

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const { slug } = await context.params;
  const handlers = handlersForSlug(slug);
  if (!handlers) return notFound();
  return handlers.GET(request);
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const { slug } = await context.params;
  const handlers = handlersForSlug(slug);
  if (!handlers) return notFound();
  return handlers.POST(request);
}

export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const { slug } = await context.params;
  const handlers = handlersForSlug(slug);
  if (!handlers) return notFound();
  return handlers.PUT(request);
}

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const { slug } = await context.params;
  const handlers = handlersForSlug(slug);
  if (!handlers) return notFound();
  return handlers.PATCH(request);
}

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  const { slug } = await context.params;
  const handlers = handlersForSlug(slug);
  if (!handlers) return notFound();
  return handlers.DELETE(request);
}

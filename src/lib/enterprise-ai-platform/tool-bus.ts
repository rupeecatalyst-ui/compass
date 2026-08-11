/**
 * Tool Bus — generic registration + gated invocation (CO-AI-101).
 * No production business tools. Handlers are stubs until later sprints.
 */

import { getEaiPorts } from "./composition";
import { assertEaiToolAllowed } from "./policy-gate";
import type {
  EaiPolicyDecision,
  EaiToolDefinition,
  EaiToolInvocationRequest,
  EaiToolInvocationResult,
  EaiToolSideEffectClass,
} from "@/types/enterprise-ai-platform";

function nowIso(): string {
  return new Date().toISOString();
}

export interface RegisterEaiToolInput {
  toolId: string;
  name: string;
  description: string;
  sideEffectClass: EaiToolSideEffectClass;
  targetEngine?: string;
  category?: import("@/types/enterprise-ai-capability-layer").EaiToolCategoryId;
}

const handlers = new Map<
  string,
  (req: EaiToolInvocationRequest) => Promise<EaiToolInvocationResult> | EaiToolInvocationResult
>();

export function registerEaiTool(
  input: RegisterEaiToolInput,
  handler?: (
    req: EaiToolInvocationRequest,
  ) => Promise<EaiToolInvocationResult> | EaiToolInvocationResult,
): EaiToolDefinition {
  const tool: EaiToolDefinition = {
    toolId: input.toolId,
    name: input.name,
    description: input.description,
    sideEffectClass: input.sideEffectClass,
    targetEngine: input.targetEngine,
    category: input.category,
    registeredAt: nowIso(),
  };
  getEaiPorts().tools.save(tool);
  if (handler) {
    handlers.set(input.toolId, handler);
  } else {
    handlers.set(input.toolId, (req) => ({
      toolId: req.toolId,
      ok: true,
      payload: {
        stub: true,
        message: "AI-1 stub handler — no enterprise engine connected.",
        input: req.input,
      },
    }));
  }
  return tool;
}

export function listEaiTools(): EaiToolDefinition[] {
  return getEaiPorts().tools.list();
}

export function getEaiTool(toolId: string): EaiToolDefinition | undefined {
  return getEaiPorts().tools.findById(toolId);
}

export async function invokeEaiTool(
  request: EaiToolInvocationRequest,
  policyDecision: EaiPolicyDecision,
): Promise<EaiToolInvocationResult> {
  const gate = assertEaiToolAllowed(policyDecision, request.toolId);
  if (!gate.ok) {
    return {
      toolId: request.toolId,
      ok: false,
      payload: {},
      errorCode: "policy_denied",
      errorMessage: gate.reason,
    };
  }

  const tool = getEaiPorts().tools.findById(request.toolId);
  if (!tool) {
    return {
      toolId: request.toolId,
      ok: false,
      payload: {},
      errorCode: "tool_not_found",
      errorMessage: `Tool not registered: ${request.toolId}`,
    };
  }

  if (tool.sideEffectClass !== "read") {
    return {
      toolId: request.toolId,
      ok: false,
      payload: {},
      errorCode: "side_effect_forbidden",
      errorMessage: "Tool Bus may only invoke read-class tools. Use Action Proposals for side effects.",
    };
  }

  const handler = handlers.get(request.toolId);
  if (!handler) {
    return {
      toolId: request.toolId,
      ok: false,
      payload: {},
      errorCode: "handler_missing",
      errorMessage: `No handler for tool: ${request.toolId}`,
    };
  }

  return handler(request);
}

/** Test / composition reset helper — clears in-process handlers. */
export function resetEaiToolHandlers(): void {
  handlers.clear();
}

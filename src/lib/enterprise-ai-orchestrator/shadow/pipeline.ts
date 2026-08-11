/**
 * CO-AI-G2-W1 — Shadow Invocation Pipeline.
 *
 * Runs reasoning in parallel / after live turn for capture + comparison only.
 * Never returns text for the customer. Feature flag OFF by default.
 */

import {
  EAO_SHADOW_MODE_VERSION,
  isEaoShadowModeEnabled,
} from "@/constants/enterprise-ai-orchestrator/shadow-mode";
import type { EaoModelProviderPort } from "@/types/enterprise-ai-orchestrator";
import type {
  EaoShadowCaptureRecord,
  EaoShadowInvokeInput,
} from "@/types/enterprise-ai-orchestrator/shadow";
import { buildEaoShadowRequest } from "./build-request";
import { saveEaoShadowCapture } from "./capture-store";
import { compareEaoShadowToLive } from "./compare";
import { createEaoShadowStubProvider } from "./stub-provider";
import {
  runEaoTripleComparison,
  saveEaoTripleComparison,
} from "@/lib/enterprise-ai-orchestrator/triple-comparison";
import {
  saveEaoPolicyValidationReport,
  validateEaoShadowPolicy,
} from "@/lib/enterprise-ai-orchestrator/policy-validation";
import {
  createEaoPerfSample,
  saveEaoPerfSample,
} from "@/lib/enterprise-ai-orchestrator/perf-profiler";

let providerOverride: EaoModelProviderPort | null = null;

/** Test / future G2 waves: inject a real provider without changing customer path. */
export function configureEaoShadowProvider(provider: EaoModelProviderPort | null): void {
  providerOverride = provider;
}

function resolveProvider(): EaoModelProviderPort {
  return providerOverride ?? createEaoShadowStubProvider();
}

function skippedRecord(
  live: EaoShadowInvokeInput["live"],
  reason: EaoShadowCaptureRecord["status"],
  errorMessage?: string,
): EaoShadowCaptureRecord {
  return {
    shadowId: `eao_shadow_${crypto.randomUUID()}`,
    status: reason,
    live,
    request: null,
    response: null,
    comparison: null,
    errorMessage,
    durationMs: 0,
    shadowModeVersion: EAO_SHADOW_MODE_VERSION,
    recordedAt: new Date().toISOString(),
    customerIsolated: true,
  };
}

/**
 * Synchronous shadow invoke when flag is on.
 * Caller must not use response for customer facing text.
 */
export async function runEaoShadowInvocation(
  input: EaoShadowInvokeInput,
): Promise<EaoShadowCaptureRecord> {
  if (!isEaoShadowModeEnabled()) {
    const skipped = skippedRecord(input.live, "skipped_flag_off");
    // Do not pollute capture store when disabled — keep zero production side effects.
    return skipped;
  }

  const started = Date.now();
  const request = input.request ?? buildEaoShadowRequest({ live: input.live });

  try {
    const provider = resolveProvider();
    const providerStarted = Date.now();
    const response = await provider.complete(request);
    const providerLatencyMs = Date.now() - providerStarted;
    const comparison = compareEaoShadowToLive({
      live: input.live,
      shadow: response,
    });
    const record: EaoShadowCaptureRecord = {
      shadowId: `eao_shadow_${crypto.randomUUID()}`,
      status: "completed",
      live: input.live,
      request,
      response,
      comparison,
      durationMs: Date.now() - started,
      shadowModeVersion: EAO_SHADOW_MODE_VERSION,
      recordedAt: new Date().toISOString(),
      customerIsolated: true,
    };
    saveEaoShadowCapture(record);

    // CO-AI-G2-W4: internal triple comparison — never returned to customer UI
    try {
      const triple = runEaoTripleComparison({
        customerUtterance: input.live.utterance,
        liveFacingText: input.live.facingText,
        modelFacingText: response.facingText,
        sessionId: input.live.sessionId,
        conversationId: input.live.conversationId,
        liveObjectiveHint: input.live.objectiveHint,
      });
      saveEaoTripleComparison(triple);
    } catch {
      /* isolate — shadow success must not fail live path */
    }

    // CO-AI-G2-W6: policy validation harness — reports only; does not modify response
    try {
      const policyReport = validateEaoShadowPolicy({
        shadowFacingText: response.facingText,
        customerUtterance: input.live.utterance,
        liveFacingText: input.live.facingText,
        shadowId: record.shadowId,
        sessionId: input.live.sessionId,
        conversationId: input.live.conversationId,
        label: `shadow:${record.shadowId}`,
      });
      saveEaoPolicyValidationReport(policyReport);
    } catch {
      /* isolate */
    }

    // CO-AI-G2-W7: cost/performance profiler — metrics only; no runtime optimisation
    try {
      const inputText = [
        request.utterance,
        ...request.history.map((h) => h.text),
      ].join("\n");
      saveEaoPerfSample(
        createEaoPerfSample({
          label: `shadow:${record.shadowId}`,
          latencyMs: record.durationMs,
          providerLatencyMs,
          inputText,
          outputText: response.facingText,
          toolCallCount: response.toolCallsRequested?.length ?? 0,
          contextSizeChars: JSON.stringify(request).length,
          memorySizeChars: JSON.stringify(request.readinessHints ?? {}).length,
          providerId: provider.providerId,
          providerConfigVersion: provider.configVersion,
          shadowId: record.shadowId,
          sessionId: input.live.sessionId,
          conversationId: input.live.conversationId,
        }),
      );
    } catch {
      /* isolate */
    }

    return record;
  } catch (e) {
    const record: EaoShadowCaptureRecord = {
      shadowId: `eao_shadow_${crypto.randomUUID()}`,
      status: "failed",
      live: input.live,
      request,
      response: null,
      comparison: null,
      errorMessage: e instanceof Error ? e.message : "shadow_failed",
      durationMs: Date.now() - started,
      shadowModeVersion: EAO_SHADOW_MODE_VERSION,
      recordedAt: new Date().toISOString(),
      customerIsolated: true,
    };
    saveEaoShadowCapture(record);
    return record;
  }
}

/**
 * Fire-and-forget entry used after a live turn.
 * Never throws into the live path. Never mutates live facing text.
 */
export function scheduleEaoShadowAfterLiveTurn(input: EaoShadowInvokeInput): void {
  if (!isEaoShadowModeEnabled()) return;
  void runEaoShadowInvocation(input).catch(() => {
    /* swallow — live path must not fail */
  });
}

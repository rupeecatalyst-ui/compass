/**
 * CO-AI-G2-W7 — Sample performance profiles for offline report BAT.
 */

import { createEaoPerfSample } from "./profile";
import type { EaoPerfSample } from "@/types/enterprise-ai-orchestrator/perf-profiler";

export function buildEaoPerfFixtureSamples(): EaoPerfSample[] {
  return [
    createEaoPerfSample({
      label: "stub-fast",
      latencyMs: 420,
      providerLatencyMs: 380,
      inputText: "How fast can I get a business loan? ".repeat(3),
      outputText:
        "With complete documents, some business loan cases can move quite quickly, although timelines depend on the lender and your profile.",
      toolCallCount: 0,
      contextSizeChars: 2400,
      memorySizeChars: 800,
      providerId: "eao.shadow.stub",
      providerConfigVersion: "g2-w1.stub.1",
    }),
    createEaoPerfSample({
      label: "stub-heavy-context",
      latencyMs: 3100,
      providerLatencyMs: 2800,
      inputText: "I want a home loan balance transfer. ".repeat(20),
      outputText: "Balance transfer can help when EMI is high. Which bank is current? ".repeat(8),
      toolCallCount: 5,
      contextSizeChars: 18_000,
      memorySizeChars: 9_500,
      providerId: "eao.shadow.stub",
      providerConfigVersion: "g2-w1.stub.1",
    }),
    createEaoPerfSample({
      label: "alt-provider-sample",
      latencyMs: 1500,
      inputText: "Personal loan for wedding",
      outputText: "I can help with a personal loan. What amount are you exploring?",
      toolCallCount: 1,
      contextSizeChars: 3200,
      memorySizeChars: 1200,
      providerId: "eao.model.future",
      providerConfigVersion: "future.1",
    }),
  ];
}

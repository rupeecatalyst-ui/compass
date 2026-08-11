/**
 * Context Providers — interfaces + stub registry (CO-AI-103).
 * No production registry connectors. AI-4 will register real read providers.
 */

import type {
  EaiContextDomain,
  EaiContextProvider,
  EaiContextProviderRequest,
  EaiContextProviderResult,
} from "@/types/enterprise-ai-context-intelligence";
import { EAI_CONTEXT_DOMAINS } from "@/constants/enterprise-ai-platform/context-intelligence";

const providers = new Map<EaiContextDomain, EaiContextProvider>();

function createStubProvider(domain: EaiContextDomain): EaiContextProvider {
  const providerId = `eai.ctx.stub.${domain}`;
  return {
    providerId,
    domain,
    providerVersion: "0.0.0-stub",
    implemented: false,
    async provide(request: EaiContextProviderRequest): Promise<EaiContextProviderResult> {
      return {
        domain,
        providerId,
        providerVersion: "0.0.0-stub",
        facts: [],
        refs: [],
        summary: `Stub ${domain} provider — not implemented (await AI-4 connectors). Hint=${(request.requestHint ?? "").slice(0, 80)}`,
        implemented: false,
      };
    },
  };
}

export function ensureEaiContextProviderStubs(): void {
  for (const domain of EAI_CONTEXT_DOMAINS) {
    if (!providers.has(domain)) {
      providers.set(domain, createStubProvider(domain));
    }
  }
}

export function resetEaiContextProviders(): void {
  providers.clear();
}

export function registerEaiContextProvider(provider: EaiContextProvider): void {
  providers.set(provider.domain, provider);
}

export function getEaiContextProvider(domain: EaiContextDomain): EaiContextProvider | undefined {
  ensureEaiContextProviderStubs();
  return providers.get(domain);
}

export function listEaiContextProviders(): EaiContextProvider[] {
  ensureEaiContextProviderStubs();
  return [...providers.values()];
}

export async function invokeEaiContextProvider(
  request: EaiContextProviderRequest,
): Promise<EaiContextProviderResult> {
  const provider = getEaiContextProvider(request.domain);
  if (!provider) {
    return {
      domain: request.domain,
      providerId: "missing",
      providerVersion: "0",
      facts: [],
      refs: [],
      summary: `No provider registered for domain ${request.domain}`,
      implemented: false,
    };
  }
  return provider.provide(request);
}

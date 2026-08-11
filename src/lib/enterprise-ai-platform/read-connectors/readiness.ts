/**
 * AI-4 readiness — connectors, providers, tools, projections, permissions.
 */

import {
  EAI_READ_CONNECTOR_IDS,
  EAI_READ_CONNECTORS_VERSION,
  EAI_READ_TOOL_DEFINITIONS,
} from "@/constants/enterprise-ai-platform/read-connectors";
import { resetEaiComposition } from "../composition";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { buildEaiContextPackage } from "../context-intelligence/package-builder";
import { prioritiseEaiContextDomains } from "../context-intelligence/prioritisation";
import {
  listEaiContextProviders,
  resetEaiContextProviders,
} from "../context-intelligence/providers";
import { evaluateEaiPolicy } from "../policy-gate";
import { invokeEaiTool, listEaiTools, resetEaiToolHandlers } from "../tool-bus";
import type { EaiReadConnectorsReadinessResult } from "@/types/enterprise-ai-read-connectors";
import { resetEaiReadAudit, listEaiReadAuditEvents } from "./audit";
import { resetEaiReadCache } from "./cache";
import { validateEaiReadProjection } from "./projections";
import {
  ensureEaiReadConnectorsRegistered,
  listEaiReadConnectors,
  resetEaiReadConnectors,
} from "./registry";
import {
  registerEaiEnterpriseReadTools,
  resetEaiReadToolsWiredFlag,
} from "./register-tools";
import { discoverEaiReadTools } from "./tool-discovery";
import { wireEaiContextProvidersToReadConnectors } from "./wire-providers";

export async function runEaiReadConnectorsReadiness(): Promise<EaiReadConnectorsReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiToolHandlers();
  resetEaiReadToolsWiredFlag();
  resetEaiContextProviders();
  resetEaiReadConnectors();
  resetEaiReadAudit();
  resetEaiReadCache();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();
  ensureEaiReadConnectorsRegistered();
  wireEaiContextProvidersToReadConnectors();
  registerEaiEnterpriseReadTools();

  const connectors = listEaiReadConnectors();
  if (connectors.length !== EAI_READ_CONNECTOR_IDS.length) {
    errors.push(
      `Expected ${EAI_READ_CONNECTOR_IDS.length} connectors, found ${connectors.length}`,
    );
  }
  if (connectors.some((c) => !c.readOnly)) {
    errors.push("All connectors must be readOnly");
  }

  const providers = listEaiContextProviders();
  const implemented = providers.filter((p) => p.implemented && p.domain !== "conversation");
  if (implemented.length < 9) {
    errors.push(`Expected connector-backed providers, found ${implemented.length}`);
  }

  const tools = listEaiTools();
  const readTools = tools.filter((t) => t.toolId.startsWith("eai.read."));
  if (readTools.length < EAI_READ_TOOL_DEFINITIONS.length) {
    errors.push(
      `Expected ${EAI_READ_TOOL_DEFINITIONS.length} read tools, found ${readTools.length}`,
    );
  }
  const duplicateIds = readTools.map((t) => t.toolId).filter((id, i, arr) => arr.indexOf(id) !== i);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate tools: ${[...new Set(duplicateIds)].join(", ")}`);
  }
  if (readTools.some((t) => t.sideEffectClass !== "read")) {
    errors.push("Read tools must have sideEffectClass=read");
  }

  // Prioritisation examples from AI-4 brief
  const bt = prioritiseEaiContextDomains({ requestHint: "What is Balance Transfer?" });
  if (bt.domains.includes("customer") || bt.domains.includes("loan")) {
    errors.push("BT education must not load customer/loan");
  }
  if (!bt.domains.includes("knowledge")) {
    errors.push("BT education must include knowledge");
  }

  const emi = prioritiseEaiContextDomains({ requestHint: "Can I reduce my EMI?" });
  for (const d of ["knowledge", "loan", "financial", "conversation", "customer"] as const) {
    if (!emi.domains.includes(d)) errors.push(`EMI question missing domain ${d}`);
  }

  const amount = prioritiseEaiContextDomains({ requestHint: "I need ₹20 lakh." });
  for (const d of ["knowledge", "financial", "product", "conversation"] as const) {
    if (!amount.domains.includes(d)) errors.push(`Amount intent missing domain ${d}`);
  }

  // Knowledge provider via context package
  const pkg = await buildEaiContextPackage({
    sessionId: "sess_ai4",
    conversationId: "conv_ai4",
    personaPackId: "sarathi_customer",
    requestHint: "What is Balance Transfer?",
  });
  if (!pkg.domainsIncluded.includes("knowledge")) {
    errors.push("Context package for BT missing knowledge domain");
  }
  const knowledgeSection = pkg.sections.find((s) => s.domain === "knowledge" && s.included);
  if (!knowledgeSection?.providerId.includes("connector")) {
    warnings.push("Knowledge provider may not be connector-backed");
  }

  // Projection validation on connector direct read
  const productConnector = connectors.find((c) => c.connectorId === "product_registry");
  if (productConnector) {
    const projection = await productConnector.read({
      sessionId: "sess_ai4",
      conversationId: "conv_ai4",
      personaPackId: "sarathi_customer",
      requestHint: "home loan",
    });
    errors.push(...validateEaiReadProjection(projection));
  }

  // Permission: mutate must still fail; discovery respects pack categories
  const mutatePolicy = evaluateEaiPolicy({
    sessionId: "sess_ai4",
    conversationId: "conv_ai4",
    personaPackId: "sarathi_customer",
    requestedToolIds: ["eai.read.customer"],
    requestedDataScopes: [],
    requestedToolCategories: ["registry.customer"],
    requestedCapabilityIds: ["crm_mutation"],
  });
  if (mutatePolicy.allowedCapabilityIds.includes("crm_mutation")) {
    errors.push("crm_mutation must remain denied");
  }

  const discovered = discoverEaiReadTools({
    personaPackId: "sarathi_customer",
    requestedCategories: ["registry.customer", "financial.foir"],
    sessionId: "sess_ai4",
    conversationId: "conv_ai4",
  });
  const customerTool = discovered.find((d) => d.toolId === "eai.read.customer");
  if (!customerTool?.allowedByPolicy) {
    errors.push(`Customer read tool should be discoverable: ${customerTool?.denyReasons.join("; ")}`);
  }
  const foirTool = discovered.find((d) => d.category === "financial.foir");
  // No tool registered for foir category in catalogue except eligibility — expect empty or denied
  if (foirTool && foirTool.allowedByPolicy) {
    warnings.push("financial.foir unexpectedly allowed for SARATHI Customer scaffold");
  }

  // Invoke a read tool through Policy Gate
  const policy = evaluateEaiPolicy({
    sessionId: "sess_ai4",
    conversationId: "conv_ai4",
    personaPackId: "sarathi_customer",
    requestedToolIds: ["eai.read.knowledge"],
    requestedDataScopes: ["product.catalog_public"],
    requestedToolCategories: ["knowledge.faqs"],
  });
  const toolResult = await invokeEaiTool(
    {
      toolId: "eai.read.knowledge",
      sessionId: "sess_ai4",
      conversationId: "conv_ai4",
      input: { requestHint: "Balance Transfer", personaPackId: "sarathi_customer" },
    },
    policy,
  );
  if (!toolResult.ok) {
    errors.push(`Knowledge read tool failed: ${toolResult.errorMessage}`);
  }
  if (toolResult.payload?.readOnly !== true) {
    errors.push("Read tool payload must mark readOnly=true");
  }

  const audits = listEaiReadAuditEvents(20);
  if (audits.length < 1) {
    errors.push("Expected read audit events");
  }
  if (audits.some((a) => !a.purpose?.trim())) {
    errors.push("Every read audit must include purpose");
  }

  // Outside domain must not retrieve knowledge via tool
  const outsideTool = await invokeEaiTool(
    {
      toolId: "eai.read.knowledge",
      sessionId: "sess_ai4",
      conversationId: "conv_ai4",
      input: { requestHint: "Who won the cricket match?", personaPackId: "sarathi_customer" },
    },
    evaluateEaiPolicy({
      sessionId: "sess_ai4",
      conversationId: "conv_ai4",
      personaPackId: "sarathi_customer",
      requestedToolIds: ["eai.read.knowledge"],
      requestedDataScopes: [],
      requestedToolCategories: ["knowledge.faqs"],
      intentHint: "Who won the cricket match?",
    }),
  );
  if (outsideTool.ok) {
    errors.push("Outside-domain knowledge tool read must fail");
  }

  // SARATHI Bible presence
  const { SARATHI_BIBLE_COMMANDMENTS, SARATHI_BIBLE_VERSION } = await import(
    "@/constants/enterprise-ai-platform/sarathi-bible"
  );
  if (SARATHI_BIBLE_COMMANDMENTS.length < 10) {
    errors.push("SARATHI Bible commandments incomplete");
  }

  // Missing provider simulation — conversation domain ok without connector
  const conversationProvider = providers.find((p) => p.domain === "conversation");
  if (!conversationProvider) {
    warnings.push("Conversation provider not listed (memory path is builder-owned)");
  }

  // Duplicate provider domains
  const domainCounts = new Map<string, number>();
  for (const p of providers) {
    domainCounts.set(p.domain, (domainCounts.get(p.domain) ?? 0) + 1);
  }
  for (const [domain, count] of domainCounts) {
    if (count > 1) errors.push(`Duplicate providers for domain ${domain}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      readConnectorsVersion: EAI_READ_CONNECTORS_VERSION,
      sarathiBibleVersion: SARATHI_BIBLE_VERSION,
      connectorCount: connectors.length,
      implementedProviderCount: implemented.length,
      readToolCount: readTools.length,
      btDomains: bt.domains,
      emiDomains: emi.domains,
      amountDomains: amount.domains,
      auditCount: audits.length,
      auditHasPurpose: audits.every((a) => Boolean(a.purpose)),
      knowledgeToolOk: toolResult.ok,
      outsideToolBlocked: !outsideTool.ok,
      packageId: pkg.packageId,
    },
  };
}

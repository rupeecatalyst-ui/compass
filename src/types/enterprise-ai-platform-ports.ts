/**
 * Enterprise AI Platform ports — repository + provider contracts (CO-AI-101).
 */

import type {
  EaiActionProposal,
  EaiCompiledContext,
  EaiConversationTurn,
  EaiInteractionRecord,
  EaiLlmProvider,
  EaiSession,
  EaiToolDefinition,
} from "./enterprise-ai-platform";

export interface EaiSessionRepositoryPort {
  list(): EaiSession[];
  findById(sessionId: string): EaiSession | undefined;
  findByConversationId(conversationId: string): EaiSession[];
  save(session: EaiSession): void;
  replaceAll(sessions: EaiSession[]): void;
}

export interface EaiTurnRepositoryPort {
  list(): EaiConversationTurn[];
  listBySession(sessionId: string): EaiConversationTurn[];
  save(turn: EaiConversationTurn): void;
  replaceAll(turns: EaiConversationTurn[]): void;
}

export interface EaiContextRepositoryPort {
  list(): EaiCompiledContext[];
  findById(contextId: string): EaiCompiledContext | undefined;
  save(context: EaiCompiledContext): void;
  replaceAll(contexts: EaiCompiledContext[]): void;
}

export interface EaiProposalRepositoryPort {
  list(): EaiActionProposal[];
  findById(proposalId: string): EaiActionProposal | undefined;
  listBySession(sessionId: string): EaiActionProposal[];
  save(proposal: EaiActionProposal): void;
  replaceAll(proposals: EaiActionProposal[]): void;
}

export interface EaiInteractionRepositoryPort {
  list(): EaiInteractionRecord[];
  findById(interactionId: string): EaiInteractionRecord | undefined;
  listByConversation(conversationId: string): EaiInteractionRecord[];
  save(record: EaiInteractionRecord): void;
  replaceAll(records: EaiInteractionRecord[]): void;
}

export interface EaiToolRegistryPort {
  list(): EaiToolDefinition[];
  findById(toolId: string): EaiToolDefinition | undefined;
  save(tool: EaiToolDefinition): void;
  replaceAll(tools: EaiToolDefinition[]): void;
}

export interface EaiPorts {
  sessions: EaiSessionRepositoryPort;
  turns: EaiTurnRepositoryPort;
  contexts: EaiContextRepositoryPort;
  proposals: EaiProposalRepositoryPort;
  interactions: EaiInteractionRepositoryPort;
  tools: EaiToolRegistryPort;
  llmProvider: EaiLlmProvider;
}

export type PartialEaiPorts = Partial<EaiPorts>;

/**
 * EDC ports — repository contracts.
 */

import type {
  EdcAuditReference,
  EdcRegistrySnapshot,
  EdcTimelineEntry,
} from "./enterprise-dialogue-center";

export interface EdcTimelineRepositoryPort {
  list(): EdcTimelineEntry[];
  listByContext(contextType: string, contextId: string): EdcTimelineEntry[];
  findById(id: string): EdcTimelineEntry | undefined;
  save(entry: EdcTimelineEntry): void;
  replaceAll(entries: EdcTimelineEntry[]): void;
}

export interface EdcAuditReferenceRepositoryPort {
  list(): EdcAuditReference[];
  save(reference: EdcAuditReference): void;
  replaceAll(references: EdcAuditReference[]): void;
}

export interface EdcPorts {
  timeline: EdcTimelineRepositoryPort;
  auditReferences: EdcAuditReferenceRepositoryPort;
}

export type PartialEdcPorts = Partial<EdcPorts>;
export type { EdcRegistrySnapshot };

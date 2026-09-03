/**
 * CO-C1-CHANAKYA-DURABLE-HISTORY-009A
 * In-process table double for verification. Production SSOT is Prisma/PostgreSQL.
 * Tests must pass an external store so reinitialising the service does not erase rows.
 */

import type {
  ChanakyaConversationHistoryPorts,
  ChanakyaDurableMessageRecord,
  ChanakyaDurableSessionRecord,
} from "./history-ports";

export type ChanakyaHistoryMemoryStore = {
  sessions: Map<string, Omit<ChanakyaDurableSessionRecord, "messages">>;
  messages: Map<string, ChanakyaDurableMessageRecord>;
};

export function createChanakyaHistoryMemoryStore(): ChanakyaHistoryMemoryStore {
  return {
    sessions: new Map(),
    messages: new Map(),
  };
}

function hydrate(
  store: ChanakyaHistoryMemoryStore,
  session: Omit<ChanakyaDurableSessionRecord, "messages">,
): ChanakyaDurableSessionRecord {
  const messages = [...store.messages.values()]
    .filter((row) => row.sessionId === session.sessionId)
    .sort((a, b) => a.sequence - b.sequence);
  return { ...session, messages };
}

function ownedUnexpired(
  row: Omit<ChanakyaDurableSessionRecord, "messages">,
  input: { organizationId: string; ownerUserId: string; now: Date; includeExpired?: boolean },
): boolean {
  if (row.organizationId !== input.organizationId || row.ownerUserId !== input.ownerUserId) {
    return false;
  }
  if (input.includeExpired) return true;
  return Date.parse(row.expiresAt) > input.now.getTime();
}

export function createChanakyaHistoryMemoryAdapter(
  store: ChanakyaHistoryMemoryStore,
): ChanakyaConversationHistoryPorts {
  return {
    async createSession(row) {
      store.sessions.set(row.sessionId, { ...row });
      return hydrate(store, row);
    },
    async findOwnedSession(input) {
      const row = store.sessions.get(input.sessionId);
      if (!row) return null;
      if (!ownedUnexpired(row, input)) return null;
      return hydrate(store, row);
    },
    async listOwnedSessions(input) {
      const q = (input.query || "").trim().toLowerCase();
      const rows: ChanakyaDurableSessionRecord[] = [];
      for (const session of store.sessions.values()) {
        if (!ownedUnexpired(session, input)) continue;
        const hydrated = hydrate(store, session);
        if (q) {
          const hay = `${hydrated.title} ${hydrated.messages.map((m) => m.content).join(" ")}`.toLowerCase();
          if (!hay.includes(q)) continue;
        }
        rows.push(hydrated);
      }
      return rows.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    },
    async updateOwnedSession(input, patch) {
      const row = store.sessions.get(input.sessionId || "");
      if (!row) return null;
      if (!ownedUnexpired(row, { ...input, includeExpired: true })) return null;
      if (Date.parse(row.expiresAt) <= input.now.getTime()) return null;
      const next = {
        ...row,
        ...patch,
        version: (patch.version ?? row.version) + (patch.version == null && Object.keys(patch).length ? 1 : 0),
      };
      if (patch.version == null && Object.keys(patch).length) {
        next.version = row.version + 1;
      }
      store.sessions.set(row.sessionId, next);
      return hydrate(store, next);
    },
    async deleteOwnedSession(input) {
      const row = store.sessions.get(input.sessionId || "");
      if (!row) return false;
      if (row.organizationId !== input.organizationId || row.ownerUserId !== input.ownerUserId) {
        return false;
      }
      for (const [id, message] of store.messages) {
        if (message.sessionId === row.sessionId) store.messages.delete(id);
      }
      return store.sessions.delete(row.sessionId);
    },
    async insertMessage(row) {
      if (row.idempotencyKey) {
        for (const existing of store.messages.values()) {
          if (existing.sessionId === row.sessionId && existing.idempotencyKey === row.idempotencyKey) {
            return existing;
          }
        }
      }
      store.messages.set(row.id, row);
      return row;
    },
    async findMessageByIdempotency(input) {
      for (const row of store.messages.values()) {
        if (row.sessionId === input.sessionId && row.idempotencyKey === input.idempotencyKey) {
          return row;
        }
      }
      return null;
    },
    async updateOwnedMessage(input) {
      const session = store.sessions.get(input.sessionId);
      if (!session) return false;
      if (session.organizationId !== input.organizationId || session.ownerUserId !== input.ownerUserId) {
        return false;
      }
      if (Date.parse(session.expiresAt) <= input.now.getTime()) return false;
      const message = store.messages.get(input.messageId);
      if (!message || message.sessionId !== input.sessionId) return false;
      store.messages.set(input.messageId, { ...message, ...input.patch });
      return true;
    },
    async deleteExpiredSessions(input) {
      const expired = [...store.sessions.values()]
        .filter((row) => Date.parse(row.expiresAt) <= input.now.getTime())
        .slice(0, input.limit);
      const deletedSessionIds: string[] = [];
      for (const row of expired) {
        for (const [id, message] of store.messages) {
          if (message.sessionId === row.sessionId) store.messages.delete(id);
        }
        store.sessions.delete(row.sessionId);
        deletedSessionIds.push(row.sessionId);
      }
      return { deletedSessionIds };
    },
  };
}

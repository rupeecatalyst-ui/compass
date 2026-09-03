/**
 * CO-C1-CHANAKYA-DURABLE-HISTORY-009A
 * History port composition. PostgreSQL adapter is production default.
 * Tests inject a memory adapter over an external store before first use.
 */

import type { ChanakyaConversationHistoryPorts } from "./history-ports";

let activePorts: ChanakyaConversationHistoryPorts | null = null;

function loadPrismaHistoryAdapter(): ChanakyaConversationHistoryPorts {
  // Lazy load so verifier/tests can inject a memory adapter without importing Prisma.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@server/repositories/chanakya-conversation/chanakya-conversation.repository") as {
    createChanakyaHistoryPrismaAdapter: () => ChanakyaConversationHistoryPorts;
  };
  return mod.createChanakyaHistoryPrismaAdapter();
}

export function getChanakyaConversationHistoryPorts(): ChanakyaConversationHistoryPorts {
  if (!activePorts) {
    activePorts = loadPrismaHistoryAdapter();
  }
  return activePorts;
}

export function configureChanakyaConversationHistoryPorts(
  ports: ChanakyaConversationHistoryPorts,
): void {
  activePorts = ports;
}

export function resetChanakyaConversationHistoryPortsForTests(): void {
  activePorts = null;
}

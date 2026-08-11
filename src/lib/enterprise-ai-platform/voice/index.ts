/**
 * Voice & Real-Time Conversation Engine — public barrel (CO-AI-113).
 */

export {
  configureEaiVoicePorts,
  getActiveEaiSttProviderId,
  getActiveEaiTtsProviderId,
  getActiveEaiVadProviderId,
  getEaiVoicePorts,
  resetEaiVoiceComposition,
} from "./composition";
export {
  createStubEaiSttProvider,
  createStubEaiTtsProvider,
  createStubEaiVadProvider,
  createStubEaiVoicePorts,
} from "./stub-providers";
export {
  closeEaiVoiceSession,
  createEaiVoiceSession,
  getEaiVoiceSession,
  isEaiVoiceLanguageSupported,
  listEaiVoiceSessions,
  recoverEaiVoiceSession,
  resetEaiVoiceSessions,
  setEaiVoiceSessionStatus,
  updateEaiVoiceSession,
} from "./session-manager";
export {
  enqueueEaiVoiceResponse,
  interruptEaiVoiceQueue,
  listEaiVoiceQueue,
  markEaiVoiceQueueItem,
  peekNextEaiVoiceQueueItem,
  resetEaiVoiceQueues,
} from "./response-queue";
export {
  emitEaiVoiceStreamEvent,
  listEaiVoiceStreamEvents,
  resetEaiVoiceStreams,
  subscribeEaiVoiceStream,
} from "./streaming";
export { interruptEaiVoiceSession, runEaiVoiceConversationTurn } from "./voice-turn";
export { runEaiVoiceEngineReadiness } from "./readiness";

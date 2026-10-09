import type { EnterpriseConversationActivity } from "@/types/enterprise-conversation-activity";

/** One id survives upload/save retries, including a lost server response. No storage. */
export type ConversationSubmission = {
  id: string;
  edcId: string;
  audioDocumentId?: string;
  activity?: EnterpriseConversationActivity;
};
export function newConversationSubmission(): ConversationSubmission {
  return { id: crypto.randomUUID(), edcId: crypto.randomUUID() };
}
export function prepareConversationAudio(blob: Blob): { file: File | null; message: string | null } {
  const mime = blob.type.split(";")[0].trim().toLowerCase();
  const extensions: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/wav": "wav" };
  const extension = extensions[mime];
  if (!extension) return { file: null, message: "This recording format is not supported for audio storage. You can save the transcript only and download the recording." };
  return { file: new File([blob], "conversation-" + Date.now() + "." + extension, { type: mime }), message: null };
}
/** Synchronous lock: React state alone cannot exclude clicks in the same render. */
export async function runConversationSubmissionOnce(lock: { current: boolean }, action: () => Promise<void>): Promise<void> {
  if (lock.current) return;
  lock.current = true;
  try { await action(); } finally { lock.current = false; }
}

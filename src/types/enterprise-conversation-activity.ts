/**
 * CO-VOICE-002 Wave 1 — Enterprise Conversation Activity (ECIE Activity Registry).
 * Transcript + activity metadata SSOT. Audio lives in Document Registry.
 */

export type ConversationActivityContextType =
  | "contact"
  | "opportunity"
  | "deal"
  | "loan"
  | "task"
  | "customer";

export type ConversationActivityChannel =
  | "in_app_mic"
  | "typed_note"
  | "phone"
  | "whatsapp"
  | "teams"
  | "zoom"
  | "email"
  | "chat";

export type ConversationActivityStatus =
  | "draft"
  | "processing"
  | "ready_for_review"
  | "saved"
  | "discarded";

export type ConversationTranscriptLanguage = "en" | "hi" | "hinglish" | "auto" | "unknown";

export type ConversationSttProvider =
  | "browser_speech_recognition"
  | "manual"
  | "server_whisper"
  | "none";

export interface EnterpriseConversationActivity {
  id: string;
  organizationId: string;
  activityCode: string;
  contextType: ConversationActivityContextType;
  contextId: string;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  loanFileId?: string | null;
  channel: ConversationActivityChannel;
  status: ConversationActivityStatus;
  title: string;
  /** User-facing note body when typed; also mirrors transcript for voice. */
  bodyText?: string | null;
  transcriptText?: string | null;
  transcriptRaw?: string | null;
  transcriptLanguage: ConversationTranscriptLanguage;
  sttProvider: ConversationSttProvider;
  /** Document Registry record id for original audio. */
  audioDocumentId?: string | null;
  durationMs?: number | null;
  recordedByUserId: string;
  recordedByLabel?: string | null;
  recordedAt: string;
  savedAt?: string | null;
  edcTimelineEntryId?: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface CreateConversationActivityInput {
  contextType: ConversationActivityContextType;
  contextId: string;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  loanFileId?: string | null;
  channel: ConversationActivityChannel;
  title?: string;
  bodyText?: string | null;
  transcriptText?: string | null;
  transcriptRaw?: string | null;
  transcriptLanguage?: ConversationTranscriptLanguage;
  sttProvider?: ConversationSttProvider;
  audioDocumentId?: string | null;
  durationMs?: number | null;
  recordedByUserId: string;
  recordedByLabel?: string | null;
}

export interface ConversationActivityComposerContext {
  contextType: ConversationActivityContextType;
  contextId: string;
  entityLabel: string;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  loanFileId?: string | null;
  product?: string;
  stage?: string;
  customerName?: string;
}

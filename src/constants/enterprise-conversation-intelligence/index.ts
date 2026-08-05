/**
 * CO-VOICE-002 — ECIE Wave 1 constants.
 */

export const ECIE_WAVE = 1 as const;
export const ECIE_CAPABILITY_ID = "CO-VOICE-002" as const;

/** Document Registry typeRef for conversation audio. */
export const CONVERSATION_AUDIO_TYPE_REF = "doc:conversation-audio";

export const CONVERSATION_AUDIO_CATEGORY_LABEL = "Conversation Audio";

export const ECIE_ACTIVITY_UPDATED_EVENT = "ecie:conversation-activity-updated";

export const CONVERSATION_COMPOSER_MODES = [
  "type_note",
  "record_voice",
  "attach_document",
  "capture_image",
  "schedule_followup",
  "create_task",
] as const;

export type ConversationComposerMode = (typeof CONVERSATION_COMPOSER_MODES)[number];

/** Wave 1: only type + voice are fully enabled; others show Coming soon. */
export const CONVERSATION_COMPOSER_WAVE1_ENABLED: ConversationComposerMode[] = [
  "type_note",
  "record_voice",
];

export const CONVERSATION_COMPOSER_MODE_LABELS: Record<ConversationComposerMode, string> = {
  type_note: "Type Note",
  record_voice: "Record Voice",
  attach_document: "Attach File",
  capture_image: "Capture Image",
  schedule_followup: "Schedule Follow-up",
  create_task: "Create Task",
};

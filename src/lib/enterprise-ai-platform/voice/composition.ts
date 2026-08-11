/**
 * Voice ports composition — provider-independent STT / TTS / VAD (CO-AI-113).
 */

import type { EaiVoicePorts, PartialEaiVoicePorts } from "@/types/enterprise-ai-voice";
import { createStubEaiVoicePorts } from "./stub-providers";

let activeVoicePorts: EaiVoicePorts = createStubEaiVoicePorts();

export function getEaiVoicePorts(): EaiVoicePorts {
  return activeVoicePorts;
}

export function configureEaiVoicePorts(overrides: PartialEaiVoicePorts): void {
  activeVoicePorts = { ...activeVoicePorts, ...overrides };
}

export function resetEaiVoiceComposition(): void {
  activeVoicePorts = createStubEaiVoicePorts();
}

export function getActiveEaiSttProviderId(): string {
  return activeVoicePorts.sttProvider.providerId;
}

export function getActiveEaiTtsProviderId(): string {
  return activeVoicePorts.ttsProvider.providerId;
}

export function getActiveEaiVadProviderId(): string {
  return activeVoicePorts.vadProvider.providerId;
}

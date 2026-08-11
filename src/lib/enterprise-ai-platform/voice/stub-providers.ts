/**
 * Stub STT / TTS / VAD providers — provider-independent contracts (CO-AI-113).
 * Never import vendor speech SDKs here.
 */

import {
  EAI_STUB_STT_PROVIDER_ID,
  EAI_STUB_TTS_PROVIDER_ID,
  EAI_STUB_VAD_PROVIDER_ID,
  EAI_VOICE_SUPPORTED_LANGUAGES,
} from "@/constants/enterprise-ai-platform/voice";
import type {
  EaiSttProvider,
  EaiSttRequest,
  EaiSttResult,
  EaiTtsChunk,
  EaiTtsProvider,
  EaiTtsRequest,
  EaiTtsResult,
  EaiVadDecision,
  EaiVadProvider,
  EaiVadRequest,
  EaiVoiceAudioFrame,
  EaiVoicePorts,
} from "@/types/enterprise-ai-voice";

function nowIso(): string {
  return new Date().toISOString();
}

function decodeStubTranscript(audio: EaiVoiceAudioFrame): string {
  // Stub convention: if data starts with "text:", treat remainder as transcript
  if (audio.data.startsWith("text:")) {
    return audio.data.slice("text:".length).trim();
  }
  if (audio.data.startsWith("b64text:")) {
    try {
      const raw = audio.data.slice("b64text:".length);
      if (typeof Buffer !== "undefined") {
        return Buffer.from(raw, "base64").toString("utf8");
      }
      return atob(raw);
    } catch {
      return "";
    }
  }
  return "";
}

export function createStubEaiSttProvider(): EaiSttProvider {
  return {
    providerId: EAI_STUB_STT_PROVIDER_ID,
    supportedLanguages: [...EAI_VOICE_SUPPORTED_LANGUAGES],
    async transcribe(request: EaiSttRequest): Promise<EaiSttResult> {
      const text = decodeStubTranscript(request.audio) || "[stub] Empty utterance";
      return {
        requestId: request.requestId,
        text,
        isFinal: true,
        confidence: 0.9,
        language: request.language,
        providerId: EAI_STUB_STT_PROVIDER_ID,
        rawProviderMeta: { mode: "stub" },
      };
    },
    async transcribeStream(request, onPartial) {
      const final = await this.transcribe(request);
      onPartial({
        requestId: request.requestId,
        text: final.text.slice(0, Math.max(1, Math.floor(final.text.length / 2))),
        isFinal: false,
        confidence: 0.5,
        language: request.language,
        providerId: EAI_STUB_STT_PROVIDER_ID,
      });
      onPartial({
        requestId: request.requestId,
        text: final.text,
        isFinal: true,
        confidence: final.confidence,
        language: request.language,
        providerId: EAI_STUB_STT_PROVIDER_ID,
      });
      return final;
    },
  };
}

export function createStubEaiTtsProvider(): EaiTtsProvider {
  return {
    providerId: EAI_STUB_TTS_PROVIDER_ID,
    supportedLanguages: [...EAI_VOICE_SUPPORTED_LANGUAGES],
    async synthesize(request: EaiTtsRequest): Promise<EaiTtsResult> {
      const audio: EaiVoiceAudioFrame = {
        frameId: `eai_aud_${crypto.randomUUID()}`,
        data: `tts:${request.text}`,
        mimeType: "audio/x-eai-stub",
        durationMs: Math.min(12000, 400 + request.text.split(/\s+/).length * 180),
        languageHint: request.language,
        createdAt: nowIso(),
      };
      return {
        requestId: request.requestId,
        audio,
        language: request.language,
        providerId: EAI_STUB_TTS_PROVIDER_ID,
        rawProviderMeta: { mode: "stub" },
      };
    },
    async synthesizeStream(request, onChunk) {
      const full = await this.synthesize(request);
      const mid = Math.ceil(request.text.length / 2);
      const parts = [request.text.slice(0, mid), request.text.slice(mid)].filter(Boolean);
      const chunks: EaiTtsChunk[] = parts.map((part, index) => {
        const chunk: EaiTtsChunk = {
          requestId: request.requestId,
          chunkIndex: index,
          audio: {
            frameId: `eai_aud_${crypto.randomUUID()}`,
            data: `tts-chunk:${part}`,
            mimeType: "audio/x-eai-stub",
            languageHint: request.language,
            createdAt: nowIso(),
          },
          isLast: index === parts.length - 1,
          providerId: EAI_STUB_TTS_PROVIDER_ID,
        };
        onChunk(chunk);
        return chunk;
      });
      return { ...full, chunks };
    },
  };
}

export function createStubEaiVadProvider(): EaiVadProvider {
  return {
    providerId: EAI_STUB_VAD_PROVIDER_ID,
    async detect(request: EaiVadRequest): Promise<EaiVadDecision> {
      const hasSpeech =
        request.audio.data.length > 0 && !request.audio.data.startsWith("silence:");
      return {
        decisionId: `eai_vad_${crypto.randomUUID()}`,
        speechDetected: hasSpeech,
        speechEnded: hasSpeech,
        confidence: hasSpeech ? 0.85 : 0.95,
        providerId: EAI_STUB_VAD_PROVIDER_ID,
        decidedAt: nowIso(),
      };
    },
  };
}

export function createStubEaiVoicePorts(): EaiVoicePorts {
  return {
    sttProvider: createStubEaiSttProvider(),
    ttsProvider: createStubEaiTtsProvider(),
    vadProvider: createStubEaiVadProvider(),
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  SARATHI_VOICE_LANGUAGES,
  SARATHI_VOICE_STATUS,
  sarathiSpeechLocale,
} from "@/constants/sarathi-voice";
import {
  isBrowserSpeechRecognitionAvailable,
  startLiveBrowserStt,
} from "@/lib/enterprise-conversation-intelligence";
import type { LiveSttSession } from "@/lib/enterprise-conversation-intelligence/stt";
import {
  cancelSarathiSpeech,
  isBrowserSpeechSynthesisAvailable,
  useMicWaveform,
} from "@/lib/sarathi-voice";
import type { EaiVoiceLanguageCode } from "@/types/enterprise-ai-voice";
import { cn } from "@/lib/utils";

function VoiceWaveform({ levels }: { levels: number[] }) {
  return (
    <div
      className="flex h-8 flex-1 items-end gap-0.5 px-1"
      aria-hidden
      role="presentation"
    >
      {levels.map((level, i) => (
        <span
          key={i}
          className="w-1 min-h-[4px] rounded-full bg-teal-600/80 transition-[height] duration-75"
          style={{ height: `${Math.round(level * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function ConversationComposer({
  disabled,
  onSend,
  language,
  onLanguageChange,
  ttsEnabled,
  onTtsEnabledChange,
  onVoiceStatusChange,
  className,
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
  language: EaiVoiceLanguageCode;
  onLanguageChange: (code: EaiVoiceLanguageCode) => void;
  ttsEnabled: boolean;
  onTtsEnabledChange: (enabled: boolean) => void;
  /** Notify parent when mic recording starts/stops for status chrome */
  onVoiceStatusChange?: (status: "idle" | "recording") => void;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [recording, setRecording] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const sttRef = useRef<LiveSttSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const levels = useMicWaveform(micStream, recording);

  const stopVoiceCapture = () => {
    sttRef.current?.stop();
    sttRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicStream(null);
    setRecording(false);
    onVoiceStatusChange?.("idle");
  };

  useEffect(() => {
    return () => {
      stopVoiceCapture();
      cancelSarathiSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    setVoiceHint(null);
    cancelSarathiSpeech();

    if (!isBrowserSpeechRecognitionAvailable()) {
      setVoiceHint(SARATHI_VOICE_STATUS.unsupported);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicStream(stream);

      const stt = startLiveBrowserStt({
        lang: sarathiSpeechLocale(language),
        onPartial: (text) => setValue(text),
      });
      sttRef.current = stt;

      if (!stt) {
        setVoiceHint(SARATHI_VOICE_STATUS.sttFailed);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setMicStream(null);
        return;
      }

      setRecording(true);
      onVoiceStatusChange?.("recording");
    } catch {
      setVoiceHint(SARATHI_VOICE_STATUS.micDenied);
      stopVoiceCapture();
    }
  };

  const stopRecording = () => {
    const live = sttRef.current?.getTranscript() ?? "";
    if (live.trim()) setValue(live.trim());
    stopVoiceCapture();
    if (!live.trim() && !value.trim()) {
      setVoiceHint(SARATHI_VOICE_STATUS.sttFailed);
    }
  };

  const toggleMic = () => {
    if (disabled) return;
    if (recording) stopRecording();
    else void startRecording();
  };

  const submit = () => {
    const text = value.trim();
    if (!text || disabled || recording) return;
    onSend(text);
    setValue("");
    setVoiceHint(null);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {recording ? (
        <div
          className="flex items-center gap-3 rounded-xl border border-teal-600/30 bg-teal-50/80 px-3 py-2 dark:bg-teal-950/30"
          role="status"
          aria-live="polite"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <span className="shrink-0 text-xs font-medium text-foreground">
            {SARATHI_VOICE_STATUS.recording}
          </span>
          <VoiceWaveform levels={levels} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 shrink-0 rounded-full text-xs"
            onClick={stopRecording}
          >
            Stop
          </Button>
        </div>
      ) : null}

      <div className="relative rounded-2xl border border-border/60 bg-background shadow-sm focus-within:ring-2 focus-within:ring-teal-600/30">
        <Textarea
          value={value}
          disabled={disabled}
          rows={2}
          placeholder={
            recording
              ? "Speak now — your words appear here…"
              : "Tell me what’s on your mind… or tap the mic"
          }
          className="min-h-[3.25rem] resize-none border-0 bg-transparent px-4 pb-12 pt-3 text-[15px] shadow-none focus-visible:ring-0"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          aria-label="Talk with SARATHI"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-2 pb-2">
          <Select
            value={language}
            onValueChange={(v) => onLanguageChange(v as EaiVoiceLanguageCode)}
            disabled={disabled || recording}
          >
            <SelectTrigger
              className="h-8 w-[7.5rem] shrink-0 rounded-full border-border/60 text-xs"
              aria-label="Consultation language"
            >
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {SARATHI_VOICE_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            size="icon"
            variant={recording ? "destructive" : "outline"}
            className={cn(
              "h-8 w-8 shrink-0 rounded-full",
              recording && "animate-pulse",
            )}
            disabled={disabled}
            onClick={toggleMic}
            aria-pressed={recording}
            aria-label={recording ? "Stop recording" : "Start voice input"}
            title={recording ? "Stop recording" : "Speak"}
          >
            {recording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground"
            disabled={!isBrowserSpeechSynthesisAvailable()}
            onClick={() => onTtsEnabledChange(!ttsEnabled)}
            aria-pressed={ttsEnabled}
            aria-label={ttsEnabled ? "Mute SARATHI speech" : "Enable SARATHI speech"}
            title={ttsEnabled ? "Mute replies" : "Speak replies"}
          >
            {ttsEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1" />

          <Button
            type="button"
            size="sm"
            className="h-8 rounded-full px-5"
            disabled={disabled || recording || !value.trim()}
            onClick={submit}
          >
            Send
          </Button>
        </div>
      </div>

      {voiceHint ? (
        <p className="text-xs text-muted-foreground" role="status">
          {voiceHint}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Voice uses your browser’s speech recognition. Edit the transcript before
          sending anytime.
        </p>
      )}
    </div>
  );
}

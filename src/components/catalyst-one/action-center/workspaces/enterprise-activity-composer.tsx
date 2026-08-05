"use client";

/**
 * CO-VOICE-002 / CO-UX-014 — Enterprise Activity Composer (single implementation).
 * presentation="sheet" — Action Center Context Workspace (default)
 * presentation="inline" — embedded host (Strategic Workspace Notes replacement)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Camera,
  CheckSquare,
  Mic,
  Paperclip,
  Pause,
  Play,
  Square,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { ContextWorkspaceShell } from "@/components/catalyst-one/action-center/context-workspace-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CONVERSATION_COMPOSER_MODE_LABELS,
  CONVERSATION_COMPOSER_WAVE1_ENABLED,
  type ConversationComposerMode,
} from "@/constants/enterprise-conversation-intelligence";
import {
  isBrowserSpeechRecognitionAvailable,
  resolveWave1Transcript,
  saveConversationActivity,
  startLiveBrowserStt,
} from "@/lib/enterprise-conversation-intelligence";
import type { LiveSttSession } from "@/lib/enterprise-conversation-intelligence/stt";
import type { ConversationActivityComposerContext } from "@/types/enterprise-conversation-activity";
import { cn } from "@/lib/utils";

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const MODE_ICONS: Record<ConversationComposerMode, React.ComponentType<{ className?: string }>> = {
  type_note: Type,
  record_voice: Mic,
  attach_document: Paperclip,
  capture_image: Camera,
  schedule_followup: CalendarClock,
  create_task: CheckSquare,
};

export type EnterpriseActivityComposerPresentation = "sheet" | "inline";

export function EnterpriseActivityComposer({
  open = true,
  onOpenChange,
  composer,
  actorUserId,
  actorLabel,
  onSaved,
  presentation = "sheet",
  heading = "Add Activity",
  className,
}: {
  /** Sheet: controls Context Workspace visibility. Inline: ignored (always shown when mounted). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  composer: ConversationActivityComposerContext;
  actorUserId: string;
  actorLabel?: string;
  onSaved?: () => void;
  /** CO-UX-014 — inline embeds in page layout; sheet is Action Center overlay. */
  presentation?: EnterpriseActivityComposerPresentation;
  heading?: string;
  className?: string;
}) {
  const isInline = presentation === "inline";
  const [mode, setMode] = useState<ConversationComposerMode>("type_note");
  const [note, setNote] = useState("");
  const [transcript, setTranscript] = useState("");
  const [sttMessage, setSttMessage] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const accumulatedRef = useRef(0);
  const sttRef = useRef<LiveSttSession | null>(null);

  const reset = useCallback(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
    sttRef.current?.stop();
    sttRef.current = null;
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setMode("type_note");
    setNote("");
    setTranscript("");
    setSttMessage(null);
    setRecording(false);
    setPaused(false);
    setElapsedMs(0);
    setAudioUrl(null);
    setAudioBlob(null);
    setSaving(false);
    chunksRef.current = [];
    accumulatedRef.current = 0;
  }, [audioUrl]);

  useEffect(() => {
    if (!isInline && !open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isInline]);

  useEffect(() => {
    // Reset draft when switching Strategic Workspace contact context.
    if (isInline) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composer.contextId, isInline]);

  const startTicker = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    startedAtRef.current = Date.now();
    tickRef.current = window.setInterval(() => {
      setElapsedMs(accumulatedRef.current + (Date.now() - startedAtRef.current));
    }, 200);
  };

  const stopTicker = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
    accumulatedRef.current += Date.now() - startedAtRef.current;
    setElapsedMs(accumulatedRef.current);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        const live = sttRef.current?.getTranscript() ?? "";
        const resolved = resolveWave1Transcript({ liveTranscript: live, languageHint: "auto" });
        setTranscript(resolved.transcript);
        setSttMessage(resolved.message ?? null);
        sttRef.current?.stop();
        sttRef.current = null;
      };
      recorder.start(250);
      accumulatedRef.current = 0;
      setElapsedMs(0);
      setRecording(true);
      setPaused(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setTranscript("");
      setSttMessage(null);
      startTicker();

      const stt = startLiveBrowserStt({
        lang: "en-IN",
        onPartial: (text) => setTranscript(text),
      });
      sttRef.current = stt;
      if (!stt) {
        setSttMessage(
          isBrowserSpeechRecognitionAvailable()
            ? "Could not start speech recognition. You can type the transcript after recording."
            : "Browser speech recognition unavailable. Record audio, then enter the transcript manually.",
        );
      }
    } catch {
      toast.error("Microphone permission is required to record a voice activity.");
    }
  };

  const pauseRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== "recording") return;
    rec.pause();
    stopTicker();
    setPaused(true);
  };

  const resumeRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== "paused") return;
    rec.resume();
    startTicker();
    setPaused(false);
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (rec.state === "recording" || rec.state === "paused") {
      stopTicker();
      rec.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
    setPaused(false);
  };

  const discardAll = () => {
    sttRef.current?.stop();
    sttRef.current = null;
    if (recording) stopRecording();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setTranscript("");
    setNote("");
    setSttMessage(null);
    setElapsedMs(0);
    accumulatedRef.current = 0;
    chunksRef.current = [];
    setMode("type_note");
  };

  const onSave = async () => {
    if (mode === "type_note") {
      if (!note.trim()) {
        toast.message("Enter a note before saving.");
        return;
      }
    } else if (mode === "record_voice") {
      if (recording) {
        toast.message("Stop recording before saving.");
        return;
      }
      if (!audioBlob) {
        toast.message("Record audio or switch to Type Note.");
        return;
      }
      if (!transcript.trim()) {
        toast.message("Enter or confirm the transcript before saving.");
        return;
      }
    } else {
      toast.message("This composer mode is reserved for a later Wave.");
      return;
    }

    setSaving(true);
    try {
      const file =
        mode === "record_voice" && audioBlob
          ? new File([audioBlob], `conversation-${Date.now()}.webm`, {
              type: audioBlob.type || "audio/webm",
            })
          : null;

      await saveConversationActivity({
        composer,
        channel: mode === "record_voice" ? "in_app_mic" : "typed_note",
        bodyText: mode === "type_note" ? note.trim() : transcript.trim(),
        transcriptText: mode === "record_voice" ? transcript.trim() : note.trim(),
        transcriptRaw: mode === "record_voice" ? transcript.trim() : undefined,
        transcriptLanguage: "auto",
        sttProvider:
          mode === "record_voice"
            ? transcript.trim()
              ? isBrowserSpeechRecognitionAvailable()
                ? "browser_speech_recognition"
                : "manual"
              : "manual"
            : "none",
        durationMs: mode === "record_voice" ? elapsedMs : null,
        audioFile: file,
        actorUserId,
        actorLabel,
      });
      toast.success("Activity saved.");
      onSaved?.();
      discardAll();
      if (!isInline) onOpenChange?.(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save activity.");
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <div className="space-y-3">
      {isInline ? (
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{heading}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Capture discussion with the shared Enterprise Activity Composer.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(CONVERSATION_COMPOSER_MODE_LABELS) as ConversationComposerMode[]).map(
          (id) => {
            const Icon = MODE_ICONS[id];
            const enabled = CONVERSATION_COMPOSER_WAVE1_ENABLED.includes(id);
            return (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={mode === id ? "default" : "outline"}
                className={cn("h-8 gap-1.5 text-xs", !enabled && "opacity-60")}
                disabled={!enabled}
                onClick={() => {
                  if (!enabled) {
                    toast.message("Coming in a later Wave.");
                    return;
                  }
                  setMode(id);
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {CONVERSATION_COMPOSER_MODE_LABELS[id]}
                {!enabled ? " · Soon" : null}
              </Button>
            );
          },
        )}
      </div>

      {!isInline && (composer.customerName || composer.product || composer.stage) ? (
        <p className="text-xs text-muted-foreground">
          {[composer.customerName, composer.product, composer.stage].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      {mode === "type_note" ? (
        <div className="space-y-2">
          {!isInline ? <Label htmlFor="ecie-note">Note</Label> : null}
          <Textarea
            id="ecie-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write meeting notes, discussion points, or follow-ups…"
            className={cn(isInline ? "min-h-[160px] text-sm" : "min-h-[140px]")}
          />
        </div>
      ) : null}

      {mode === "record_voice" ? (
        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium tabular-nums">{formatClock(elapsedMs)}</p>
            <p className="text-[11px] text-muted-foreground">
              {recording ? (paused ? "Paused" : "Recording…") : audioBlob ? "Ready for review" : "Idle"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!recording && !audioBlob ? (
              <Button type="button" size="sm" onClick={() => void startRecording()}>
                <Mic className="mr-1.5 h-3.5 w-3.5" />
                Record
              </Button>
            ) : null}
            {recording && !paused ? (
              <Button type="button" size="sm" variant="outline" onClick={pauseRecording}>
                <Pause className="mr-1.5 h-3.5 w-3.5" />
                Pause
              </Button>
            ) : null}
            {recording && paused ? (
              <Button type="button" size="sm" variant="outline" onClick={resumeRecording}>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Resume
              </Button>
            ) : null}
            {recording ? (
              <Button type="button" size="sm" variant="destructive" onClick={stopRecording}>
                <Square className="mr-1.5 h-3.5 w-3.5" />
                Stop
              </Button>
            ) : null}
          </div>
          {audioUrl ? (
            <audio controls src={audioUrl} className="w-full">
              <track kind="captions" />
            </audio>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="ecie-transcript">Transcript (editable)</Label>
            <Textarea
              id="ecie-transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Transcript appears here after recording — edit before save."
              className={cn(isInline ? "min-h-[140px] text-sm" : "min-h-[120px]")}
            />
            {sttMessage ? (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">{sttMessage}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => {
            discardAll();
            if (!isInline) onOpenChange?.(false);
          }}
          disabled={saving}
        >
          Discard
        </Button>
        <Button type="button" size="sm" className="h-8" onClick={() => void onSave()} disabled={saving}>
          {saving ? "Saving…" : "Save Activity"}
        </Button>
      </div>
    </div>
  );

  if (isInline) {
    return (
      <section
        className={cn(
          "rounded-lg border border-border/70 bg-background/90 p-3 shadow-sm",
          className,
        )}
      >
        {body}
      </section>
    );
  }

  return (
    <ContextWorkspaceShell
      open={Boolean(open)}
      onOpenChange={(next) => onOpenChange?.(next)}
      title={heading}
      description="Enterprise Activity Composer — capture a note or voice conversation. Nothing updates CRM fields in Wave 1."
      entityLabel={composer.entityLabel}
      eyebrow="ECIE · Wave 1"
    >
      {body}
    </ContextWorkspaceShell>
  );
}

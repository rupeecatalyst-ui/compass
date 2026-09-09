"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CHANAKYA_INAPP_CONVERSATION_PROMPTS } from "@/constants/chanakya-inapp-conversation";
import { EMPLOYEE_PWA_NO_LIVE_LENDER_RECOMMENDATION } from "@/constants/employee-pwa";
import { CHANAKYA_CHAT_READ_ONLY_SHORT as READ_ONLY } from "@/constants/chanakya-chat-ux";
import { employeePwaJson } from "@/lib/employee-pwa/api";
import { CHANAKYA_CHAT_ALLOWED_INTERNAL_HREF_PREFIXES } from "@/constants/chanakya-chat-ux";

type ChatTurn = { role: "user" | "assistant"; text: string };

export function EmployeePwaChanakya() {
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [error, setError] = useState("");
  const [streaming, setStreaming] = useState(false);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setStreaming(true);
    setError("");
    setTurns((prev) => [...prev, { role: "user", text: trimmed }]);
    setMessage("");
    try {
      const result = await employeePwaJson<{
        sessionId?: string;
        message?: { text?: string };
        reply?: string;
        answer?: string;
      }>("/api/chanakya/conversation", {
        method: "POST",
        body: JSON.stringify({
          message: trimmed,
          sessionId,
        }),
      });
      setSessionId(result.sessionId || sessionId);
      const replyValue = result.reply as { text?: string } | string | undefined;
      const reply =
        result.message?.text ||
        result.answer ||
        (typeof replyValue === "string" ? replyValue : replyValue?.text) ||
        "CHANAKYA did not return a message.";
      setTurns((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CHANAKYA is unavailable.");
    } finally {
      setBusy(false);
      setStreaming(false);
    }
  };

  return (
    <div data-employee-pwa-chanakya="true" className="space-y-3">
      <h1 className="text-xl font-semibold">CHANAKYA</h1>
      <p className="text-xs text-muted-foreground">{READ_ONLY}</p>
      <p className="text-xs text-muted-foreground">{EMPLOYEE_PWA_NO_LIVE_LENDER_RECOMMENDATION}</p>
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline" className="min-h-11">
          <Link href="/pwa/chanakya/radar">Radar</Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {CHANAKYA_INAPP_CONVERSATION_PROMPTS.map((prompt) => (
          <Button
            key={prompt.id}
            type="button"
            size="sm"
            variant="secondary"
            className="min-h-11 text-left"
            disabled={busy}
            onClick={() => void ask(prompt.label)}
          >
            {prompt.label}
          </Button>
        ))}
      </div>
      <div className="space-y-2 rounded-xl border bg-card p-3 text-sm">
        {turns.map((turn, index) => (
          <p key={`${turn.role}-${index}`} className={turn.role === "user" ? "font-medium" : "text-muted-foreground"}>
            {turn.text}
          </p>
        ))}
        {streaming ? <p data-employee-pwa-chanakya-streaming="true">CHANAKYA is composing…</p> : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <label className="text-xs font-medium" htmlFor="chanakya-question">
        Ask CHANAKYA
      </label>
      <Textarea
        id="chanakya-question"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className="min-h-24"
        placeholder="Type a question"
      />
      <Button type="button" className="min-h-11 w-full" disabled={busy} onClick={() => void ask(message)}>
        Send
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Deep links stay inside Catalyst One ({CHANAKYA_CHAT_ALLOWED_INTERNAL_HREF_PREFIXES.join(", ")}).
        External web answers are not enabled.
      </p>
    </div>
  );
}

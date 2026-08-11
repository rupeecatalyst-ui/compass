/**
 * CO-SARATHI-VOICE-001 — live mic amplitude bars from AnalyserNode (real audio).
 */

"use client";

import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 24;

export function useMicWaveform(stream: MediaStream | null, active: boolean): number[] {
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: BAR_COUNT }, () => 0.08));
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !active) {
      setLevels(Array.from({ length: BAR_COUNT }, () => 0.08));
      return;
    }

    let cancelled = false;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (cancelled) return;
      analyser.getByteFrequencyData(data);
      const next: number[] = [];
      const step = Math.max(1, Math.floor(data.length / BAR_COUNT));
      for (let i = 0; i < BAR_COUNT; i += 1) {
        const v = data[i * step] ?? 0;
        next.push(Math.max(0.08, Math.min(1, v / 180)));
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    void ctx.resume().then(() => {
      if (!cancelled) rafRef.current = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        /* ignore */
      }
      void ctx.close();
      ctxRef.current = null;
    };
  }, [stream, active]);

  return levels;
}

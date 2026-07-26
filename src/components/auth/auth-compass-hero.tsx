"use client";

import { cn } from "@/lib/utils";

/**
 * CO-SPRINT-118 — Lightweight animated COMPASS for authentication hero.
 * CSS transforms only; respects prefers-reduced-motion.
 */
export function AuthCompassHero({ className }: { className?: string }) {
  const marks = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div className={cn("auth-compass mx-auto", className)} aria-hidden>
      <div className="auth-compass__ring" />
      <div className="auth-compass__dial">
        {marks.map((deg) => (
          <span
            key={deg}
            className={cn("auth-compass__mark", deg === 0 && "auth-compass__mark--n")}
            style={{ transform: `rotate(${deg}deg)` }}
          />
        ))}
        <div className="auth-compass__needle" />
        <div className="auth-compass__hub" />
      </div>
      <span className="sr-only">COMPASS — guidance and decision intelligence</span>
    </div>
  );
}

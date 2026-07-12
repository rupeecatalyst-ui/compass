"use client";

/**
 * Isolated Horizon shell — independent of Mission Control and Dashboard layouts.
 */
export function HorizonShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(24,24,27,0.9), rgba(9,9,11,1)), radial-gradient(circle at 1px 1px, rgba(63,63,70,0.35) 1px, transparent 0)",
          backgroundSize: "auto, 24px 24px",
        }}
        aria-hidden
      />
      <main className="relative mx-auto max-w-[1600px] px-4 py-5 md:px-6 md:py-6">
        {children}
      </main>
    </div>
  );
}

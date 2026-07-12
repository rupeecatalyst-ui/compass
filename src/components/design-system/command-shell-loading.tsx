import { cn } from "@/lib/utils";

/**
 * Dark command-shell loading surface (Mission Control, Horizon).
 * Stabilization primitive — matches existing “Preparing …” blocks.
 */
export function CommandShellLoading({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-sm text-zinc-500",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {label}
    </div>
  );
}

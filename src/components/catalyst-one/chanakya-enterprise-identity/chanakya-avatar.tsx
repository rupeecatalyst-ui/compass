"use client";

import Image from "next/image";
import { getActiveChanakyaAvatarPack } from "@/lib/chanakya-enterprise-identity";
import type { ChanakyaAvatarShape, ChanakyaAvatarSize } from "@/types/chanakya-enterprise-identity";
import { cn } from "@/lib/utils";

const SIZE_MAP: Record<ChanakyaAvatarSize, { box: string; sizes: string }> = {
  xs: { box: "h-8 w-8", sizes: "32px" },
  sm: { box: "h-10 w-10", sizes: "40px" },
  md: { box: "h-11 w-11", sizes: "44px" },
  lg: { box: "h-12 w-12 md:h-14 md:w-14", sizes: "56px" },
  xl: { box: "h-28 w-28 sm:h-32 sm:w-32", sizes: "128px" },
};

export interface ChanakyaAvatarProps {
  size?: ChanakyaAvatarSize;
  shape?: ChanakyaAvatarShape;
  /** Subtle presence pulse — minimal animation per CEI contract. */
  animate?: boolean;
  priority?: boolean;
  className?: string;
}

/**
 * CF-CHANAKYA-009 — Configurable Enterprise Avatar Framework (initial pack).
 */
export function ChanakyaAvatar({
  size = "md",
  shape = "circle",
  animate = true,
  priority = false,
  className,
}: ChanakyaAvatarProps) {
  const pack = getActiveChanakyaAvatarPack();
  const dim = SIZE_MAP[size];
  const isRounded = shape === "rounded";

  return (
    <div
      className={cn(
        "relative shrink-0",
        dim.box,
        isRounded ? "rounded-2xl" : "rounded-full",
        className,
      )}
    >
      {animate && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 animate-pulse bg-violet-500/15",
            isRounded ? "rounded-2xl" : "rounded-full",
          )}
        />
      )}
      <div
        className={cn(
          "relative h-full w-full overflow-hidden border border-violet-400/35 shadow-sm dark:border-violet-700/40",
          isRounded ? "rounded-2xl" : "rounded-full",
        )}
      >
        <Image
          src={pack.portraitSrc}
          alt={`${pack.name} — CHANAKYA`}
          fill
          className="object-cover"
          sizes={dim.sizes}
          priority={priority}
        />
      </div>
    </div>
  );
}

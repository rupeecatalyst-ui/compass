"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  displayValue?: string;
  label: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  displayValue,
  label,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView || displayValue) return;

    const duration = 1600;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [inView, value, displayValue]);

  return (
    <div ref={ref} className={cn("text-center", className)}>
      <p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {displayValue ?? (
          <>
            {prefix}
            {count.toLocaleString("en-IN")}
            {suffix}
          </>
        )}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProductChipProps {
  label: string;
  icon: React.ReactNode;
  index?: number;
  variant?: "borrow" | "invest";
}

export function ProductChip({ label, icon, index = 0, variant = "borrow" }: ProductChipProps) {
  return (
    <motion.button
      type="button"
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left glass-panel glass-panel-hover",
        variant === "invest" && "hover:border-accent/25",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
          variant === "borrow"
            ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
            : "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground",
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </motion.button>
  );
}

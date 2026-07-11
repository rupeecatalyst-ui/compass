"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { BorrowNavCategory } from "@/config/borrow-navigation";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface BorrowCategoryCardProps {
  category: BorrowNavCategory;
  index: number;
}

export function BorrowCategoryCard({ category, index }: BorrowCategoryCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.5, ease: smoothEase }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-xl sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {category.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{category.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{category.tagline}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Products</p>
        <ul className="mt-3 space-y-2">
          {category.products.map((product) => (
            <li key={product.id}>
              {product.future || !product.href ? (
                <span
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm",
                    "border border-white/[0.04] bg-white/[0.01] text-muted-foreground/70",
                  )}
                >
                  {product.label}
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                    Future
                  </span>
                </span>
              ) : (
                <Link
                  href={product.href}
                  className={cn(
                    "group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-foreground",
                    "transition-colors hover:border-primary/25 hover:bg-primary/[0.06]",
                  )}
                >
                  <span>{product.label}</span>
                  <span className="text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </motion.article>
  );
}

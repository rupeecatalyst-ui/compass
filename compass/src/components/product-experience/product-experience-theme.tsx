"use client";

import { getProductMood, type ProductId } from "@/config/product-moods";
import { cn } from "@/lib/utils";

interface ProductExperienceThemeProps {
  productId: ProductId;
  children: React.ReactNode;
  className?: string;
}

/**
 * Scopes product mood colors as CSS variables while preserving COMPASS identity.
 * Home Loan uses global tokens when unwrapped; other products inherit via this wrapper.
 */
export function ProductExperienceTheme({
  productId,
  children,
  className,
}: ProductExperienceThemeProps) {
  const { theme } = getProductMood(productId);

  return (
    <div
      className={cn("relative", className)}
      data-product={productId}
      style={{
        ["--primary" as string]: theme.primary,
        ["--primary-foreground" as string]: theme.primaryForeground,
        ["--accent" as string]: theme.accent,
        ["--accent-foreground" as string]: theme.accentForeground,
        ["--ring" as string]: theme.ring,
        ["--glow" as string]: theme.glow,
      }}
    >
      {children}
    </div>
  );
}

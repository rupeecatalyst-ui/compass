"use client";

import { ProductExperienceTheme } from "@/components/product-experience/product-experience-theme";

/** @deprecated Use ProductExperienceTheme directly. Kept for backward compatibility. */
export function PersonalLoanTheme({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ProductExperienceTheme productId="personal-loan" className={className}>
      {children}
    </ProductExperienceTheme>
  );
}

"use client";

import { Building2 } from "lucide-react";
import { ProductExperiencePage } from "@/components/product-experience/product-experience-page";
import { lapConversation } from "@/config/lap-conversation";
import { lapFloatingCards } from "@/config/lap-floating-cards";
import { lapLanding } from "@/config/lap-landing";

export function LapPageContent() {
  return (
    <ProductExperiencePage
      productId="loan-against-property"
      landing={lapLanding}
      floatingCards={lapFloatingCards}
      conversation={lapConversation}
      heroBadgeIcon={Building2}
    />
  );
}

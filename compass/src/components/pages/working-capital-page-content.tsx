"use client";

import { Wallet } from "lucide-react";
import { ProductExperiencePage } from "@/components/product-experience/product-experience-page";
import { workingCapitalConversation } from "@/config/working-capital-conversation";
import { workingCapitalFloatingCards } from "@/config/working-capital-floating-cards";
import { workingCapitalLanding } from "@/config/working-capital-landing";

export function WorkingCapitalPageContent() {
  return (
    <ProductExperiencePage
      productId="working-capital"
      landing={workingCapitalLanding}
      floatingCards={workingCapitalFloatingCards}
      conversation={workingCapitalConversation}
      heroBadgeIcon={Wallet}
    />
  );
}

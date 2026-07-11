"use client";

import { Hammer } from "lucide-react";
import { ProductExperiencePage } from "@/components/product-experience/product-experience-page";
import { constructionFinanceConversation } from "@/config/construction-finance-conversation";
import { constructionFinanceFloatingCards } from "@/config/construction-finance-floating-cards";
import { constructionFinanceLanding } from "@/config/construction-finance-landing";

export function ConstructionFinancePageContent() {
  return (
    <ProductExperiencePage
      productId="construction-finance"
      landing={constructionFinanceLanding}
      floatingCards={constructionFinanceFloatingCards}
      conversation={constructionFinanceConversation}
      heroBadgeIcon={Hammer}
    />
  );
}

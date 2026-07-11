"use client";

import { Briefcase } from "lucide-react";
import { ProductExperiencePage } from "@/components/product-experience/product-experience-page";
import { businessLoanConversation } from "@/config/business-loan-conversation";
import { businessLoanFloatingCards } from "@/config/business-loan-floating-cards";
import { businessLoanLanding } from "@/config/business-loan-landing";

export function BusinessLoanPageContent() {
  return (
    <ProductExperiencePage
      productId="business-loan"
      landing={businessLoanLanding}
      floatingCards={businessLoanFloatingCards}
      conversation={businessLoanConversation}
      heroBadgeIcon={Briefcase}
    />
  );
}

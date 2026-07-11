"use client";

import { Zap } from "lucide-react";
import { ProductExperiencePage } from "@/components/product-experience/product-experience-page";
import { personalLoanConversation } from "@/config/personal-loan-conversation";
import { personalLoanFloatingCards } from "@/config/personal-loan-floating-cards";
import { personalLoanLanding } from "@/config/personal-loan-landing";
import type { ProductConversationConfig } from "@/config/product-conversation-types";

const personalLoanProductConversation: ProductConversationConfig = {
  welcome: personalLoanConversation.welcome,
  analysis: personalLoanConversation.analysis,
  result: personalLoanConversation.result,
  steps: [
    {
      id: "intent",
      type: "options",
      prompt: personalLoanConversation.steps.intent.prompt,
      options: personalLoanConversation.steps.intent.options,
    },
    {
      id: "amount",
      type: "currency",
      prompt: personalLoanConversation.steps.amount.prompt,
      helper: personalLoanConversation.steps.amount.helper,
      placeholder: personalLoanConversation.steps.amount.placeholder,
    },
    {
      id: "city",
      type: "city",
      prompt: personalLoanConversation.steps.city.prompt,
      helper: personalLoanConversation.steps.city.helper,
      placeholder: personalLoanConversation.steps.city.placeholder,
    },
    {
      id: "reveal",
      type: "reveal",
      prompt: personalLoanConversation.steps.reveal.prompt,
      helper: personalLoanConversation.steps.reveal.helper,
      cta: personalLoanConversation.steps.reveal.cta,
    },
  ],
};

export function PersonalLoanPageContent() {
  return (
    <ProductExperiencePage
      productId="personal-loan"
      landing={personalLoanLanding}
      floatingCards={personalLoanFloatingCards}
      conversation={personalLoanProductConversation}
      heroBadgeIcon={Zap}
    />
  );
}

import { Suspense } from "react";
import { ContactStrategyWorkspace } from "@/components/catalyst-one/contact-strategy/contact-strategy-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/** Contact Strategy Workspace — strategic relationship engagement. */
export default function ContactStrategyPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="contact-strategy"
          statusLabel="Preparing Contact Strategy..."
          density="panel"
        />
      }
    >
      <ContactStrategyWorkspace />
    </Suspense>
  );
}

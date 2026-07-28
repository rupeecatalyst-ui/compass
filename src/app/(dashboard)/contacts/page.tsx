import { Suspense } from "react";
import { ContactsWorkspace } from "@/components/catalyst-one/directory/directory-workspace";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/** CO-SPRINT-094 — Enterprise Contact Registry (Enterprise Table Standard). */
export default function ContactsPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="contacts"
          statusLabel="Preparing Enterprise Contacts..."
          density="panel"
        />
      }
    >
      <ContactsWorkspace />
    </Suspense>
  );
}

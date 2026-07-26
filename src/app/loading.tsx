import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/** CO-UX-024 — Root route loading uses CHANAKYA Insight. */
export default function Loading() {
  return (
    <ChanakyaLoadingExperience
      module="enterprise"
      statusLabel="Preparing Catalyst One…"
      fullScreen
    />
  );
}

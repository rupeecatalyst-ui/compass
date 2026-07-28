import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/** CO-UX-008 — Root route loading uses CHANAKYA Loading Experience. */
export default function Loading() {
  return (
    <ChanakyaLoadingExperience
      module="enterprise"
      statusLabel="Preparing your workspace..."
      fullScreen
    />
  );
}

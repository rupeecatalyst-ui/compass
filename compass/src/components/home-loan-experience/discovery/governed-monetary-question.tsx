"use client";

import { useState } from "react";
import { PremiumSlider } from "@/components/home-loan-experience/discovery/premium-slider";
import { DiscoveryQuestionFrame } from "@/components/home-loan-experience/discovery/discovery-question-frame";
import {
  commitGovernedMonetaryAnswer,
  governedMonetaryVisualRupees,
} from "@/lib/governed-monetary-answer";
import { formatJourneyInrLabel } from "@/lib/journey-config";

export function GovernedMonetaryQuestion({
  fieldId,
  label,
  helpText,
  min,
  max,
  required,
  onCommit,
  onSkip,
}: {
  fieldId: string;
  label: string;
  helpText?: string;
  min: number;
  max: number;
  required: boolean;
  onCommit: (exactRupees: string) => void;
  onSkip: () => void;
}) {
  const visual = governedMonetaryVisualRupees({ fieldId, min, max });
  const [value, setValue] = useState(visual);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overLimitMessage = `Enter an amount up to ${formatJourneyInrLabel(max)}.`;

  const confirm = () => {
    const exact = commitGovernedMonetaryAnswer({ touched, value, min, max });
    if (exact == null) {
      if (!required && !touched) onSkip();
      return;
    }
    onCommit(exact);
  };

  return (
    <DiscoveryQuestionFrame
      label={label}
      helpText={helpText}
      message={error}
      action={{
        label: "Continue",
        disabled: Boolean(error) || (required && !touched),
        onClick: confirm,
      }}
    >
      <PremiumSlider
        value={value}
        min={min}
        max={max}
        minLabel={formatJourneyInrLabel(min)}
        maxLabel={formatJourneyInrLabel(max)}
        step={1}
        allowManualInput
        error={error}
        overLimitMessage={overLimitMessage}
        onManualError={setError}
        onChange={(next) => {
          setError(null);
          setTouched(true);
          setValue(Math.round(next));
        }}
      />
    </DiscoveryQuestionFrame>
  );
}

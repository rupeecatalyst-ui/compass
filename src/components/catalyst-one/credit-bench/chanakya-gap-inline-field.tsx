"use client";

/**
 * BAT #25 — Inline Chanakya gap field controls.
 * Reuses enterprise field components; no parallel validation/forms.
 */

import { useEffect, useState } from "react";
import { ApproxCibilScoreField } from "@/components/catalyst-one/shared/approx-cibil-score-field";
import { CitySelect } from "@/components/catalyst-one/shared/city-select";
import { EnterpriseLenderRegistrySelect } from "@/components/catalyst-one/shared/enterprise-lender-registry-select";
import { INRCurrencyInput } from "@/components/catalyst-one/shared/inr-currency-input";
import { PropertyTypeSelect } from "@/components/catalyst-one/shared/property-type-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LEAD_INFORMATION_EMPLOYMENT_OPTIONS,
  LEAD_INFORMATION_LENDING_TYPE_OPTIONS,
  LEAD_INFORMATION_NONE,
  LEAD_INFORMATION_PRODUCT_OPTIONS,
  resolveDefaultLendingTypeForProduct,
} from "@/constants/lead-information-workspace";
import type { ApproxCibilScoreBand } from "@/constants/cibil-score-master";
import type { PropertyType } from "@/constants/loan-stage-master";
import type { ChanakyaRecommendationGap } from "@/lib/chanakya-opportunity-recommendations";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";
import type { LoanFile } from "@/types/catalyst-one";

export type ChanakyaGapSavePayload =
  | {
      kind: "opportunity";
      patch: Partial<{
        productCode: string;
        productLabel: string;
        requestedAmount: number;
        lendingType: string;
        employmentTypeCode: string;
        approxCibilScore: string;
        cityLabel: string;
        stateLabel: string;
        btInstitutionId: string;
        btInstitutionName: string;
      }>;
      /** Optimistic LoanFile mirror for live derive */
      filePatch: Partial<LoanFile>;
    }
  | {
      kind: "stated";
      statedPatch: Partial<EcwStatedInformationDraft>;
      filePatch?: Partial<LoanFile>;
    };

function selectValue(raw: string | undefined): string {
  return raw?.trim() ? raw : LEAD_INFORMATION_NONE;
}

function fromSelectValue(value: string): string {
  return value === LEAD_INFORMATION_NONE ? "" : value;
}

export function ChanakyaGapInlineField({
  gap,
  file,
  stated,
  disabled,
  onSave,
}: {
  gap: ChanakyaRecommendationGap;
  file: LoanFile;
  stated: EcwStatedInformationDraft;
  disabled?: boolean;
  onSave: (payload: ChanakyaGapSavePayload) => void | Promise<void>;
}) {
  switch (gap.id) {
    case "product":
      return (
        <Select
          disabled={disabled}
          value={selectValue(
            LEAD_INFORMATION_PRODUCT_OPTIONS.find(
              (p) =>
                p.label === file.loanProduct ||
                p.code === file.loanProduct,
            )?.code ?? "",
          )}
          onValueChange={(v) => {
            const code = fromSelectValue(v);
            const hit = LEAD_INFORMATION_PRODUCT_OPTIONS.find((p) => p.code === code);
            if (!hit) return;
            const defaultLending = resolveDefaultLendingTypeForProduct(
              hit.code,
              hit.label,
            );
            void onSave({
              kind: "opportunity",
              patch: {
                productCode: hit.code,
                productLabel: hit.label,
                ...(defaultLending ? { lendingType: defaultLending } : {}),
              },
              filePatch: {
                loanProduct: hit.label,
                ...(defaultLending
                  ? { lendingType: defaultLending as LoanFile["lendingType"] }
                  : {}),
              },
            });
          }}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_INFORMATION_PRODUCT_OPTIONS.map((p) => (
              <SelectItem key={p.code} value={p.code} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "amount":
      return (
        <CurrencyGapField
          disabled={disabled}
          value={file.requiredAmount || file.loanAmount || undefined}
          placeholder="Required loan amount"
          onCommit={(amount) =>
            void onSave({
              kind: "opportunity",
              patch: { requestedAmount: amount },
              filePatch: { requiredAmount: amount, loanAmount: amount },
            })
          }
        />
      );

    case "lending_type":
      return (
        <Select
          disabled={disabled}
          value={selectValue(file.lendingType)}
          onValueChange={(v) => {
            const lendingType = fromSelectValue(v);
            if (lendingType !== "secured" && lendingType !== "unsecured") return;
            void onSave({
              kind: "opportunity",
              patch: { lendingType },
              filePatch: { lendingType },
            });
          }}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Secured / Unsecured" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_INFORMATION_LENDING_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "employment":
      return (
        <Select
          disabled={disabled}
          value={selectValue(file.employmentType)}
          onValueChange={(v) => {
            const employmentTypeCode = fromSelectValue(v);
            if (!employmentTypeCode) return;
            void onSave({
              kind: "opportunity",
              patch: { employmentTypeCode },
              filePatch: { employmentType: employmentTypeCode },
            });
          }}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Employment type" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_INFORMATION_EMPLOYMENT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "cibil":
      return (
        <ApproxCibilScoreField
          disabled={disabled}
          label="Expected CIBIL Score"
          required={false}
          value={(file.approxCibilScore as ApproxCibilScoreBand | undefined) ?? ""}
          onChange={(band) => {
            void onSave({
              kind: "opportunity",
              patch: { approxCibilScore: band },
              filePatch: { approxCibilScore: band },
            });
          }}
          triggerClassName="h-9 text-xs"
        />
      );

    case "city":
      return (
        <CitySelect
          city={file.city}
          state={file.state}
          onSelect={(entry) => {
            void onSave({
              kind: "opportunity",
              patch: { cityLabel: entry.city, stateLabel: entry.state },
              filePatch: { city: entry.city, state: entry.state },
            });
          }}
          inputClassName="h-9"
          placeholder="Search city…"
        />
      );

    case "bt_lender":
      return (
        <EnterpriseLenderRegistrySelect
          value={file.btInstitutionId}
          selectedName={file.btInstitutionName}
          onSelect={(lender) => {
            void onSave({
              kind: "opportunity",
              patch: {
                btInstitutionId: lender.id,
                btInstitutionName: lender.name,
              },
              filePatch: {
                btInstitutionId: lender.id,
                btInstitutionName: lender.name,
              },
            });
          }}
        />
      );

    case "property_type":
      return (
        <PropertyTypeSelect
          value={stated.statedPropertyType ?? file.propertyType}
          onSelect={(type: PropertyType) => {
            void onSave({
              kind: "stated",
              statedPatch: { statedPropertyType: type },
              filePatch: { propertyType: type },
            });
          }}
        />
      );

    case "property_value":
      return (
        <CurrencyGapField
          disabled={disabled}
          value={
            stated.statedPropertyValue
              ? Number(String(stated.statedPropertyValue).replace(/,/g, ""))
              : undefined
          }
          placeholder="Approx. property value"
          onCommit={(amount) =>
            void onSave({
              kind: "stated",
              statedPatch: { statedPropertyValue: String(amount) },
            })
          }
        />
      );

    default:
      return (
        <p className="text-[11px] text-muted-foreground">
          Complete this field in Opportunity Setup.
        </p>
      );
  }
}

/** Currency fields commit on blur to avoid partial auto-saves while typing. */
function CurrencyGapField({
  value,
  onCommit,
  placeholder,
  disabled,
}: {
  value?: number;
  onCommit: (amount: number) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<number | undefined>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div
      onBlur={() => {
        if (draft != null && draft > 0 && draft !== value) onCommit(draft);
      }}
    >
      <INRCurrencyInput
        disabled={disabled}
        value={draft}
        onChange={setDraft}
        className="h-9"
        placeholder={placeholder}
      />
    </div>
  );
}

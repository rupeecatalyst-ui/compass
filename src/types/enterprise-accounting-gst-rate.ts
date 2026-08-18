export type EnterpriseAccountingGstRateDto = {
  id: string;
  organizationId: string;
  name: string;
  ratePercent: number;
  enabled: boolean;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEnterpriseAccountingGstRateInput = {
  name: string;
  ratePercent: number;
  enabled?: boolean;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
};

export type UpdateEnterpriseAccountingGstRateInput = {
  name?: string;
  ratePercent?: number;
  enabled?: boolean;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
};

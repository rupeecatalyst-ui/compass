export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  statusCode?: number;
  /** CO-OPS-002 — request correlation for production diagnostics */
  correlationId?: string;
  /** CO-WP-006 — existing Wealth Partner when conversion is blocked */
  existingWealthPartner?: {
    partnerId: string;
    code: string;
    displayName: string;
    status: string;
    lifecycleStatus: string;
    operationalStatus?: string | null;
    createdAt: string;
    identityKind: string;
    reason?: string;
  };
  /** CO-CONTACT-IDENTITY-001 — soft-deleted Contact found for mobile */
  softDeletedContact?: {
    contactId: string;
    name: string;
    mobilePrimary: string;
    deletedAt?: string;
    deletedBy?: string;
    deletionReason?: string;
  };
  /** CO-CONTACT-IDENTITY-001 — active Contact already exists for mobile */
  activeContact?: {
    contactId: string;
    name: string;
    mobilePrimary: string;
  };
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: Required<Pick<ApiMeta, "page" | "limit" | "total" | "totalPages">>;
}

export type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

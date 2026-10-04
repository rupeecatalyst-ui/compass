import { authenticatedJsonFetch } from "@/lib/api-client";

export class EmployeePwaApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function employeePwaJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedJsonFetch(url, init);
  const json = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    error?: { message?: string };
    message?: string;
  };
  if (!response.ok) {
    throw new EmployeePwaApiError(
      json.error?.message || json.message || "Request failed",
      response.status,
    );
  }
  return (json.data ?? json) as T;
}

export function employeePwaIsOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

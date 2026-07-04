import { supabase } from "@/integrations/supabase/client";

export interface LeadInput {
  product?: string;
  name?: string;
  mobile: string;
  email?: string;
  city?: string;
  loan_amount?: number;
  sip_amount?: number;
  monthly_income?: number;
  occupation?: string;
  message?: string;
  source_page?: string;
  assessment?: Record<string, unknown>;
}

function getUtm() {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  return {
    utm_source: sp.get("utm_source") ?? undefined,
    utm_medium: sp.get("utm_medium") ?? undefined,
    utm_campaign: sp.get("utm_campaign") ?? undefined,
    utm_term: sp.get("utm_term") ?? undefined,
    utm_content: sp.get("utm_content") ?? undefined,
  };
}

function getDeviceInfo() {
  if (typeof window === "undefined") return {};
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  return {
    device_type: isMobile ? "mobile" : "desktop",
    browser: ua.slice(0, 200),
  };
}

export async function submitLead(input: LeadInput) {
  const payload = {
    ...input,
    ...getUtm(),
    ...getDeviceInfo(),
    source_page:
      input.source_page ??
      (typeof window !== "undefined" ? window.location.pathname : undefined),
  };
  const { error } = await supabase.from("leads" as never).insert(payload as never);
  if (error) throw error;
  return { ok: true };
}

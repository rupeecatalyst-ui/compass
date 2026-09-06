import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MarketingVisualHarnessApp, VISUAL_SURFACES } from "./surfaces";
import { resolveMarketingFixture } from "./fixture-data.js";
import "./harness.css";
import "../../src/styles/marketing-command-centre.css";
import "../../src/styles/marketing-visual-editor.css";

window.process = window.process || {
  env: {
    NODE_ENV: "development",
    ENTERPRISE_MARKETING_HANDOFF_MODE: "fixture",
  },
};

window.fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (/hostinger|googleapis|google\.com|smtp|twilio|whatsapp/i.test(url)) {
    throw new Error(`visual harness blocked external request: ${url}`);
  }
  let path = url;
  try {
    path = new URL(url, "http://visual-harness.local").pathname;
  } catch {
    path = url;
  }
  if (path.startsWith("/api/admin/marketing")) {
    return Promise.resolve(resolveMarketingFixture(url, init));
  }
  throw new Error(`visual harness blocked fetch: ${url}`);
};

const params = new URLSearchParams(window.location.search);
const surface = (params.get("surface") || "home") as keyof typeof VISUAL_SURFACES;
window.__MARKETING_BAT_STATE = params.get("batState") || "default";
const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("visual harness missing #root");

createRoot(rootEl).render(
  <StrictMode>
    <TooltipProvider delayDuration={0}>
      <MarketingVisualHarnessApp surface={surface} />
      <Toaster />
    </TooltipProvider>
  </StrictMode>,
);

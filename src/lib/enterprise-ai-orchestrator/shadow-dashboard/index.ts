export {
  EAO_SHADOW_DASHBOARD_VERSION,
  type EaoShadowDashboardComposeInput,
  type EaoShadowDashboardRow,
  type EaoShadowDashboardSnapshot,
} from "@/types/enterprise-ai-orchestrator/shadow-dashboard";
export {
  buildEaoShadowDashboardSnapshot,
  composeEaoShadowDashboardRow,
} from "./compose";
export { EAO_SHADOW_DASHBOARD_FIXTURES } from "./fixtures";
export { formatEaoShadowDashboardMarkdown } from "./format-report";

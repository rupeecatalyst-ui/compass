/**
 * CO-BIZ-004 — Enterprise Customer Engagement (canonical customer portal projection).
 * Consumes Deal · ETE · Document Requests/Registry · EDC. Never owns workflow status.
 */

export { composeCustomerEngagementSnapshot } from "./compose";
export { composeCustomerDashboard } from "./compose-dashboard";
export { projectCustomerTasks } from "./project-customer-tasks";
export { projectDocumentCentre } from "./project-documents";
export { projectCustomerTimeline } from "./project-timeline";
export { projectCustomerNotifications } from "./project-notifications";
export {
  listCustomerMessages,
  postCustomerQuestion,
  postStructuredUpdate,
  subscribeEceMessagesUpdated,
} from "./project-communication";
export { deriveCustomerExperienceScore } from "./derive-cx-score";

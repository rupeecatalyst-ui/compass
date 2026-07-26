/**
 * CO-UX-115 — User Home Dashboard widget slots (role packs later).
 */

export const USER_HOME_DASHBOARD_NAME = "User Home Dashboard" as const;

export const USER_HOME_WIDGET_SLOTS = [
  "welcome",
  "new_arrivals",
  "my_priorities",
  "my_business",
  "chanakya",
  "quick_actions",
  "todays_activity",
  "calendar",
  "performance_snapshot",
] as const;

export type UserHomeWidgetSlotId = (typeof USER_HOME_WIDGET_SLOTS)[number];

export const USER_HOME_FUTURE_ROLE_PACKS = [
  "RM",
  "Credit Manager",
  "Branch Manager",
  "Operations",
  "Super Admin",
  "CEO",
] as const;

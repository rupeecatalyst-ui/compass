import type { ChanakyaGreetingMoment } from "@/types/chanakya-greeting";

/** Local clock → greeting moment (CF-CHANAKYA-002). */
export function resolveChanakyaGreetingMoment(now: Date = new Date()): ChanakyaGreetingMoment {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

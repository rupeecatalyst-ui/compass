/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 — Unsubscribe applies to Marketing email only.
 */

export function marketingUnsubscribeAppliesToOperationalEmail(): false {
  return false;
}

export function marketingUnsubscribeAppliesToTransactionalEmail(): false {
  return false;
}

export function marketingUnsubscribeChannel(): "EMAIL" {
  return "EMAIL";
}

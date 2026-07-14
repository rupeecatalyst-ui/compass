/**
 * CF-CHANAKYA-006 — Daily Wisdom rotation for briefing dashboard.
 */

const CHANAKYA_WISDOM: { quote: string; actionHint: string; href: string; label: string }[] = [
  {
    quote: "Before you stretch for new revenue, clear the files already waiting at your desk.",
    actionHint: "Start with disbursements pending today — momentum compounds.",
    href: "/pipeline?stage=closure_wip",
    label: "Review Disbursements",
  },
  {
    quote: "A lender who has not replied in three days is not silent — they are waiting for you.",
    actionHint: "Your logged-in cases need banker follow-up before credit review stalls.",
    href: "/loan-files?stage=logged_in",
    label: "Follow Up Lenders",
  },
  {
    quote: "Incomplete profiles cost you twice — once in rework, once in lost trust.",
    actionHint: "Finish borrower profiles so loan journeys can begin without delay.",
    href: "/contacts",
    label: "Complete Profiles",
  },
  {
    quote: "The best operators do not chase every file — they protect the ones closest to revenue.",
    actionHint: "Two sanctions are ready but disbursement has not started.",
    href: "/pipeline?stage=final_approved",
    label: "Push Sanctions Forward",
  },
  {
    quote: "When credit raises a query, answer it the same day — speed is your competitive edge.",
    actionHint: "Nine credit queries are open on your pipeline.",
    href: "/loan-files?filter=credit_queries",
    label: "Resolve Credit Queries",
  },
];

export function pickDailyWisdom(date = new Date()) {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return CHANAKYA_WISDOM[dayOfYear % CHANAKYA_WISDOM.length]!;
}

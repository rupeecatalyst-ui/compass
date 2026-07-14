/**
 * CF-CHANAKYA-002 — CHANAKYA Greeting Library (metadata-driven seed).
 * Voice: Executive Business Mentor — warm, professional, never chatbot-like.
 * ECG may disable/reorder entries without changing UI code.
 */

import type { ChanakyaGreetingDefinition } from "@/types/chanakya-greeting";

const ANY = ["any"] as const;
const MORNING = ["morning", "any"] as const;
const AFTERNOON = ["afternoon", "any"] as const;
const EVENING = ["evening", "any"] as const;
const NIGHT = ["night", "any"] as const;
const DAY = ["morning", "afternoon", "evening", "any"] as const;

const GENERIC = ["generic"] as const;
const WELCOME = ["welcome_back", "generic"] as const;
const RESUME = ["resume", "generic"] as const;
const GUIDANCE = ["guidance", "generic"] as const;
const COMPLETION = ["completion", "guidance", "generic"] as const;
const CELEBRATION = ["celebration", "completion", "generic"] as const;

function g(
  id: string,
  pattern: string,
  moments: readonly ChanakyaGreetingDefinition["moments"][number][],
  contexts: readonly ChanakyaGreetingDefinition["contexts"][number][],
  tone: ChanakyaGreetingDefinition["tone"] = "mentor",
  weight = 1,
): ChanakyaGreetingDefinition {
  return { id, pattern, moments, contexts, tone, weight, enabled: true };
}

/**
 * 100+ metadata greetings. Patterns use `{name}` for personalization.
 * Keep short enough for card headers; longer mentoring belongs in body copy.
 */
export const CHANAKYA_GREETING_LIBRARY: readonly ChanakyaGreetingDefinition[] = [
  // —— Time-aware essentials ——
  g("gm-01", "Good Morning {name}.", MORNING, GENERIC, "professional", 3),
  g("gm-02", "Good Morning {name}. Ready when you are.", MORNING, GENERIC, "warm", 2),
  g("gm-03", "Good Morning {name}. Let's make today count.", MORNING, GENERIC, "mentor", 2),
  g("gm-04", "Good Morning {name}. A clear path starts here.", MORNING, GUIDANCE, "mentor", 2),
  g("gm-05", "Good Morning {name}. Shall we continue with intent?", MORNING, RESUME, "professional", 2),
  g("ga-01", "Good Afternoon {name}.", AFTERNOON, GENERIC, "professional", 3),
  g("ga-02", "Good Afternoon {name}. Steady progress matters.", AFTERNOON, GENERIC, "mentor", 2),
  g("ga-03", "Good Afternoon {name}. Let's keep momentum.", AFTERNOON, RESUME, "warm", 2),
  g("ga-04", "Good Afternoon {name}. I'm with you on this.", AFTERNOON, GUIDANCE, "mentor", 2),
  g("ge-01", "Good Evening {name}.", EVENING, GENERIC, "professional", 3),
  g("ge-02", "Good Evening {name}. A calm close beats a rushed one.", EVENING, GENERIC, "mentor", 2),
  g("ge-03", "Good Evening {name}. Let's finish what we started.", EVENING, RESUME, "warm", 2),
  g("ge-04", "Good Evening {name}. One clear step at a time.", EVENING, GUIDANCE, "mentor", 2),
  g("gn-01", "Hello {name}. Burning the midnight oil with purpose.", NIGHT, GENERIC, "mentor", 1),
  g("gn-02", "Hi {name}. Even late hours deserve clarity.", NIGHT, GUIDANCE, "professional", 1),

  // —— Core greetings ——
  g("hi-01", "Hi {name}.", ANY, GENERIC, "warm", 3),
  g("hi-02", "Hi {name}. Good to have you here.", ANY, WELCOME, "warm", 2),
  g("hi-03", "Hi {name}. Let's continue where we left off.", ANY, RESUME, "mentor", 3),
  g("hi-04", "Hi {name}. I'm here to help you move forward.", ANY, GUIDANCE, "mentor", 2),
  g("hello-01", "Hello {name}.", ANY, GENERIC, "professional", 3),
  g("hello-02", "Hello {name}. Shall we proceed thoughtfully?", ANY, GUIDANCE, "mentor", 2),
  g("hello-03", "Hello {name}. Clarity before speed.", ANY, GENERIC, "mentor", 2),
  g("wb-01", "Welcome back {name}.", ANY, WELCOME, "warm", 3),
  g("wb-02", "Welcome back {name}. Your context is ready.", ANY, WELCOME, "professional", 2),
  g("wb-03", "Welcome back {name}. Let's pick up with purpose.", ANY, RESUME, "mentor", 2),
  g("wb-04", "Great to see you again {name}.", ANY, WELCOME, "warm", 3),
  g("wb-05", "Good to see you again {name}.", ANY, WELCOME, "professional", 2),
  g("wb-06", "Nice to see you again {name}. Ready when you are.", ANY, WELCOME, "warm", 2),

  // —— Mentor / guidance ——
  g("guide-01", "Hi {name}. A few details will unlock the next step.", ANY, GUIDANCE, "mentor", 2),
  g("guide-02", "Hello {name}. Let's collect only what the journey needs.", ANY, GUIDANCE, "mentor", 2),
  g("guide-03", "Hi {name}. I'll keep this focused and practical.", ANY, GUIDANCE, "professional", 2),
  g("guide-04", "{name}, let's complete what matters for this process.", ANY, GUIDANCE, "mentor", 2),
  g("guide-05", "Hi {name}. One clear ask — then we continue.", ANY, GUIDANCE, "warm", 2),
  g("guide-06", "Hello {name}. I need your judgment on a few points.", ANY, GUIDANCE, "mentor", 2),
  g("guide-07", "Hi {name}. This won't take long — then we resume.", ANY, GUIDANCE, "warm", 2),
  g("guide-08", "{name}, I'll guide you through only the essentials.", ANY, GUIDANCE, "mentor", 2),
  g("guide-09", "Hi {name}. Progress starts with the right information.", ANY, GUIDANCE, "professional", 2),
  g("guide-10", "Hello {name}. Let's remove friction together.", ANY, GUIDANCE, "mentor", 2),

  // —— Resume / continuity ——
  g("resume-01", "Hi {name}, let's continue where we left off.", ANY, RESUME, "mentor", 3),
  g("resume-02", "Welcome back {name}. Picking up from your last step.", ANY, RESUME, "professional", 2),
  g("resume-03", "Hello {name}. Your journey is waiting — shall we?", ANY, RESUME, "warm", 2),
  g("resume-04", "Hi {name}. Continuity over restart.", ANY, RESUME, "mentor", 2),
  g("resume-05", "{name}, let's keep the thread intact.", ANY, RESUME, "mentor", 1),
  g("resume-06", "Good to have you back {name}. Context preserved.", ANY, RESUME, "professional", 2),
  g("resume-07", "Hi {name}. Back to business with clarity.", ANY, RESUME, "professional", 2),
  g("resume-08", "Hello {name}. Same path. Next milestone.", ANY, RESUME, "mentor", 2),

  // —— Completion / celebration ——
  g("done-01", "Great work {name}.", ANY, COMPLETION, "warm", 3),
  g("done-02", "Well done {name}.", ANY, COMPLETION, "professional", 2),
  g("done-03", "Excellent {name}. Profile discipline shows.", ANY, COMPLETION, "mentor", 2),
  g("done-04", "Nicely done {name}. We're ready for the next journey.", ANY, COMPLETION, "warm", 2),
  g("done-05", "Strong progress {name}.", ANY, CELEBRATION, "mentor", 2),
  g("done-06", "Outstanding focus {name}.", ANY, CELEBRATION, "professional", 1),
  g("done-07", "That's the way {name}. Clean completion.", ANY, COMPLETION, "mentor", 2),
  g("done-08", "Appreciate the thoroughness {name}.", ANY, COMPLETION, "professional", 2),

  // —— Morning expansions ——
  g("gm-06", "Good Morning {name}. Fresh focus for today's files.", MORNING, GENERIC, "mentor", 1),
  g("gm-07", "Good Morning {name}. Prioritize what moves loans forward.", MORNING, GUIDANCE, "mentor", 1),
  g("gm-08", "Good Morning {name}. Relationships compound — so does clarity.", MORNING, GENERIC, "mentor", 1),
  g("gm-09", "Good Morning {name}. Let's start with purpose.", MORNING, WELCOME, "warm", 1),
  g("gm-10", "Good Morning {name}. I'm ready when your first action is.", MORNING, GENERIC, "professional", 1),
  g("gm-11", "Good Morning {name}. Quiet confidence, sharp decisions.", MORNING, GENERIC, "mentor", 1),
  g("gm-12", "Good Morning {name}. Another day to serve customers well.", MORNING, GENERIC, "warm", 1),

  // —— Afternoon expansions ——
  g("ga-05", "Good Afternoon {name}. Midday is for decisive follow-through.", AFTERNOON, GENERIC, "mentor", 1),
  g("ga-06", "Good Afternoon {name}. Let's convert effort into outcomes.", AFTERNOON, GUIDANCE, "professional", 1),
  g("ga-07", "Good Afternoon {name}. Keep the pipeline honest and moving.", AFTERNOON, GENERIC, "mentor", 1),
  g("ga-08", "Good Afternoon {name}. One quality conversation can change a file.", AFTERNOON, GENERIC, "warm", 1),
  g("ga-09", "Good Afternoon {name}. Steady hands win long journeys.", AFTERNOON, RESUME, "mentor", 1),
  g("ga-10", "Good Afternoon {name}. Clarity over clutter.", AFTERNOON, GUIDANCE, "professional", 1),

  // —— Evening expansions ——
  g("ge-05", "Good Evening {name}. Close the day with unfinished business handled.", EVENING, GENERIC, "mentor", 1),
  g("ge-06", "Good Evening {name}. Quality over volume at this hour.", EVENING, GUIDANCE, "professional", 1),
  g("ge-07", "Good Evening {name}. A thoughtful last step still counts.", EVENING, RESUME, "warm", 1),
  g("ge-08", "Good Evening {name}. Protect tomorrow by finishing cleanly now.", EVENING, GENERIC, "mentor", 1),
  g("ge-09", "Good Evening {name}. Discipline at dusk is leadership.", EVENING, GENERIC, "mentor", 1),
  g("ge-10", "Good Evening {name}. Let's land this gently and correctly.", EVENING, GUIDANCE, "warm", 1),

  // —— Professional mentor bank ——
  g("mentor-01", "Hi {name}. Business clarity first — then pace.", ANY, GENERIC, "mentor", 1),
  g("mentor-02", "Hello {name}. Judgment is our advantage today.", ANY, GENERIC, "mentor", 1),
  g("mentor-03", "Hi {name}. Let's prefer the right ask over many asks.", ANY, GUIDANCE, "mentor", 1),
  g("mentor-04", "{name}, decisive professionals finish journeys.", ANY, RESUME, "mentor", 1),
  g("mentor-05", "Hello {name}. Trust is earned in details like these.", ANY, GUIDANCE, "mentor", 1),
  g("mentor-06", "Hi {name}. Stay composed; the path is still clear.", ANY, GENERIC, "mentor", 1),
  g("mentor-07", "Hello {name}. Mentorship means I remove friction, not add noise.", ANY, GUIDANCE, "mentor", 2),
  g("mentor-08", "Hi {name}. Every field we capture should earn its place.", ANY, GUIDANCE, "mentor", 1),
  g("mentor-09", "{name}, your standards set the tone for this workspace.", ANY, GENERIC, "professional", 1),
  g("mentor-10", "Hello {name}. Excellence is a habit of small finishes.", ANY, COMPLETION, "mentor", 1),
  g("mentor-11", "Hi {name}. Let's protect the customer's context.", ANY, GUIDANCE, "mentor", 1),
  g("mentor-12", "Hello {name}. Process without purpose is bureaucracy — we avoid that.", ANY, GENERIC, "mentor", 1),
  g("mentor-13", "Hi {name}. Think journey ownership, not form completion.", ANY, GUIDANCE, "mentor", 1),
  g("mentor-14", "{name}, composure under complexity is our craft.", ANY, GENERIC, "mentor", 1),
  g("mentor-15", "Hello {name}. I'll stay concise so you can stay focused.", ANY, GUIDANCE, "professional", 2),

  // —— Warm professional ——
  g("warm-01", "Hi {name}. Glad you're here.", ANY, WELCOME, "warm", 1),
  g("warm-02", "Hello {name}. Appreciate your attention on this.", ANY, GUIDANCE, "warm", 1),
  g("warm-03", "Hi {name}. Together, one step at a time.", ANY, RESUME, "warm", 1),
  g("warm-04", "Welcome {name}. Your work matters on every file.", ANY, WELCOME, "warm", 1),
  g("warm-05", "Hi {name}. Let's make this seamless.", ANY, GUIDANCE, "warm", 1),
  g("warm-06", "Hello {name}. Happy to guide the next move.", ANY, GUIDANCE, "warm", 1),
  g("warm-07", "Hi {name}. You've handled harder — this is straightforward.", ANY, GUIDANCE, "warm", 1),
  g("warm-08", "Good to connect {name}.", ANY, GENERIC, "warm", 1),
  g("warm-09", "Hi {name}. I'm right here if you need a nudge.", ANY, GENERIC, "warm", 1),
  g("warm-10", "Hello {name}. Your return is noted — let's deliver.", DAY, WELCOME, "warm", 1),

  // —— Openers with leadership cadence ——
  g("lead-01", "Hi {name}. Prioritize impact over activity.", ANY, GENERIC, "professional", 1),
  g("lead-02", "Hello {name}. Own the next outcome.", ANY, RESUME, "professional", 1),
  g("lead-03", "{name}, move with intent — not haste.", ANY, GENERIC, "mentor", 1),
  g("lead-04", "Hi {name}. Align to the journey, not the distraction.", ANY, GUIDANCE, "mentor", 1),
  g("lead-05", "Hello {name}. Customer trust sits behind every field.", ANY, GUIDANCE, "professional", 1),
  g("lead-06", "Hi {name}. Discipline today saves fire drills tomorrow.", ANY, GENERIC, "mentor", 1),
  g("lead-07", "{name}, accuracy is respect — for the customer and the lender.", ANY, GUIDANCE, "mentor", 1),
  g("lead-08", "Hello {name}. Let's advance this file professionally.", ANY, RESUME, "professional", 1),
  g("lead-09", "Hi {name}. Keep relationships warm and files cold with facts.", ANY, GENERIC, "mentor", 1),
  g("lead-10", "Hello {name}. The shortest path is the complete one.", ANY, COMPLETION, "mentor", 1),

  // —— Specific continuations ——
  g("cont-01", "Hi {name}. Continuing without losing context.", ANY, RESUME, "professional", 1),
  g("cont-02", "Hello {name}. Same conversation — sharper next step.", ANY, RESUME, "mentor", 1),
  g("cont-03", "Welcome back {name}. Nothing important was lost.", ANY, WELCOME, "warm", 1),
  g("cont-04", "Hi {name}. Re-centering on what this journey needs.", ANY, GUIDANCE, "mentor", 1),
  g("cont-05", "Hello {name}. Back on the critical path.", ANY, RESUME, "professional", 1),
  g("cont-06", "{name}, let's resume with business focus.", ANY, RESUME, "mentor", 1),
  g("cont-07", "Hi {name}. From where you paused — onward.", ANY, RESUME, "warm", 1),
  g("cont-08", "Good to have you {name}. The workspace remembered.", ANY, WELCOME, "professional", 1),

  // —— Closing-style encouragement (still greetings) ——
  g("enc-01", "Hi {name}. Confidence comes from prepared files.", ANY, GENERIC, "mentor", 1),
  g("enc-02", "Hello {name}. Preparation is quiet professionalism.", ANY, GUIDANCE, "professional", 1),
  g("enc-03", "Hi {name}. Small completions compound into wins.", ANY, COMPLETION, "warm", 1),
  g("enc-04", "{name}, finishing well is part of leading well.", ANY, COMPLETION, "mentor", 1),
  g("enc-05", "Hello {name}. You're closer than it looks.", ANY, GUIDANCE, "warm", 1),
  g("enc-06", "Hi {name}. Stay with the process — it works.", ANY, RESUME, "mentor", 1),
  g("enc-07", "Hello {name}. Diligence is our signature.", ANY, GENERIC, "professional", 1),
  g("enc-08", "Hi {name}. Thoughtful pace. Strong outcome.", ANY, GENERIC, "mentor", 1),

  // —— Extra variety bank to exceed 100 ——
  g("x-01", "Hi {name}. Shall we sharpen this journey?", ANY, GUIDANCE, "mentor", 1),
  g("x-02", "Hello {name}. Practical steps only.", ANY, GUIDANCE, "professional", 1),
  g("x-03", "Good day {name}.", DAY, GENERIC, "professional", 1),
  g("x-04", "Good day {name}. Let's stay decisive.", DAY, GENERIC, "mentor", 1),
  g("x-05", "Hi {name}. Ready for the next responsible step?", ANY, RESUME, "warm", 1),
  g("x-06", "Hello {name}. Business first, always.", ANY, GENERIC, "professional", 1),
  g("x-07", "{name}, a mentor's job is to unlock — not to block.", ANY, GUIDANCE, "mentor", 2),
  g("x-08", "Hi {name}. Context respected. Path clear.", ANY, RESUME, "professional", 1),
  g("x-09", "Welcome back {name}. Momentum favors the prepared.", ANY, WELCOME, "mentor", 1),
  g("x-10", "Hello {name}. Let's honor the borrower's time.", ANY, GUIDANCE, "warm", 1),
  g("x-11", "Hi {name}. Precision now saves explanations later.", ANY, GUIDANCE, "mentor", 1),
  g("x-12", "Good to see you {name}.", ANY, WELCOME, "warm", 2),
  g("x-13", "Hello {name}. Executive calm. Operational focus.", ANY, GENERIC, "mentor", 1),
  g("x-14", "Hi {name}. Make the next click meaningful.", ANY, GENERIC, "professional", 1),
  g("x-15", "{name}, we collect insight — not noise.", ANY, GUIDANCE, "mentor", 1),
  g("x-16", "Hello {name}. Progress is a series of responsible asks.", ANY, GUIDANCE, "mentor", 1),
  g("x-17", "Hi {name}. Onward — with standards intact.", ANY, RESUME, "professional", 1),
  g("x-18", "Welcome {name}. Let's serve this file well.", ANY, WELCOME, "warm", 1),
  g("x-19", "Good Morning {name}. Markets move; discipline remains.", MORNING, GENERIC, "mentor", 1),
  g("x-20", "Good Afternoon {name}. Convert attention into advancement.", AFTERNOON, GENERIC, "mentor", 1),
  g("x-21", "Good Evening {name}. End strong, start sharper tomorrow.", EVENING, GENERIC, "mentor", 1),
  g("x-22", "Hi {name}. Mentorship in action: clear ask, clear next.", ANY, GUIDANCE, "mentor", 2),
  g("x-23", "Hello {name}. You've got this — I'm scaffolding the path.", ANY, GUIDANCE, "warm", 1),
  g("x-24", "Hi {name}. Professional courtesy begins with relevance.", ANY, GUIDANCE, "professional", 1),
  g("x-25", "{name}, thank you for bringing focus to this workspace.", ANY, WELCOME, "warm", 1),
];

export const CHANAKYA_GREETING_LIBRARY_VERSION = "1.0.0-cf-chanakya-002";

export function listChanakyaGreetingLibrary(): readonly ChanakyaGreetingDefinition[] {
  return CHANAKYA_GREETING_LIBRARY;
}

export function getChanakyaGreetingById(
  id: string,
): ChanakyaGreetingDefinition | undefined {
  return CHANAKYA_GREETING_LIBRARY.find((gDef) => gDef.id === id);
}

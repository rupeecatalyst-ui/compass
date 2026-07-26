"use client";

import { cn } from "@/lib/utils";

export type PasswordStrength = "empty" | "weak" | "fair" | "good" | "strong";

export function evaluatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  hints: string[];
} {
  const hints: string[] = [];
  if (!password) return { strength: "empty", score: 0, hints: ["Use at least 8 characters."] };

  let score = 0;
  if (password.length >= 8) score += 1;
  else hints.push("Use at least 8 characters.");
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  else hints.push("Mix upper and lower case letters.");
  if (/\d/.test(password)) score += 1;
  else hints.push("Include at least one number.");
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else hints.push("Include a special character.");

  const strength: PasswordStrength =
    score <= 1 ? "weak" : score === 2 ? "fair" : score === 3 || score === 4 ? "good" : "strong";

  return { strength, score: Math.min(4, score), hints: hints.slice(0, 2) };
}

const LABELS: Record<Exclude<PasswordStrength, "empty">, string> = {
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
};

/**
 * CO-SPRINT-118 — Password strength meter for auth forms.
 */
export function PasswordStrengthIndicator({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  const { strength, score, hints } = evaluatePasswordStrength(password);
  if (strength === "empty") return null;

  return (
    <div className={cn("space-y-1.5", className)} aria-live="polite">
      <div className="auth-password-meter" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={score}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "auth-password-meter__bar",
              i < score && `is-active-${strength}`,
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Strength: <span className="font-medium text-foreground">{LABELS[strength]}</span>
        {hints[0] ? ` · ${hints[0]}` : null}
      </p>
    </div>
  );
}

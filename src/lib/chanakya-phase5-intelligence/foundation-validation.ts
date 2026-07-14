/**
 * CF-CHANAKYA-015 — Foundation validation (no remote ChatGPT; contracts intact).
 */

import { CP5_PROPOSAL_BUTTON_LABEL } from "@/constants/chanakya-phase5-intelligence";
import { getChanakyaChatGptContract, shouldInvokeChatGptDuringBusinessHours } from "./chatgpt-contract";
import { getChanakyaProposalConfig } from "./proposal-intelligence";
import { getChanakyaPhase5RegistrySnapshot } from "./registry-snapshot";

export interface ChanakyaPhase5FoundationValidation {
  valid: boolean;
  checks: Array<{ code: string; ok: boolean; detail: string }>;
}

export function validateChanakyaPhase5Foundation(): ChanakyaPhase5FoundationValidation {
  const snap = getChanakyaPhase5RegistrySnapshot();
  const contract = getChanakyaChatGptContract();
  const proposal = getChanakyaProposalConfig();

  const checks = [
    {
      code: "chatgpt_not_truth",
      ok: contract.isSourceOfBusinessTruth === false,
      detail: "ChatGPT is not the source of business truth.",
    },
    {
      code: "no_daytime_chatgpt",
      ok: shouldInvokeChatGptDuringBusinessHours() === false,
      detail: "No ChatGPT calls during normal business operations.",
    },
    {
      code: "foir_forbidden",
      ok: contract.forbiddenOperations.includes("calculate_foir"),
      detail: "FOIR calculation forbidden for ChatGPT.",
    },
    {
      code: "email_forbidden",
      ok: contract.forbiddenOperations.includes("send_email"),
      detail: "ChatGPT must never send email.",
    },
    {
      code: "proposal_button",
      ok: proposal.buttonLabel === CP5_PROPOSAL_BUTTON_LABEL,
      detail: `Proposal button label is ${CP5_PROPOSAL_BUTTON_LABEL}.`,
    },
    {
      code: "reflection_default_time",
      ok: snap.nightlyReflectionDefaultLocalTime === "21:00",
      detail: "Nightly reflection default is 21:00.",
    },
    {
      code: "roles_present",
      ok: snap.architectureRoles.length === 3,
      detail: "Brain / Chief of Staff / Reasoning Partner roles registered.",
    },
  ];

  return { valid: checks.every((c) => c.ok), checks };
}

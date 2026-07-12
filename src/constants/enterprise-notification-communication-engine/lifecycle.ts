export const ENCE_FRAMEWORK_VERSION = "1.0.0-spr001";

/** External delivery is permanently disabled in SPR-001. Simulation only. */
export const ENCE_EXTERNAL_DELIVERY_ENABLED = false;

export const ENCE_CHANNELS = {
  EMAIL: "email",
  WHATSAPP: "whatsapp",
  SMS: "sms",
  PUSH: "push",
  IN_APP: "in_app",
} as const;

export const ENCE_SIMULATION_STATUS = {
  SIMULATED: "simulated",
} as const;

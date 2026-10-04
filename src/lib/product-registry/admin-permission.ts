/**
 * Product Registry administration permission.
 * ADMIN and SUPER_ADMIN only. Callers must invoke this; a route prefix is not enough.
 */
export function requireProductRegistryAdmin(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can modify product registry"), {
      status: 403,
      body: {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only administrators can modify product registry",
        },
      },
    });
  }
}

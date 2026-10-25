export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const { startMarketingProductionScheduler } = await import(
    "../server/services/enterprise-marketing-engine/production-scheduler"
  );
  startMarketingProductionScheduler();
}

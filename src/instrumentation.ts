export async function register() {
  // This file is compiled for the Edge middleware bundle as well as Node.js.
  // The dynamic import must sit inside the Node.js check so Webpack can drop it
  // from the Edge compilation. An early return still leaves the import in that graph,
  // which pulls googleapis into a target that cannot resolve Node core modules.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMarketingProductionScheduler } = await import(
      "../server/services/enterprise-marketing-engine/production-scheduler"
    );
    startMarketingProductionScheduler();
  }
}

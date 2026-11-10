// Meridian examples: one feature gate and one tracked event.
//
// Both are optional. To remove them, delete this file and ExampleGate.tsx, then
// the lines marked "Meridian example" in app/routes/app._index.tsx.
//
// The keys must exist in the app's Plan Builder catalog on Meridian. Create
// them there (or with the Meridian MCP tools feature_create and events_create),
// or replace them with keys your app already has.
import { meridian } from "./meridian.server";

/** A feature a plan can grant. Unknown or not granted, it reads as false. */
export const EXAMPLE_FEATURE_KEY = "example_feature";

/** A usage event, counted per store and billing period. */
export const EXAMPLE_EVENT_KEY = "product_generated";

/** Server-side gate, read in a loader. Never throws. */
export async function getExampleGate(shop: string) {
  const gates = await meridian.gatesForShop(shop);

  return {
    configured: meridian.configured,
    featureKey: EXAMPLE_FEATURE_KEY,
    eventKey: EXAMPLE_EVENT_KEY,
    enabled: gates.can(EXAMPLE_FEATURE_KEY),
    planName: gates.planName,
  };
}

/**
 * Records one usage event. The idempotency key makes a retried request count
 * once. Never throws: without Meridian it does nothing.
 */
export async function trackProductGenerated(shop: string, productId: string) {
  await meridian.track({
    shop,
    eventKey: EXAMPLE_EVENT_KEY,
    quantity: 1,
    idempotencyKey: `${EXAMPLE_EVENT_KEY}:${productId}`,
  });
}

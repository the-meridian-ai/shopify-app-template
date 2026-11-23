// Meridian: the SDK's server entry point.
//
// Everything Meridian adds to Shopify's template lives in this folder, plus a
// few lines marked "Meridian" elsewhere. The README lists them all, and how to
// remove Meridian.
import { createMeridianApp } from "@the-meridian/sdk/server";

// Reads MERIDIAN_APP_ID, MERIDIAN_API_KEY and MERIDIAN_API_URL from the
// environment. Meridian hosting injects them at every deploy, and `meridian dev`
// injects them locally. Without them the app still runs: `meridian.configured`
// is false and every call returns its empty result instead of throwing.
//
// browserTokenRefresh: false lets only this server, which holds the API key,
// refresh the store's token, so a token copied from a page stops working when
// its hour ends. The browser gets each new token from this server instead:
// MeridianProvider's getShopToken in app/routes/app.tsx calls
// app/routes/app.meridian.shop-token.tsx.
export const meridian = createMeridianApp({ browserTokenRefresh: false });

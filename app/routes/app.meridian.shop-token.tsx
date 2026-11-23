// Meridian: POST /app/meridian/shop-token, the route MeridianProvider's
// getShopToken calls (app/routes/app.tsx) when Meridian refuses the store's
// token in the browser. It answers a new token minted on this server, because
// the browser cannot refresh one itself (browserTokenRefresh: false in
// app/meridian/meridian.server.ts).
//
// The refused token goes back to mintShopToken, so this server never answers
// with the token Meridian just refused. A missing or non-string
// refusedShopToken is a plain mint.
import type { ActionFunctionArgs } from "react-router"; // Meridian

import { authenticate } from "../shopify.server"; // Meridian
import { meridian } from "../meridian/meridian.server"; // Meridian

// Meridian: authenticate.admin runs first, before the body is read or anything
// is minted. It checks the session token App Bridge adds to fetch calls to this
// app's own origin, so only someone with access to the store gets its token.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request); // Meridian

  const body = await request.json().catch(() => null); // Meridian
  const refused = body?.refusedShopToken; // Meridian
  const refusedShopToken = typeof refused === "string" ? refused : undefined; // Meridian

  const shop = session.shop; // Meridian
  const shopToken = await meridian.mintShopToken({ shop, refusedShopToken }); // Meridian

  // Meridian: the body is a credential, so it is never cached. Null means
  // Meridian is unconfigured or unreachable: the provider then shows its
  // original refusal.
  const headers = { "Cache-Control": "no-store" }; // Meridian
  return shopToken // Meridian
    ? Response.json({ shopToken }, { headers }) // Meridian
    : Response.json({ shopToken: null }, { status: 503, headers }); // Meridian
}; // Meridian

import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { MeridianProvider } from "@the-meridian/sdk"; // Meridian

import { authenticate } from "../shopify.server";
import { meridian } from "../meridian/meridian.server"; // Meridian

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Meridian: the per-store token the browser side of the SDK uses. Null when
  // Meridian is not configured or unreachable: the app renders without it.
  const shopToken = await meridian.mintShopToken({ shop: session.shop });
  // Meridian: the API that issued the token (MERIDIAN_API_URL), so the browser
  // calls the same one. Undefined on production, which is the SDK's default.
  const meridianBaseUrl = meridian.baseUrl ?? null;

  return {
    // eslint-disable-next-line no-undef
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shopToken,
    meridianBaseUrl,
  };
};

// Meridian: when Meridian refuses the store's token, MeridianProvider asks this
// app's server for a new one (app/routes/app.meridian.shop-token.tsx), passing
// the refused token. App Bridge adds its session token to fetch calls to the
// app's own origin, which is how that route knows the request. Null on any
// other answer: the provider then shows Meridian's original refusal.
async function getShopToken(refused: { shopToken: string }) {
  const response = await fetch("/app/meridian/shop-token", {
    method: "POST", // Meridian
    headers: { "Content-Type": "application/json" }, // Meridian
    body: JSON.stringify({ refusedShopToken: refused.shopToken }), // Meridian
  }); // Meridian
  if (response.status !== 200) return null; // Meridian
  const body = await response.json().catch(() => null); // Meridian
  const shopToken: unknown = body?.shopToken; // Meridian
  return typeof shopToken === "string" ? shopToken : null; // Meridian
} // Meridian

export default function App() {
  const { apiKey, shopToken, meridianBaseUrl } = useLoaderData<typeof loader>();

  return (
    <AppProvider apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/additional">Additional page</s-link>
      </s-app-nav>
      {/* Meridian: plans, gates and usage for useMeridian() in any page, and a
          new token from this app's server when Meridian refuses one */}
      {shopToken ? (
        <MeridianProvider
          shopToken={shopToken}
          baseUrl={meridianBaseUrl ?? undefined}
          getShopToken={getShopToken} // Meridian
        >
          <Outlet />
        </MeridianProvider>
      ) : (
        <Outlet />
      )}
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

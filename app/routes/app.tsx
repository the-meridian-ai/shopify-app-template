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

export default function App() {
  const { apiKey, shopToken, meridianBaseUrl } = useLoaderData<typeof loader>();

  return (
    <AppProvider apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/additional">Additional page</s-link>
      </s-app-nav>
      {/* Meridian: plans, gates and usage for useMeridian() in any page */}
      {shopToken ? (
        <MeridianProvider
          shopToken={shopToken}
          baseUrl={meridianBaseUrl ?? undefined}
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

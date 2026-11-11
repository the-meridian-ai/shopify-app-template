# Shopify app on Meridian

This app starts from Shopify's React Router app template with a thin Meridian layer on top: Prisma on MySQL, the `@the-meridian/sdk` package wired in, a health check route, and these agent files. It deploys on [Meridian](https://the-meridian.ai) hosting, and it also runs on any host that runs a Docker image and gives it a MySQL database. The README lists every file that differs from Shopify's template and why.

The notes below are guidance and the reasons behind it. When the developer asks for something different, follow the developer and mention the trade-off once.

## Tools to use

- **Meridian**: the `meridian` skill (in `.claude/skills/meridian`, also reachable from `.agents/skills` and `.cursor/skills`) and the Meridian MCP server (`.mcp.json`, `.cursor/mcp.json`, `.codex/config.toml`). The skill says what to do and in which order. The MCP server gives the app's real ids, feature and event keys, deploys, logs and readiness. Read live facts from MCP instead of guessing them, and read Meridian product behaviour with `docs_search` and `docs_get`.
- **Shopify**: the Shopify Dev MCP server (already configured) and the [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) for Shopify APIs, Polaris and extensions.

If an MCP server is not connected yet, ask the developer to approve it (`/mcp` in Claude Code, `codex mcp login meridian` in Codex, the Tools and MCP settings in Cursor).

## The first session: ask before you build

A new project made from this template still has placeholder values. Before changing code, ask the developer these questions, one at a time, each with the default in brackets. The skill's `references/template.md` has the details of each step.

1. What does the app do, in one sentence? (Used for the app name, the landing page and this file's first line.)
2. Is there already a Shopify app for it, or should one be created? (`shopify app config link` links an existing one and fills `client_id` in `shopify.app.toml`.)
3. Is the app already on Meridian? If not, the developer creates it in the Meridian dashboard with the Shopify app's client ID and secret. Then find it with the MCP tool `apps_list` and link the project with `meridian link`.
4. Keep the Meridian examples (one feature gate, one tracked event), adapt them to a real feature, or remove them? (Keep.)
5. Paid plans now or later? (Later. "Now" means draft plans with `plan_create`, which the developer activates when ready.)

Then get the app ready to deploy: run `app_readiness_get`, fix what fails or list it for the developer, and deploy when they confirm.

## Database: MySQL, on purpose

`prisma/schema.prisma` uses `provider = "mysql"` with `url = env("DATABASE_URL")`. Keep it that way, even though many examples online use PostgreSQL or SQLite:

- MySQL is the engine a new Meridian app starts on and the one `meridian dev` developer databases use, and Meridian injects `DATABASE_URL`. The Prisma provider must match the app's database engine.
- Only if the app's database is PostgreSQL (check it before changing anything), switch the provider to `postgresql`, delete the MySQL migration and create a new one.
- SQLite writes Shopify sessions to a file inside the container, which every deploy replaces. Merchants get logged out, and Meridian refuses the deploy because billing cannot read the sessions.
- Elsewhere, any MySQL 8 server works with the same schema.

Change the schema with `meridian migrate -- --name <change>` (it snapshots the developer database and restores it if the migration fails), or `npx prisma migrate dev` against your own MySQL. Commit the migration files. Never edit a migration that already ran on a deployed database: add a new one.

## Run it locally

```bash
npm install
meridian dev
```

`meridian dev` gives the developer a private MySQL database on Meridian, writes `DATABASE_URL` into `.env`, injects the SDK credentials, then runs `npm run dev` (`shopify app dev`). It runs until stopped, so start it in the background. Without Meridian, set `DATABASE_URL` to any MySQL 8 database and run `npm run dev`.

Checks before a commit: `npm run typecheck` and `npm run lint`.

## The Meridian layer

| Where | What it does |
| --- | --- |
| `app/meridian/meridian.server.ts` | Creates the SDK instance from `MERIDIAN_APP_ID`, `MERIDIAN_API_KEY` and `MERIDIAN_API_URL`. Server only |
| `app/shopify.server.ts`, lines marked `Meridian` | `meridian.afterAuth(session)` after each install: registers Meridian's webhooks and reports the install and the store's subscriptions |
| `app/routes/app.tsx`, lines marked `Meridian` | Mints the store's token and mounts `MeridianProvider` with `meridian.baseUrl` (the API that minted the token), so any page can call `useMeridian()` |
| `app/meridian/examples.server.ts`, `ExampleGate.tsx`, lines marked `Meridian example` in `app/routes/app._index.tsx` | Optional examples: a server-side feature gate and a tracked usage event |
| `app/routes/health.tsx` | `/health` answers 200 for the host's health check |

The SDK never throws into the app. Without credentials, `meridian.configured` is false, gates read false and tracking does nothing, so the app still runs.

Feature and event keys come from the app's Plan Builder catalog. Read them with `features_list` and `events_list` before writing a gate or a `track` call, and create missing ones with `feature_create` and `events_create`. An unknown feature key reads as false with no error, which is easy to miss. So does a known one until the store subscribes to a plan that grants it: activating a plan subscribes nobody, and the store subscribes through a pricing page (`MeridianPricingPage`), which the template leaves for the developer to add.

`MERIDIAN_API_KEY` is a server secret. Import the SDK's server entry (`@the-meridian/sdk/server`) only from `.server.ts` files, and never put the key in browser code, `.env` files you commit, or `shopify.app.toml`.

## Deploy on Meridian

Meridian builds the repository's root `Dockerfile` from a pushed commit of the connected GitHub repository. Before the first deploy, run `app_readiness_get` (or `meridian doctor`). The developer does these in the dashboard, because they need their own sign-in or secrets:

- Create the app with the Shopify app's client ID and secret, and connect the GitHub repository.
- Add a database to the environment (Hosting, Database).
- Set the environment's release command to `npx prisma migrate deploy`, and its health check path to `/health`. The container port can stay empty (3000).
- Create the production `MERIDIAN_API_KEY` when Meridian asks for one. Meridian injects the Shopify credentials, `SHOPIFY_APP_URL`, `SCOPES` (read from `scopes` in `shopify.app.toml` at the deployed commit), `DATABASE_URL` and the other Meridian variables itself (`managed_variables_list` lists them). Do not add `SCOPES` by hand: a value you set wins over the file's and goes stale when the scopes change.

Until `application_url` in `shopify.app.toml` is the Meridian address (see below), readiness warns `shopify_app_url_mismatch`. That is expected before the first release of the Shopify side.

Then deploy (`deployment_create`, `meridian deploy --watch`, or a push to the auto-deploy branch) and follow it with `deployment_get`. Ask the developer before deploying to production.

The release command migrates the database once per deploy, before traffic moves. The container's start command (`npm run docker-start`) also runs `prisma migrate deploy`, so the app works on hosts without a release step; once the release command is set, the developer can change the Dockerfile's `CMD` to `npm run start` for a faster cold start.

## Release the Shopify side

The server and the Shopify app configuration are two releases:

1. Deploy the server on Meridian and wait until the deployment succeeds.
2. Point `application_url` and the redirect URLs in `shopify.app.toml` at the Meridian address (after `shopify app config link`, never before: linking replaces the whole file with the configuration saved in the Shopify Dev Dashboard, and `shopify app deploy` runs that link itself when `client_id` is empty) (`https://<app>.the-meridian.app`, or the custom domain), then run `shopify app deploy` from the same commit. When an extension calls the backend, pass its URL: `APP_URL=https://<app>.the-meridian.app shopify app deploy`. `shopify app dev` sets `APP_URL` only while it runs.

Use one Shopify app for development and production, tested on a development store with `meridian dev`. A second "dev" app duplicates storefront pages and Shopify approvals, and installs of it never reach Meridian.

Before each release, run `shopify app security check`. Most of its checks are written for this template.

## What stays with the developer

Signing in (`meridian login`, approving MCP), creating and pasting secrets, connecting GitHub, adding the database or a domain, and choosing a Meridian plan. Ask for these, explain why, and wait. Never ask for a key or a password in the chat. Confirm before a production deploy, a rollback or a database reset.

# Shopify app template for Meridian

Shopify's [React Router app template](https://github.com/Shopify/shopify-app-template-react-router), already wired to [Meridian](https://the-meridian.ai): Prisma on MySQL, the Meridian SDK, a health check, and agent files (`AGENTS.md`, MCP servers, the Meridian skill) so Claude Code, Cursor or Codex can take it from clone to a deployed app in one session.

It stays a thin layer over Shopify's template. Meridian is the easy path, not a lock-in: configuration comes from environment variables, the server is a standard Node server in a plain `Dockerfile`, and the app runs on any host with a MySQL database.

> **MySQL, not SQLite.** The Prisma schema uses `provider = "mysql"`: MySQL is the engine a new Meridian app starts on, and the one `meridian dev` developer databases use. Coding agents often default to PostgreSQL: keep MySQL, unless your Meridian app's database is PostgreSQL, in which case switch the provider to `postgresql` and regenerate the migration before the first deploy.

## Get the code

With Shopify CLI, which also creates or links the Shopify app:

```bash
shopify app init --template=https://github.com/the-meridian-ai/shopify-app-template
```

Keep npm as the package manager: the `Dockerfile` installs with `npm ci` from `package-lock.json`, and Shopify CLI deletes the lockfiles of the package managers you did not pick.

Or clone it and link the Shopify app yourself:

```bash
git clone https://github.com/the-meridian-ai/shopify-app-template my-app
cd my-app
npm install
shopify app config link
```

Push it to a GitHub repository of your own: Meridian deploys from GitHub.

## Quick start on Meridian

1. **Create the app on Meridian.** In the [Meridian dashboard](https://app.the-meridian.ai), create an app with your Shopify app's client ID and secret (from the Shopify Dev Dashboard).
2. **Connect the repository.** In the app's Settings, Integrations, connect GitHub and pick your repository. Then in Hosting: add a database (MySQL), set the release command to `npx prisma migrate deploy` and the health check path to `/health`, and add the variable `SCOPES` with the value of `scopes` in `shopify.app.toml` (`write_products` by default).
3. **Deploy.** Push to the auto-deploy branch, or run `meridian deploy --watch`. Once it succeeds, point `application_url` in `shopify.app.toml` at your Meridian address and run `shopify app deploy`.

The [Meridian CLI](https://help.the-meridian.ai/cli) (`npm install -g @the-meridian/cli`) runs the app locally on a Meridian MySQL database with `meridian dev`, and checks that the app is ready to deploy with `meridian doctor`.

## Or ask your coding agent

Open the project in Claude Code, Cursor or Codex, approve the Meridian MCP server when asked, and paste:

```text
Deploy this app to Meridian and connect the database. Ask me what you need first.
```

The agent reads `AGENTS.md`, asks a few questions (what the app does, which Shopify app and Meridian app to use, whether to keep the examples), checks readiness with Meridian MCP, tells you which dashboard steps are yours (sign-in, secrets, GitHub, database), and deploys when you confirm.

## What differs from Shopify's template

Based on [Shopify/shopify-app-template-react-router](https://github.com/Shopify/shopify-app-template-react-router) at commit `81eb98b` (30 October 2026). Every change:

| File | Change | Why |
| --- | --- | --- |
| `app/meridian/` | New folder: the SDK instance and the optional examples | Everything Meridian-specific in one place |
| `app/shopify.server.ts` | `afterAuth` hook calling `meridian.afterAuth(session)`, lines marked `Meridian` | Registers Meridian's webhooks and reports each install and the store's subscriptions |
| `app/routes/app.tsx` | Mints the store's token and mounts `MeridianProvider` with the API that minted it, lines marked `Meridian` | Lets any page read plans, gates and usage with `useMeridian()` |
| `app/routes/app._index.tsx` | Example gate in the sidebar, one tracked event when a product is generated, lines marked `Meridian example` | Shows the two SDK calls most apps need. Optional |
| `app/routes/health.tsx` | New `/health` route answering 200 | Hosts check it before sending traffic, and a redirect counts as a failure |
| `app/routes/_index/route.tsx` | Shop domain form removed from the landing page | Shopify's App Store requirement 2.3.1 forbids asking for a shop domain |
| `prisma/schema.prisma` | `provider = "mysql"`, `url = env("DATABASE_URL")`, `shadowDatabaseUrl = env("SHADOW_DATABASE_URL")` | Sessions live in the managed MySQL database instead of a file the next deploy deletes |
| `prisma/migrations/` | The session table migration regenerated for MySQL, plus `migration_lock.toml` | SQLite migrations cannot run on MySQL |
| `Dockerfile` | `npx prisma generate` at build time | Instances no longer generate the client at boot |
| `.dockerignore` | `.env*`, `.meridian` and `.git` excluded | `meridian dev` writes credentials and database snapshots there, which must never reach an image |
| `package.json` | Name, `@the-meridian/sdk`, `docker-start` runs `prisma migrate deploy` then starts | Migrations still run on hosts without a release step, without regenerating Prisma at boot |
| `package-lock.json`, `.gitignore` | Lockfile committed, SQLite files no longer ignored, `.meridian/snapshots/` ignored | The Dockerfile installs with `npm ci`, which needs the lockfile |
| `shopify.web.toml` | Rendered from Shopify's `shopify.web.toml.liquid` for npm | A plain `git clone` works without the Shopify CLI's template step |
| `.mcp.json`, `.cursor/mcp.json`, `.codex/config.toml` | Meridian MCP added next to Shopify Dev MCP | The agent reads the app's real keys, deploys and logs |
| `.claude/skills/meridian`, `.agents/skills`, `.cursor/skills` | The Meridian agent skill | Teaches the agent the Meridian CLI, SDK and hosting |
| `AGENTS.md`, `README.md` | Rewritten for this template (`CLAUDE.md` still imports `AGENTS.md`) | |
| `LICENSE.md` | Meridian's copyright added under Shopify's | Both are MIT |
| Removed | Shopify's `.github/` folder, maintainer skills in `.claude/skills/`, `CHANGELOG.md` | They maintain Shopify's own repository |

## Configuration

Environment variables only. On Meridian hosting these are injected at each deploy; locally `meridian dev` provides them.

| Variable | Read by | Set by |
| --- | --- | --- |
| `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL` | Shopify's library | Meridian, or `shopify app dev` locally |
| `SCOPES` | Shopify's library | You (same value as `scopes` in `shopify.app.toml`) |
| `DATABASE_URL` | Prisma | Meridian (the environment's database), `meridian dev`, or you |
| `MERIDIAN_APP_ID`, `MERIDIAN_API_KEY`, `MERIDIAN_API_URL` | The Meridian SDK | Meridian, or `meridian dev` locally. Without them the SDK does nothing and the app still runs |

## The examples

`app/meridian/examples.server.ts` holds one server-side feature gate (`example_feature`) and one tracked usage event (`product_generated`, recorded when the home page generates a product). Both keys must exist in the app's Plan Builder on Meridian; create them there or use your own. The gate turns on only once the store subscribes to a plan that grants the feature, and a store subscribes through a pricing page, which this template does not include (see below).

To remove the examples, delete `app/meridian/examples.server.ts` and `app/meridian/ExampleGate.tsx`, then the lines marked `Meridian example` in `app/routes/app._index.tsx`.

The template has no pricing page. Add one with the SDK's `MeridianPricingPage` when you have plans: see the [SDK quick start](https://help.the-meridian.ai/sdk-quickstart).

## Running elsewhere, or without Meridian

The image runs on any container host: give it `DATABASE_URL` for a MySQL 8 database and the Shopify variables, and it migrates the database at start (`npm run docker-start`). Without the Meridian variables the SDK stays silent.

To remove Meridian entirely: delete `app/meridian/`, the lines marked `Meridian` and `Meridian example`, the `@the-meridian/sdk` dependency, and the `meridian` entries in the MCP configs and skill folders. The rest is Shopify's template on MySQL.

## Pulling Shopify's template updates

Most files are Shopify's, unchanged. To bring in a newer version of their template, diff it against the commit above and apply the changes; the table above lists the only files where you should expect conflicts.

## Learn more

- [AI coding agents](https://help.the-meridian.ai/ai-agents) and [Meridian MCP](https://help.the-meridian.ai/mcp-server)
- [Deployment](https://help.the-meridian.ai/deployment) and [Running your app locally](https://help.the-meridian.ai/cli-dev)
- Shopify's [React Router app package](https://shopify.dev/docs/api/shopify-app-react-router) and [template README](https://github.com/Shopify/shopify-app-template-react-router#readme)

## License

MIT. See `LICENSE.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# Agent & Contributor Guidelines

## 1. Branch Workflow

- **Always start from the latest `develop` branch.**
  ```
  git checkout develop && git pull origin develop
  git checkout -b feature/<your-name>/<short-description>
  ```
- Never commit directly to `develop` or `main`.
- Branch naming: `feature/<author>/<slug>`, `fix/<author>/<slug>`, `chore/<author>/<slug>`.

## 2. Design Doc Compliance

- Read [`docs/DesignDoc.md`](docs/DesignDoc.md) **before writing any implementation code.**
- All architectural decisions (routing, DB schema, authentication, analytics, directory layout) are defined there. Do not override them without a discussion.
- Key contracts to always honour:
  - `src/app/` is a thin route adapter only — real logic lives in `src/features/*/` and `src/lib/*/`.
  - DB access goes through `src/features/*/queries.ts` (owned by the feature) or `src/lib/*/`.
  - Input validation uses Zod, schemas in `src/features/*/validation.ts`.
  - Drizzle table definitions live in `src/lib/db/schema.ts`; derived types in `src/lib/db/types.ts`.
  - Analytics events are emitted only via `trackEvent()` in `src/lib/analytics/events.ts` — never insert into `analytics_events` directly.
  - Server Actions must call `requireAdminSession()` at the top for any admin operation.

## 3. Next.js 16 Rules

This project runs **Next.js 16** (App Router). Breaking changes from v15 apply.

Before writing any page, layout, or route handler:
1. Read the relevant guide under `node_modules/next/dist/docs/`.
2. Treat all deprecation notices as hard blockers.

Critical v16 requirements:
- `params` and `searchParams` are **Promises** — always `await` them before use.
- `cookies()`, `headers()`, and other Request APIs are **async** — always `await`.
- Default bundler is **Turbopack**; avoid Webpack-specific configuration.
- Use **ESLint CLI** (`eslint`), not `next lint`.
- `middleware.ts` is de-emphasised; admin auth guard belongs in `src/app/admin/layout.tsx` (Server Component) plus per-action `requireAdminSession()` checks.
- Do **not** rely on Node.js filesystem writes or Vercel-specific image optimisation — the runtime is Cloudflare Workers via OpenNext.

## 4. Cloudflare & Drizzle Rules

**Before writing any Cloudflare or Drizzle code, fetch and read the current official documentation.** APIs, config formats, and recommended patterns change frequently; training-data knowledge may be outdated.

- Cloudflare Workers / D1 / OpenNext: https://developers.cloudflare.com/workers/ and https://opennext.js.org/cloudflare
- Drizzle ORM: https://orm.drizzle.team/docs/overview

If official docs contradict anything in this file, **official docs win** — flag the discrepancy and update this file.

### Cloudflare
- Target runtime: Cloudflare Workers via **OpenNext for Cloudflare**. Read the OpenNext Cloudflare adapter guide before touching runtime configuration.
- Use Web-standard APIs only; avoid Node.js-only APIs.
- No filesystem writes, no long-running processes.
- D1 binding name is `DB` in all environments.
- Secrets (`ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `RESEND_API_KEY`, etc.) are registered via `wrangler secret` — never hardcode or commit them.
- Worker configuration is `wrangler.jsonc` / `wrangler.toml` (source of truth for bindings). Cloudflare resource lifecycle (D1 databases, DNS) is managed via Terraform.
- Check the [Cloudflare D1 docs](https://developers.cloudflare.com/d1/) for current limits (row size, query timeout, batch API) before designing any query.

### Drizzle ORM
- Read the [Drizzle + Cloudflare D1 guide](https://orm.drizzle.team/docs/get-started/d1-new) before implementing DB access.
- Drizzle schema (`src/lib/db/schema.ts`) is the **single source of truth** for DB structure.
- Always generate migrations with `drizzle-kit`; never hand-edit migration files.
- Get a Drizzle client via `getDb(d1: D1Database)` from `src/lib/db/client.ts` — do not create ad-hoc clients.
- Apply and validate migrations on the **development** D1 before touching production.
- Seed scripts must be **idempotent** (safe to run multiple times).
- When Drizzle releases a new major version, re-read the migration guide before upgrading.

## 5. Error Handling — Functional Result Type

Use a **functional, Result-type** approach for all error handling. The project uses [`neverthrow`](https://github.com/supermacro/neverthrow).

Rules:
- Functions that can fail **must** return `Result<T, E>` or `ResultAsync<T, E>` — never throw for expected errors.
- Domain errors are typed values, not strings. Define them as discriminated unions near their feature.
- Use `match` / `mapErr` / `andThen` to chain results; avoid deeply nested `if` blocks.
- Throwing is acceptable only for **truly unexpected** programmer errors (e.g. invariant violations) that should surface as 500s.
- In Server Actions, convert `Result` errors to structured `{ success: false, error }` objects before returning to the client.

Example pattern:
```ts
// queries.ts
export async function getStation(
  db: DrizzleD1,
  id: string,
): ResultAsync<Station, "NOT_FOUND" | "DB_ERROR"> { ... }

// actions.ts
export async function fetchStation(id: string) {
  const result = await getStation(db, id);
  return result.match(
    (station) => ({ success: true, data: station }),
    (err) => ({ success: false, error: err }),
  );
}
```

## 6. Pull Request Rules

- Always use the **PR template** (`.github/PULL_REQUEST_TEMPLATE.md`).
- Keep PRs **small**: one PR per one Issue is the target size.
- Title format: `<type>: <short description>` (e.g. `feat: add water station detail page`).
- Link the issue with `Close #<issue>` in the PR body so it auto-closes on merge.
- Self-review before requesting a review — check the checklist in the template.

## 7. Issue Scope

- When implementing an existing issue, work only within that issue's stated scope.
- If the task naturally spans **multiple issue labels or issue scopes**, **stop and confirm** with the team before proceeding. Do not silently expand scope.

## 8. Type Safety

- No `any` unless you have an explicit, commented reason. Prefer `unknown` + narrowing.
- Do not use type assertions (`as Foo`) to paper over missing types; fix the types instead.
- All Zod schemas must be consistent with the corresponding Drizzle types (`InferSelectModel` / `InferInsertModel` from `src/lib/db/types.ts`).

## 9. Security Checklist

Before opening a PR, verify:
- No secrets or credentials in committed files.
- User-facing inputs are validated with Zod at the Server Action / Route Handler boundary.
- Admin Server Actions call `requireAdminSession()` at the very top.
- No raw SQL string interpolation (use Drizzle query builders or tagged SQL templates).
- Cookie attributes: `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`).

## 10. Environment-Aware Behaviour

- Always read `APP_ENV` to distinguish `development` from `production`.
- Outgoing email subject lines in development must be prefixed with `[DEV]`.
- Analytics events must store the `environment` field to prevent polluting production metrics with dev data.
- Never point local or development code at the production D1 database.

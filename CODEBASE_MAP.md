# WPMN and ECF codebase map

| Path | What lives here |
| --- | --- |
| Root HTML, CSS, JavaScript and `assets/` | Separate Epignosis streaming app and icons. Outside website change scope. |
| `.github/`, `.githooks/` | Pull request checks, reviewer, ownership, and local commit hook. |
| `scripts/`, `tests/` | Repository check entry point, artifact policy check, and secret-scan tooling and tests. |
| `wpmn-ecf-website/` | WPMN and ECF public site, protected editor, lockfile and app config. |
| `wpmn-ecf-website/.openai/` | Sites hosting and storage binding configuration. |
| `wpmn-ecf-website/app/` | Public pages, private editor, API handlers, and Sites identity adapter. |
| `wpmn-ecf-website/components/`, `wpmn-ecf-website/hooks/` | Site components, shared UI primitives, and React hooks. |
| `wpmn-ecf-website/lib/` | Ministry defaults, data access, permissions, validation, SEO, and security helpers. |
| `wpmn-ecf-website/db/`, `wpmn-ecf-website/drizzle/`, `wpmn-ecf-website/migrations/` | D1 schema and binding, generated Drizzle history, and migration assets. |
| `wpmn-ecf-website/public/` | Public images and static assets. Everything here can be served publicly. |
| `wpmn-ecf-website/build/`, `wpmn-ecf-website/vendor/` | Sites build integration and vendored CSS. |
| `wpmn-ecf-website/docs/`, `wpmn-ecf-website/scripts/`, `wpmn-ecf-website/tests/` | Architecture and migration notes, build and maintenance utilities, synthetic API and browser tests. |

D1 stores public content and settings, private contact and prayer submissions, editor permissions, audit events and rate limits. R2 stores uploads intended for publication. Sites supplies editor identity. The website checks permissions server-side. See `wpmn-ecf-website/SECURITY_ARCHITECTURE.md` and `AI_DATA_BOUNDARY.md` in the same folder.

Production Sites controls, live D1/R2, real submissions and credentials are off limits. Changes to hosting bindings, auth and permission boundaries, published migration history, or CI and secret controls require an owner-scoped PR. Published migration history is append-only. The website tests use local synthetic data.

To run the harness, install Node 24, pnpm 11.25.0 and Python 3. In `wpmn-ecf-website/`, run `pnpm install --frozen-lockfile` and `pnpm exec playwright install chromium --with-deps --only-shell`. From the root run `bash scripts/check.sh`. The advisory scan needs registry access and fails on high or critical advisories. GitHub runs secret scanning and its tests in a separate existing check. Review this map on every PR before merge and amend it when the paths, storage, or boundaries change.

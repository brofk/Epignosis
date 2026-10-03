# Security changes: authorization and production logic

Review status: draft. Do not deploy until this PR is reviewed and the database preflight is complete. CSP and the automated AI review gate are separate, pending chunks.

## Permissions

- Sites-dispatch identity is verified against the site's editors table on every protected request. Known roles: `editor` and `pastoral-owner`. Unknown roles and signed-in users without an editor entry are denied.
- `protectedRoute` is the common API boundary for editor GET/POST, uploads and exports. Message operations additionally require pastoral-owner authority. Owner activation is the explicit bootstrap exception, with identity, setup token, same-origin and rate-limit checks.
- Content is shared ministry content; approved editors may edit another editor's teaching. That is intended authorization, not a missing author ownership condition.
- Private requests, exports and deletions require the pastoral owner. Uploads remain public files only. No private file sharing or campus-scoped staff access is introduced.
- Payment URL and bank/account details require pastoral-owner authority in both the API and editor controls.
- Database lookup and roles are authoritative. Never expose this app directly on another host while still trusting client-supplied `oai-authenticated-user-*` headers. Sites dispatch supplies the identity boundary; there is no application session cookie to validate here.

## Data changes and deployment preflight

Migration `0001_lean_skrulls.sql` adds a unique kind/slug index, an ephemeral transaction-guard table, minimal audit metadata, and an independent first-response deadline. Existing submission text and agreed follow-up dates are preserved. Historical deadline values remain blank rather than inventing a time.

Before applying it, use an authorized read-only database connection to run:

```sql
SELECT kind, slug, COUNT(*) AS duplicates
FROM records GROUP BY kind, slug HAVING COUNT(*) > 1;
SELECT role, COUNT(*) AS editors FROM editors GROUP BY role;
```

If duplicate addresses exist, stop and let the content owner choose the correct addresses. Do not delete or rename records automatically. If roles other than `editor` and `pastoral-owner` exist, review them before release; do not silently grant them rights. Take a verified backup using the hosting provider's supported process. Apply migrations before activating the new server version; verify schema and handler behavior. Keep the old application release available for rollback. Do not roll back schema by dropping tables containing new data.

Settings guards and record guards execute in the same D1 batch as their writes. A CHECK constraint rejects stale versions and rolls the entire batch back. The unique index rejects simultaneous duplicate addresses. No application read-then-write claim is treated as a transaction guarantee.

Audits record actor ID, operation, record/key ID and time. They do not copy prayer text, notes, bank values or payloads. Deletion remains permanent, as the UI already states. No new soft-delete retention policy is introduced. Audit history currently has no UI and no automatic retention policy; decide its retention before accumulating long-term data.

## Validation

`npm run test:security`: 20 tests execute real route functions with isolated SQLite data and mocked platform identity/bindings. Covers denied roles, shared content authority, owner-only giving, origin checks, malformed/prototype-key inputs, stale save rollback, duplicate/default slugs, prayer export exclusion, missing/deleted IDs, metadata-only audits, exact response deadlines, retries, unpublished seeded articles, settings query count and endpoint inventory.

`npm run test:security:d1`: local Miniflare D1 proves rollback of stale guards and audit writes, successful current-version saves, guard cleanup and database uniqueness. No production data is read or written.

`node node_modules/typescript/bin/tsc --noEmit`: type validation.

Build with the project's existing Sites build process. Dependencies and lockfile remain unchanged. Tests use a recent Node version supporting module hooks and node:sqlite, tested with Node 24.19.

Not yet verified: production role roster, existing duplicate slugs, authenticated browser flow, exact deployed path variants and CSP behavior. Public archives still return the full published catalogue and the editor retains existing inbox/export limits; server pagination remains future archive work. This change removes per-setting validation queries and avoids loading draft bodies for public reads; it does not claim unlimited-scale archive performance.

## Source reconciliation

This PR carries the live v7 text/code improvements into the website branch, including current brand styles, tagline, navigation, back-to-top behavior and visitor pathways. The repository's separate application and `main` branch are untouched.

Previously excluded community photographs and other binary assets are not copied to the public repository. Existing BRAND_ASSETS.md and public/images/README.md remain. A fresh deployment from GitHub needs approved image assets restored through the intended hosting/storage path. The live Sites copy already holds them. A GitHub merge gate does not automatically restrict separate Sites deployments.

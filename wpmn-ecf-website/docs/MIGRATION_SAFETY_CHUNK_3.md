# Migration safety harness

This chunk adds local and pull-request safeguards only. It does not connect to or change the production D1 database.

## What is enforced

- Fresh databases must reach the complete schema from the ordered Drizzle migrations.
- A database at the `0000` schema must upgrade through `0001` without losing existing records.
- Applied migrations are recorded with a SHA-256 checksum. Repeated runs skip verified migrations; edited historical migrations fail.
- Each migration runs inside a transaction. A failing statement rolls back schema changes and the history record.
- The example expand/backfill flow remains safe when the backfill is repeated, and the old field remains available for read rollback before contract.
- Staging exports must preserve table, row, and column shape while replacing identities, contact details, pastoral free text, tokens, claims, and owner values. Recognized dates and timestamps receive one deterministic, dataset-specific shift so formats and relative ordering remain useful without copying the real calendar dates.
- Sanitized output is scanned again before it is written. The command refuses to overwrite the source export and creates the result with owner-only file permissions.
- The pull-request security workflow now runs these checks before type checking and the production build.

## Commands

```bash
npm run test:migrations
```

The sanitizer accepts a JSON object keyed by table name. Each table contains an array of row objects:

```bash
npm run staging:sanitize -- --input approved-export.json --output staging-data.json --denylist denylist.txt
```

The input export must be produced through a separately approved, read-only process. Do not commit the input, output, denylist, production identifiers, or pastoral records.

## Review findings

- Migration, security, D1 transaction, type-check, and production build checks pass.
- Full-repository lint still reports pre-existing React and Next.js errors in the editor and error pages. This chunk does not change those UI files. The migration files added here pass focused linting.
- Private hosted staging, production export, backup, and restore rehearsal remain future work. They must not be inferred from this local harness.

# WPMN Ministry Product and Migration Safety: Repository State

**Last updated:** 24 September 2026  
**Current phase:** Local migration harness completed; awaiting validation  
**Production changes:** None

## Governing objective

Establish a safe method for changing the WPMN website database before new product work expands. Protect pastoral data, identities, authorization, and availability before convenience.

## Approved decisions

- Use additive migrations before removing or renaming data.
- Preserve the old representation until backfill, cutover, verification, and observation are complete.
- Write rollback instructions before production execution.
- Use a separate staging environment.
- Preserve production data shapes while replacing identities, contacts, free text, tokens, and pastoral content.
- Implement the local migration harness before hosted staging.

## Completed in this chunk

- Transactional migration runner with checksum history.
- Fresh-install and old-schema upgrade tests.
- Repeat-run, checksum-drift, failed-migration rollback, and expand/backfill/read-rollback tests.
- Operational migration package template.
- Staging JSON sanitizer and post-sanitization leak scanner.
- Pull-request workflow integration.
- Migration, security, D1, TypeScript, focused lint, and production-build validation.

## Known issue outside this chunk

Full-repository lint reports seven pre-existing React and Next.js errors in editor and error pages. This chunk does not change those files. The new migration code passes focused lint.

## Not yet done

- Private hosted staging Site.
- Isolated hosted staging D1, R2, authentication, and secrets.
- Approved read-only production export process.
- Backup and restore rehearsal.
- Any production migration or live database change.

## Current stop condition

Do not create hosted staging, export production records, merge this work, or change production until the owner approves the validation checkpoint.

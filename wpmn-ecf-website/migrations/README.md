# Operational migration files

Drizzle-generated schema migrations remain in `drizzle/`. This directory holds the human-reviewed operational package required for every production data change.

Copy `TEMPLATE` into a dated directory. Complete the forward migration, verification, rollback, owner, approver, backup, staging evidence, stop conditions, and observation window before requesting production approval.

Rules:

- expand before removing or renaming;
- keep application code compatible with the old and new schema during deployment;
- make backfills bounded, restartable, and safe to repeat;
- switch reads only after verification;
- keep the old representation through the observation window;
- contract in a later, separately approved release;
- never place production exports, secrets, tokens, or pastoral records in Git.

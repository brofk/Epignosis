# Migration: replace with descriptive name

## Ownership

- Migration owner:
- Production approver:
- Incident lead:
- Planned window:

## Purpose and scope

- Business or ministry reason:
- Affected tables and application paths:
- Data classification:
- Expected row count:
- Expected duration:

## Compatibility

- Old application with expanded schema:
- New application before backfill:
- New application after backfill:
- Feature flag or configuration used for cutover:

## Required evidence

- [ ] Current backup/export identifier recorded
- [ ] Restore rehearsal passed
- [ ] Fresh-install test passed
- [ ] Upgrade test passed
- [ ] Backfill repeat-safety test passed
- [ ] Rollback rehearsal passed
- [ ] Private staging acceptance passed
- [ ] Sanitized-data leak scan passed

## Execution

1. Apply `01-expand.sql`.
2. Run `03-verify.sql` for expand checks.
3. Run the bounded backfill described in `02-backfill.sql`.
4. Run `03-verify.sql` again.
5. Switch reads through the named configuration.
6. Run public, form, editor, authorization, confidentiality, export, and audit smoke tests.
7. Observe for the approved period.
8. Schedule `06-contract.sql` as a later change. Do not run it in this release.

## Stop conditions

- Authorization or ownership checks fail.
- Confidential information reaches an unauthorized path.
- Row counts, required values, or uniqueness checks diverge.
- Form or editor writes fail.
- Mixed old/new application versions cannot operate safely.
- Backup, restore, or staging evidence is missing.

## Rollback decision

- Before cutover: use `04-rollback-before-cutover.sql` and return the application to old reads.
- After cutover: follow `05-rollback-after-cutover.md`; reconcile any new writes before changing reads.
- After contract: restore/reconcile from the named backup or archived table. Contract requires separate approval because this is the highest-risk state.

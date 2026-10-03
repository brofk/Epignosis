# Rollback after cutover

1. Stop or pause affected writes if reconciliation cannot occur while live.
2. Measure records written only to the new representation.
3. Copy or transform those writes back to the old representation with an idempotent operation.
4. Verify counts, required values, ownership, and confidentiality.
5. Return reads to the old representation through the named configuration.
6. Deploy the last compatible application version.
7. Keep the expanded schema for investigation. Do not drop it during the incident.
8. Record the incident, evidence, and next decision.

Replace these instructions with migration-specific commands and verification queries before approval.

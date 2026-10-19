## Problem and scope

Describe the problem, affected users, and the one intended outcome.

* Affected project:
* Approved requirement or current authorization:
* Included changes:
* Explicit exclusions:

Keep unrelated work in another PR. Do not copy private project notes, credentials, donor information, or pastoral records into this description.

## Planned change

Explain what changes and why. Identify effects on giving links, authorization, confidentiality, data storage, and deployment where applicable. Mark each area not affected when appropriate.

## Verification

List the actual commands, results, and verification limits. Distinguish local checks from GitHub checks and external-provider behavior.

* Tests and relevant regression coverage:
* Lint:
* Type check and production build:
* Security and secret scanning:
* Browser or provider checks, if applicable:
* Failed or unperformed checks:

Do not mark a check passed without evidence. Required failures must be corrected rather than skipped or bypassed.

## Recovery

Identify the commit or release to restore, the revert procedure, and any data or configuration changes that a source revert cannot undo.

## Review and release

* [ ] This PR contains one coherent change that can be reviewed and reverted.
* [ ] Applicable required checks pass for the current revision.
* [ ] An independent reviewer has approved the current revision.
* [ ] The release target and approved source revision are identified.

State whether this is prepared source, merged source, or an actual verified release. A GitHub merge alone does not establish that the WPMN/ECF Site was deployed. Do not use a separate publishing path to bypass the required review.

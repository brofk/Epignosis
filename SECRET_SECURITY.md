# Secrets: prevention and incident response

## Audit checkpoint, 1 October 2026

A fresh GitHub mirror contained 87 commits across 14 branch refs and 14 pull-request refs. A Gitleaks 8.30.1 scan of all fetched reachable history returned nine matches, all for one synthetic hexadecimal Stripe-shaped value in the staging sanitizer test. These are repeated versions of a test fixture, not evidence of a live Stripe integration. No private .env file was tracked in the current website branch. This scan is pattern-based, not proof that every possible credential is absent. It does not inspect provider accounts, deployment environment variables, logs, artifacts, unrelated repositories, forks or other people's clones.

The current fixture is constructed during testing instead of stored as a complete token. The scanner retains its default rules and exempts only that exact historical synthetic value at that exact test path. There is no whole-test-directory exclusion and no baseline that hides arbitrary historical findings. No live credential was identified for rotation, and no history rewrite or force push was performed.

## Where secrets belong

Use server-only deployment secret settings for production and a locally ignored .env.local or .dev.vars file for development. Commit only empty values or explanatory placeholders in .env.example. Never use NEXT_PUBLIC or a browser bundle for a private credential. Public publishable identifiers may be public; secret API keys may not. GitHub Actions reads secrets through the GitHub secrets store. Do not put values in workflow YAML, documentation, issue comments, model prompts or command-line arguments.

Adding gitignore does not untrack an existing file. After migrating its values and rotating any exposed credentials, remove the file from the index with git rm --cached and verify git ls-files. Historical exposure remains until addressed separately.

## Enable prevention

Install the verified Gitleaks 8.30.1 binary for your operating system from https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1. Then run sh scripts/security/install-hooks.sh from the repository root. This enables the hook in that clone only. Every new clone needs installation. The installer refuses to replace an existing custom hook without integration. Missing or mismatched scanners block commits.

Local hooks are bypassable and do not cover GitHub API writes. The Secret scanning workflow independently scans full fetched history and rejects sensitive tracked file names on pushes and pull requests. It has no provider credentials, uses read-only repository permissions, pins checkout to a commit and verifies the downloaded scanner checksum. Findings fail the job; secret values are not printed or uploaded as artifacts.

In GitHub Settings, enable available secret scanning and push protection. Add Secret scanning as a required status check on main and sites-wpmn-ecf, disallow direct/bypass pushes, and require CODEOWNERS review for scanner/workflow changes. CODEOWNERS alone does not enforce review. Repository administration permissions are required to configure these settings; adding this workflow does not configure them automatically.

## If a real secret is found

1. Stop deployments using the credential. Revoke or rotate it in the issuing provider immediately. Create the replacement in the provider secret store, update every deployment that needs it, redeploy, test the permitted operation and confirm the old key fails. Never paste either value into GitHub or a chat. If uninterrupted rotation is supported, minimize the overlap and revoke the old key promptly.
2. Review provider access logs and scope since first exposure. For session-signing keys or stolen session tokens, invalidate affected sessions. Notify the incident owner using sanitized metadata. Deleting the Git file does not revoke the key.
3. Identify exact affected paths, historical renames, commits, branches, tags, pull requests and forks. Pause repository writes and deployments before rewriting. Record current remote refs and protect a restricted offline backup; that backup remains sensitive.
4. In a fresh disposable mirror, use git-filter-repo with sensitive-data-removal and exact affected paths, or a private replacement file outside the repository for embedded literals. Never use a command-line secret value. Rescan all rewritten refs, run checks, review the ref mapping and confirm unrelated work is preserved before pushing.
5. Coordinate the approved maintenance window and update only reviewed affected remote branches/tags. A force push changes commit IDs and may invalidate reviews/signatures. Do not blindly force-push a stale mirror. GitHub pull refs are read-only; request GitHub Support cleanup where applicable. Coordinate forks and require clean reclones or carefully rebased branches so old history is not reintroduced.
6. Re-enable protection and deployments, retest with replacement credentials, and document sanitized evidence. History rewriting cannot erase previously downloaded copies. Credential revocation remains the primary containment step.

The rewrite must be prepared against a confirmed exposure and verified current refs. This package deliberately contains no unattended force-push script.

## Support tiers

Known scan failure: stop the push, inspect locally with full redaction, classify it, and repair without broad exclusions. Unknown credential: restrict evidence, identify its provider and owner, escalate before changing access. Confirmed exposure: the incident owner coordinates revocation, audit, downtime decisions and affected-person communications; the assistant does not delete evidence or make unattended financial changes.

References: https://github.com/gitleaks/gitleaks and https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository.

## Repository administrator completion steps

Open https://github.com/brofk/Epignosis/settings/rules and create an active branch ruleset named Website safeguards. Include branch-name patterns `main` and `sites-wpmn-ecf`. Leave the bypass list empty. Require a pull request before merging, restrict deletions, block force pushes, and require branches to be up to date. Add these exact required GitHub Actions checks: `Website unit tests and coverage`, `Website security tests`, `Secret scanning`, `AI production review`. Save, reopen, and confirm the ruleset is Active and both branches are targeted. The browser suite is part of Website security tests after the completion change merges. Do not enable Restrict updates with an empty bypass list, as it prevents normal updates too.

For independent review, enable one required approval, code-owner review and dismissal of stale approvals only after assigning another eligible maintainer. CODEOWNERS currently names @brofk; an author cannot approve their own pull request, so a solo owner needs a separate reviewer for that policy. Required automated checks can be enforced immediately.

Open repository Settings > Advanced Security. Enable Secret Protection if necessary, then enable Push protection. Confirm the saved page reports it enabled. If GitHub offers a paid upgrade rather than Enable, the repository plan/visibility needs an administrator decision; do not treat the feature as enabled. Native push protection and the Gitleaks Actions check are separate controls.

Every developer clone must install Gitleaks 8.30.1 for its operating system from the official release, verify the matching release checksum, and put the binary on PATH. From the repository root run:

```sh
gitleaks version
sh scripts/security/install-hooks.sh
git config --local --get core.hooksPath
sh scripts/security/scan-secrets.sh staged
```

Expected results: version 8.30.1, successful installation/scan, hooksPath `.githooks`. If an existing custom hook is detected, integrate the secret scan into it instead of replacing it. Repeat in every clone; hook configuration is local and does not follow a clone or pull. Never test this with a real secret.

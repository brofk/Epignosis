# Artifact policy

This repository keeps source and assets the site needs to run. Track approved public images, vendored source assets, lockfiles, and database migrations. The website's `build/` directory contains build tooling and stays tracked.

Keep installed dependencies, framework caches, website build output, coverage, browser reports, workspace output, and local database files out of Git. Build and test outputs needed for review belong in the appropriate GitHub Actions run. Treat production data, private records, and credentials according to the repository rules and secret scanner. Only synthetic data belongs in test artifacts.

Run `python3 scripts/check-artifact-policy.py` from the repository root after staging changes. The check reads tracked path names without reading file contents. The `Artifact policy` GitHub Actions job runs the same check on pull requests and merge-queue candidates. It reports under the name required by the branch ruleset.

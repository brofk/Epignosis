# Complete-diff production review

The pull_request_target workflow checks out the trusted reviewer from the default branch. It must never check out or run pull-request application code with the OpenAI key or GitHub write token.

The reviewer obtains the exact base and head commit IDs from GitHub, verifies/fetches those Git objects as data, and computes their merge-base diff with external diff and text conversion disabled. API patch truncation does not remove source lines from the review. The complete Git diff must match the GitHub file manifest. Missing commits, manifest mismatch, fetch failure or resource-budget overflow fail the check.

Large file diffs split on line boundaries. Every textual diff line is retained and added/context lines have explicit RIGHT source line numbers. No oversized line or file is silently truncated. The per-batch and total input budgets remain 120,000 and 1,500,000 characters, with at most sixteen batches. Binary files are represented by Git metadata and need separate human review; the assistant does not claim to inspect image pixels or binary contents.

Responses receive strict runtime shape/severity validation in addition to the provider response schema. The reviewer confirms both head and base are unchanged before posting. All batches must complete, and critical findings block the check. Failed provider responses are reported by HTTP status, without response bodies. Existing authenticated GitHub API error bodies are also omitted.

The checkout requires a Git repository and network access to its configured GitHub origin if a PR commit is not already available. Public same-repository and accessible pull-request commits work with credential persistence disabled. A private or inaccessible fork commit that cannot be fetched fails closed and requires a separate approved credential/access solution; never fall back to incomplete API patches.

Run node --test .github/scripts/review-diff.test.mjs to verify missing-patch recovery, exact-commit isolation, manifest coverage, renamed/deleted/binary/mode changes, disabled diff drivers, bounded complete chunking, merge-base behavior and response validation. Reviewer tests run without provider secrets.

Website CI must cover PRs targeting both main and sites-wpmn-ecf and retain migration/staging tests. Secret scanning remains independent. Before promoting reviewer changes to the default branch, review and merge the small trusted-reviewer prerequisite. A feature-branch reviewer cannot change its own trusted implementation.

# Complete-diff production review

The pull_request_target workflow checks out the trusted reviewer from the default branch. It must never check out or run pull-request application code with the OpenAI key or GitHub write token.

The reviewer obtains the exact base and head commit IDs from GitHub, verifies/fetches those Git objects as data, and computes their merge-base diff with external diff and text conversion disabled. API patch truncation does not remove source lines from the review. The complete Git diff must match the GitHub file manifest. Missing commits, manifest mismatch, fetch failure or resource-budget overflow fail the check.

Large file diffs split on line boundaries. Every textual diff line is retained and added/context lines have explicit RIGHT source line numbers. No oversized line or file is silently truncated. The per-batch and total input budgets remain 120,000 and 1,500,000 characters, with at most sixteen batches. Binary files are represented by Git metadata and need separate human review; the assistant does not claim to inspect image pixels or binary contents.

Responses receive strict runtime shape/severity validation in addition to the provider response schema. The reviewer confirms both head and base are unchanged before posting. All batches must complete, and critical findings block the check. Failed provider responses are reported by HTTP status, without response bodies. Existing authenticated GitHub API error bodies are also omitted.

The checkout requires a Git repository and network access to its configured GitHub origin if a PR commit is not already available. Public same-repository and accessible pull-request commits work with credential persistence disabled. A private or inaccessible fork commit that cannot be fetched fails closed and requires a separate approved credential/access solution; never fall back to incomplete API patches.

Run node --test .github/scripts/review-diff.test.mjs to verify missing-patch recovery, exact-commit isolation, manifest coverage, renamed/deleted/binary/mode changes, disabled diff drivers, bounded complete chunking, merge-base behavior and response validation. Reviewer tests run without provider secrets.

Website CI must cover PRs targeting both main and sites-wpmn-ecf and retain migration/staging tests. Secret scanning remains independent. Before promoting reviewer changes to the default branch, review and merge the small trusted-reviewer prerequisite. A feature-branch reviewer cannot change its own trusted implementation.


## Cost controls

Routing is decided deterministically from the complete file manifest and diff, never from PR instructions. The existing `OPENAI_REVIEW_MODEL` (default `gpt-5.4`) handles application code, sensitive files, executable snippets, binary or mode changes, unknown changes and large changes. Only up to four modified prose Markdown files in the documented README/docs paths, under 12,000 diff characters, qualify for `OPENAI_ROUTINE_MODEL` (default `gpt-5.4-mini`). Renames, deletions and additions retain strong review. Model quality equivalence is not established by this policy. Broaden eligibility only after task-specific evaluation. Deterministic formatting, parsing, classification and reporting use no model.

The reviewer retains its complete-diff, schema-validation, exact-commit and fail-closed safeguards. It uses a stable cache key hashed from repository, trusted instructions, schema and file manifest. Instructions and schema remain stable; the manifest and complete diff precede request-specific identifiers, so identical reruns can retain the longest useful prefix. No source is omitted, and no cached verdict can substitute for a new review. Cache eligibility, minimum prefix size, retention and actual hits are provider-controlled. Short prefixes or weekly-spaced runs may receive no cache discount. We do not pad prompts to qualify. Requests use `store: false`, a 12,000-token output ceiling, and fail if the response is incomplete.

A durable unknown-usage record is written before each provider request and replaced in reporting by the last available outcome for that attempt/batch. Each attempted provider request saves token-only JSONL telemetry under the `ai-usage-<run>-<attempt>` Actions artifact, retained for 90 days, including HTTP/transport failures as unknown usage. Successful responses are recorded before output validation, so malformed or blocking reviews still count. No API key, prompt, diff, user message or response text enters these artifacts. Cached input is subtracted from full-price input. Cache writes are not separately available in this Responses integration and are marked unavailable. Unknown models, nonstandard service tiers and long-context rates remain unpriced rather than fabricated. Standard USD estimates are verified against the linked model pages on October 5, 2026 and require periodic updates. Provider invoices remain authoritative.

`Weekly AI cost report` runs Mondays at 09:00 Asia/Manila and supports manual dispatch. Changes to reporting files on main also run it immediately to validate activation. It exhausts retained-artifact pagination without a date/ordering assumption, verifies repository identity and workflow name, and collects only artifacts whose source run is this trusted `pull_request_target` reviewer, deduplicates the same run/attempt/batch while retaining reruns, and creates Markdown and JSON artifacts plus an Actions summary. The window is the previous Monday-to-Monday week ending 00:00 Manila time. No model call is used to write the report. Download failures or invalid records fail reporting; do not publish a partial subtotal as complete. Artifacts before activation, expired artifacts, and cancelled jobs before artifact upload are coverage gaps. No data does not mean zero spending.

This is direct OpenAI API accounting, not GitHub Copilot billing. GitHub Copilot, ChatGPT plan usage and Actions infrastructure charges are outside this report. Importing the account's Copilot usage report needs that separately supplied report or billing access. This connection does not expose account billing endpoints. A repository routing layer cannot change the model used by an external Copilot or ChatGPT session.

Reports appear in Actions under `Weekly AI cost report`, with downloadable `weekly-ai-cost.md` and `weekly-ai-cost.json`. Schedule activation requires this workflow on the default branch and Actions schedules enabled. Tests: `node --test .github/scripts/*.test.mjs`. Rollback: revert the cost-control commit through the normal reviewed PR process; remove scheduled reporting only if reporting is no longer wanted.

References:
- https://developers.openai.com/api/docs/models/gpt-5.4
- https://developers.openai.com/api/docs/models/gpt-5.4-mini
- https://developers.openai.com/api/docs/guides/prompt-caching
- https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing

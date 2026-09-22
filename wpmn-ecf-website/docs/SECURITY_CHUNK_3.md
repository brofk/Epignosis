# Security Chunk 3: Browser policy, route variants, and release checks

## Implemented browser policy

`proxy.ts` creates a new nonce for each document request and sends the same Content Security Policy in the request and response. Vinext receives the request policy and applies the nonce to framework scripts. The homepage JSON-LD script reads the request nonce explicitly.

Public pages may frame only `https://www.youtube-nocookie.com`. The video iframe is created only after a visitor clicks the play control. Editor, editor API, upload, export, and ChatGPT sign-in paths use `frame-src 'none'`.

All protected pages and API handlers retain server-side authorization. The proxy is defense in depth and never replaces the membership, role, and permission checks in `protectedRoute`.

The policy also applies `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, a strict referrer policy, a restrictive permissions policy, and same-origin opener isolation. Production policy contains no `unsafe-eval`. Inline styles remain allowed because the current React interface uses style attributes; script execution still requires the nonce.

## Sensitive-page third-party scripts

No analytics tag, advertising pixel, chat widget, third-party script source, or iframe is present in the editor, authentication-facing application code, upload route, export route, or editor API. Source tests fail if these sensitive files gain a third-party script or iframe.

## Route variations tested

The sensitive policy recognizes canonical, repeated-slash, encoded, and double-encoded variations of editor, editor API, upload, and authentication paths. Tests include prefixed protected segments as a conservative defense. Unknown routes may return 404; any route that resolves to a protected handler is still denied by the handler without a valid server-side editor membership and permission.

## Production migration preflight

Read-only inspection of the live Sites database found:

- one stored teaching record;
- one editor with a recognized role;
- no duplicate `(kind, slug)` pair;
- no unknown editor role.

The preflight therefore cleared migration `0001_lean_skrulls.sql` for deployment. The migration adds write guards, audit events, the exact response target timestamp, and the unique teaching address constraint.

## Validation

- 25 security and browser-policy tests passed.
- The isolated Cloudflare D1 transaction and uniqueness test passed.
- TypeScript passed.
- The full production build passed.
- The standalone Wrangler server could not open a local network interface in the execution container (`uv_interface_addresses` system error). No application request failed in that attempt because the server never opened a port. The production-compatible Sites build and deployment checks remain authoritative for release.

## GitHub release controls

The repository includes a deterministic website security workflow and a trusted AI production-review workflow. The AI workflow uses `pull_request_target`, checks out only the default branch reviewer, reads the pull-request diff through the GitHub API, and never executes pull-request code with the OpenAI credential. It validates structured findings, posts valid inline comments, fails for critical findings, and fails closed for missing credentials, stale commits, omitted code patches, oversized diffs, model errors, invalid output, or comment-publication errors.

The workflow requires the repository secret `OPENAI_API_KEY`. The optional repository variable `OPENAI_REVIEW_MODEL` selects the model; otherwise the reviewer uses its documented default. GitHub repository rules must require both `AI production review` and `Website security tests` before the merge gate is enforceable.

Because GitHub workflows using `pull_request_target` are loaded from the default branch, the trusted reviewer files must first be merged into the repository default branch. They are also included on the website security branch for review. Automatic merging remains disabled.

## Asset storage note

The public GitHub connector rejected an attempted binary brand asset upload because automated review classified it as a potentially sensitive community photograph. The code synchronization continued without bypassing that restriction. The complete image set remains in the Sites source and deployment archive. Existing approved GitHub brand assets remain untouched; any missing community photography should later be supplied through an approved private or public asset store with explicit publication permission.
## Workflow activation checkpoint

The trusted reviewer was installed on the default branch before this pull request was re-synchronized. This documentation-only commit triggers the reviewer and deterministic security checks against the current website head without changing runtime behavior.
## Safe batched-review activation

The repaired reviewer is installed on the default branch. It reviews large changes in complete file-aligned batches and redacts provider response bodies from public errors. This documentation-only checkpoint triggers a fresh review from the trusted repaired revision and does not alter website runtime behavior.

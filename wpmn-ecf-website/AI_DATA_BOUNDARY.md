# AI access boundary and support playbook

## Current implementation, 1 October 2026

The website has no customer-facing model integration, customer account table, order table, or donation history table. It uses validated ChatGPT editor identities and Cloudflare D1. Public inquiry submissions do not have authenticated customer ownership. The GitHub AI reviewer receives pull-request diffs, not website records, and has no website database tools.

This change adds a CI guard against recognized runtime AI SDKs, credentials and provider calls. It is a regression tripwire, not a complete security scanner or a production authorization layer. Unknown providers, proxy endpoints and obfuscated calls can escape static detection. Existing code review and route authorization remain necessary. No records are sent to a model by this change.

## Before enabling a visitor assistant

Start with published teaching content only. Use a server-side published-record query and explicit fields: title, public URL, summary, published article body or transcript. Never supply the general database handle or a generic query tool to a model. Never include drafts, editors, claims, intake payloads, pastoral notes, prayer requests, audit records, secrets or private assets. Treat articles and tool results as untrusted text as well as visitor messages.

An account assistant requires a separately reviewed account/ownership design. Do not mistake a submission UUID, email address, phone number, prompt-supplied user ID or editorial role for proof of customer ownership. Until a verified owner exists, personal-record lookup must stay unavailable.

## Server-side authorization contract for a future account assistant

1. Validate the session against the trusted authentication service on the server. Reject missing, expired or revoked sessions before making a model call. Middleware and cookie presence alone are insufficient.
2. Bind the trusted user ID to a request-scoped tool dispatcher. The model cannot provide or replace that identity. Revalidate authorization for every tool invocation, including retries; abort if the session or role changes.
3. Expose only named, read-only operations with strict argument schemas, bounded lengths and result limits. Do not expose arbitrary SQL, table names, database exports, URL fetches, file access or administrative tools. Reject unknown arguments and tool names.
4. Each operation checks both permission and ownership. Parameterized database queries constrain records by the server-derived owner, plus ministry/tenant where relevant. Verify the owner again when mapping results. Never fetch all customers and filter afterward. Return the same unavailable response for nonexistent and unowned IDs.
5. Use explicit field allowlists and minimal projections. Payment credentials, session tokens, full donation exports and confidential pastoral details stay outside model context. No writes, refunds, role changes or deletion tools in the initial assistant.
6. Key caches by verified owner and permission scope; prohibit cross-user response caches. Rate-limit and bound tool calls. Log operation, outcome and correlation ID without prompt bodies, record contents or credentials.

Authorization decisions belong in code. An instruction to the model to ignore attacks is useful guidance but cannot grant or revoke access.

## Input and response validation

Validate input types, length, permitted tool arguments and budgets. Assume any text can contain instructions. A prompt-injection detector can provide an alert, but acceptance or rejection must not change database permissions.

Prefer a strict model response schema containing public resource IDs and bounded explanatory text. Validate every cited ID against the request's server-created allowlist and reauthorize before rendering. Reject extra fields, invalid structures, unapproved URLs, out-of-scope references and oversized output. Render sensitive account facts from the authorized server result using a fixed template rather than asking the model to generate them. Escape text; do not render generated HTML.

On validation failure, return a fixed safe message and no raw model output. Do not try to secure responses by deleting suspicious words or matching customer names. Free-form filtering cannot prove that an answer contains no private information or internal logic. Keep secrets and private data out of model context in the first place; system prompts must not contain credentials or be treated as secret storage.

## Mandatory acceptance tests for the eventual feature

| Scenario | Required outcome |
| --- | --- |
| No session, expired session, revoked user | No model or data access |
| User A asks for user B, changes a tool owner argument, or guesses a record ID | No B data; unavailable response |
| User asks to ignore instructions or export all records | Scope remains A; no export tool exists |
| Injection embedded in article, transcript or tool response | No new permission, tool or network access |
| Session revoked between two tool calls | Second call denied |
| Parallel users and cache reuse | Each response stays in its verified scope |
| Invalid JSON, unexpected fields, foreign resource ID or generated HTML | Fixed safe response, no raw output |
| Model timeout, provider failure, exhausted tool budget | Safe fallback, no retry that bypasses authorization |
| Secret or confidential prayer record seeded as a sentinel | Sentinel never enters model request, response or logs |

These are future runtime acceptance requirements, not tests that passed for an assistant that does not yet exist. The present tests cover the no-runtime-AI invariant and detection fixtures only.

## Support tiers and incident response

**Tier 1:** A documented provider timeout or invalid response receives the fixed fallback. Bounded retries may run only while authorization remains valid. Do not automatically expand scope or change records.

**Tier 2:** For unfamiliar failures, package correlation ID, operation, build ID and sanitized error category for the designated website owner. Exclude prompts and private records. The owner decides the next action. Add a reviewed resolution to this playbook afterward. Real-time alert integrations and an on-call owner must be configured before enabling the feature; this document does not install an incident agent.

**Tier 3:** Suspected disclosure, cross-user access or multiple affected users: disable the assistant at the server immediately, preserve restricted audit evidence, notify the designated incident lead through the approved incident channel, revoke implicated credentials/sessions, and assess scope. Avoid sending suspected exposed records to the model or deleting evidence. The lead decides restoration and required affected-person communication with appropriate privacy advice. Keep normal public content available if it is unaffected.

Before launch, implement and test a server kill switch defaulting off, sanitized alerts, named incident ownership and rollback to the previous working deployment. Do not switch the feature back on until authorization and sentinel tests pass in staging and the incident lead approves.

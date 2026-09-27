# WPMN and Epignosis Christian Family

Public ministry website with protected pastoral owner editing. Vinext / React, Cloudflare Worker, D1 records, and R2 assets. Hosting identity is in `.openai/hosting.json`.

## Editing

The site owner uses `/editor`. Sign in through the platform's Sign in with ChatGPT flow. Initial activation requires the private, high-entropy setup link delivered to the owner. Its hash is held in the `EDITOR_SETUP_HASH` runtime secret. The first valid activation atomically binds the signed-in, site-scoped user ID to the pastoral owner role. The claim can be used only once. Successful sign-in alone never grants access.

The editor includes page text and settings; sermon, article, series, event and FAQ drafts; private contact inbox; photos and PDF uploads; and the supplied content calendar and article plan. Page text is applied on Save. Resources require Published status to appear publicly. Preserve existing slugs to avoid breaking shared links. Source changes can also be requested through Sites.

In Page text & settings, **Brand, name & logos** controls the public header name, WPMN and ECF logo files, favicon, Midnight Violet, and Faith Teal. Only validated uploaded image assets may be used for brand files. Colors must preserve at least 4.5:1 contrast with white text. The initial colors follow the supplied brief; exact official colors and logo files have not been confirmed. The current text wordmark is not an official logo. Changing the visible site name does not register or change a domain.

**Search visibility (SEO)** controls the homepage search title and description and public Google/Bing verification codes. Each public page has a distinct canonical URL; the homepage supplies WebSite and Organization structured data using the saved identity. The sitemap includes only published resources. Search Console, Bing Webmaster Tools, and Google Business Profile require ministry-owned accounts and verification; no ongoing monitoring is configured. Set the verified primary domain through Sites and then update `SITE_ORIGIN` before publishing. Google Workspace email and its DNS records are configured with the ministry's domain provider, separately from the content editor.

## Contact handling

Eight form categories save to D1. Server-side validation, origin checks, honeypot handling, request size limits, duplicate protection and hourly rate limiting run before storage. A request is acknowledged only after successful persistence. Input is retained on errors.

All inbox access requires the pastoral owner. Confidential prayer requests and discipleship requests for pastoral care are marked pastoral only. They are never passed to generic routing or included in follow-up exports. Other team assignments are organizational labels in the owner inbox, not access grants or sent notifications. No third-party notification, email, or CRM service is configured. The owner must review the inbox and arrange follow-up. The CSV export excludes message bodies, notes, and confidential records, and guards spreadsheet formula injection.

Messages may be updated with a named assignee, follow-up date, status and private notes. Deletion requires an explicit UI confirmation. Prayer content has no public endpoint. Do not add mental health diagnosis, doctrinal risk scoring, green/yellow/red labels, or automated pastoral decisions to public flows.

## Publishing content

No invented recording links, donor claims, bank details, email addresses, map coordinates or enrollment facts. The supplied example sermon is a draft until a real recording or transcript is added. Four introductory articles are published; all thirty requested article ideas are represented in the content library. FAQs are editable. The provided current brief controls mission and vision wording.

Real photos are copied unchanged from the user's supplied collection. The image with children was excluded because publication permission was not available. The public site uses an adult community photo and ECF roadside sign. The wordmark is text, not a recreation of an official logo. Uploaded files require a publication permission confirmation and are publicly accessible by their unguessable link; never upload pastoral files there. R2 only accepts validated JPG, PNG, WebP, or PDF files up to 8 MB. PDF files are downloads rather than inline HTML.

## Remaining external details

- Verified ministry email addresses and social / recording channel URLs.
- Exact Baguio map pin, parking, and current children's arrangements.
- Gathering addresses and schedules for San Nicolas and Candon.
- Confirmed provider payment URL, or complete bank details.
- Actual team access and notification recipients; email sending service and CRM integration.
- Custom ministry domain and Search Console configuration.

The site intentionally makes no public response-time guarantee. Internal time targets appear in the content plan. Tracking and advertising pixels are absent. Videos load only after a visitor chooses Play. The privacy notice describes the implemented behavior; it is not a claim of legal certification.

## Data and security

D1 schema is in `db/schema.ts`; generated Drizzle migrations are in `drizzle/`. Use prepared statements and append migrations after publication. Public content is filtered on the server. Settings and record updates use version checks to detect competing edits. All editor, export and upload handlers independently verify owner authorization. The request Origin must match `SITE_ORIGIN` or the worker request origin. Inbound authentication headers are supplied by the Sites dispatcher.

Environment keys: `SITE_ORIGIN`, `EDITOR_SETUP_HASH`, `RATE_LIMIT_SALT`. Never place secret values in source, the manifest, or Git. The setup token itself is not stored in the code. Do not rotate the bootstrap configuration to change an already claimed owner.

## Validation

TypeScript check, production build, generated schema inspection and focused contact / authorization checks. No browser or visual QA was requested; no browser preview was opened. WebMCP teaching search is registered when available and updates the visible archive; supported browser validation was unavailable in this workflow. This optional integration does not submit forms or save data.

Database migration safety checks run with `npm run test:migrations`. Operational migration packages belong in `migrations/` and must include expansion, verification, rollback, and later contraction instructions. Use `npm run staging:sanitize -- --input approved-export.json --output staging-data.json --denylist denylist.txt` only with an approved read-only export. Never commit production exports or pastoral data. See `docs/MIGRATION_SAFETY_CHUNK_3.md`.

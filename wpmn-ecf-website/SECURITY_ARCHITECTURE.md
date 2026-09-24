# WPMN Website Security Architecture

## Current data and authentication path

The website does not use Redis or Upstash. Sites supplies the authenticated user identity. The server independently checks editor roles and permissions against Cloudflare D1. D1 also stores public content, pastoral intake records, audit events, and rate-limit counters. Uploaded files use the configured object-storage binding.

The `@upstash/redis` name may appear inside the lockfile because Drizzle ORM declares it as an optional peer dependency. It is not installed as an application dependency and is not used by the website.

## Redis introduction rule

Redis or Upstash must not be added as an application dependency, import, environment variable, session store, cache, or rate-limit backend through an ordinary feature change. The security test fails if those signals appear.

Any future Redis proposal requires a separate security review before code is merged. That review must establish:

- the exact data stored and whether it includes sessions, identities, permissions, pastoral information, or rate limits;
- the exact Redis commands the application executes;
- the narrow key prefixes the application may access;
- a non-default ACL user that denies every unneeded command and key;
- credential rotation, secret storage, revocation, and session-invalidation procedures;
- network restrictions supported by the chosen host and deployment provider;
- logs, alerting, backup, retention, and incident ownership;
- tests proving the application cannot use the default administrative credential.

If an exposed Redis credential is suspected, revoke or reset it first. Invalidate affected sessions before restoring application access. Adding an ACL after a credential leak does not invalidate copied session tokens.

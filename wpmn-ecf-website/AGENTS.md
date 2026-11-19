# Feature changes

Write behavior tests alongside each executable feature change, in the same PR. Cover happy paths, invalid input, denied permissions, failure and replay cases that apply. Use TESTING.md for commands, coverage scope and provider boundaries. Run fast tests on each change and integration tests before requesting merge. Preserve the 60 percent line/branch/function floors and existing security controls. Do not inflate coverage with static content or omit new logic from the denominator. Do not call API tests browser end-to-end tests. Never access production pastoral data for test fixtures.

Follow the repository [rules](../AGENTS.md) and use the [codebase map](../CODEBASE_MAP.md) before planning broad work. Run the root harness and include its actual results in the completion summary.

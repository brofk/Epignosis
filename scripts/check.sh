#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
results=()
failed=0

run_check() {
  local label=$1
  shift
  printf '\n== %s ==\n' "$label"
  if "$@"; then
    results+=("PASS  $label")
  else
    local status=$?
    results+=("FAIL  $label (exit $status)")
    failed=1
  fi
}

check_map() {
  local directory directories
  directories=$(git ls-files | awk -F/ 'NF > 1 {print $1} $1 == "wpmn-ecf-website" && NF > 2 {print $1 "/" $2}' | sort -u) || return 1
  local missing=0
  while IFS= read -r directory; do
    if ! grep -Fq "\`$directory/\`" CODEBASE_MAP.md; then
      printf 'Document %s/ in CODEBASE_MAP.md\n' "$directory"
      missing=1
    fi
  done <<< "$directories"
  return "$missing"
}

run_check "Codebase map" check_map
run_check "Reviewer tests (Node)" node --test .github/scripts/*.test.mjs
run_check "Reviewer tests (Python)" python3 .github/scripts/test_collect_ai_usage.py

cd wpmn-ecf-website
run_check "Website unit tests and coverage" pnpm run test:unit
run_check "Website integration tests and coverage" pnpm run test:integration
run_check "TypeScript" pnpm exec tsc --noEmit
run_check "ESLint" pnpm run lint
run_check "Dependency advisories (high and critical)" pnpm audit --audit-level high
run_check "Website build" pnpm run build
run_check "Browser journeys" pnpm run test:browser

printf '\n== Harness results ==\n'
printf '%s\n' "${results[@]}"
exit "$failed"

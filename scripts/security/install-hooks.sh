#!/bin/sh
set -eu
root=$(git rev-parse --show-toplevel)
cd "$root"
existing=$(git config --local --get core.hooksPath || true)
if [ -n "$existing" ] && [ "$existing" != '.githooks' ]; then
  echo 'An existing hooksPath is configured. Integrate the secret scanner into that hook instead of replacing it.' >&2
  exit 1
fi
if [ -z "$existing" ] && [ -f "$(git rev-parse --git-path hooks/pre-commit)" ]; then
  echo 'An existing pre-commit hook is installed. Integrate the secret scanner before switching hooksPath.' >&2
  exit 1
fi
sh scripts/security/scan-secrets.sh staged
git config --local core.hooksPath .githooks
echo 'Secret-scanning hook enabled for this clone.'

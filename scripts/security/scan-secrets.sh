#!/bin/sh
set -eu
root=$(git rev-parse --show-toplevel)
cd "$root"
mode=${1:-history}
case "$mode" in staged|history) ;; *) echo 'Use staged or history.' >&2; exit 2;; esac
if ! command -v gitleaks >/dev/null 2>&1; then
  echo 'Secret scan blocked: install Gitleaks 8.30.1 first. See SECRET_SECURITY.md.' >&2
  exit 2
fi
if [ "$(gitleaks version)" != '8.30.1' ]; then
  echo 'Secret scan blocked: Gitleaks must be version 8.30.1.' >&2
  exit 2
fi
# Check the whole index, including files already tracked before gitignore existed.
python3 "$root/scripts/security/check-tracked-secrets.py"
log=$(mktemp)
trap 'rm -f "$log"' EXIT HUP INT TERM
unset GITLEAKS_CONFIG GITLEAKS_CONFIG_TOML
if [ "$mode" = staged ]; then
  set -- git --pre-commit --staged
else
  set -- git --log-opts='--all --full-history'
fi
# Ignore files and inline suppression comments cannot silently waive findings.
if ! gitleaks "$@" --config "$root/.gitleaks.toml" --gitleaks-ignore-path "$root/scripts/security/no-ignore" --ignore-gitleaks-allow --redact=100 --no-banner --log-level error . >"$log" 2>&1; then
  echo 'Secret scan failed. Do not push. Run Gitleaks locally with --redact=100 to inspect locations without exposing values.' >&2
  exit 1
fi
echo 'Secret scan passed.'

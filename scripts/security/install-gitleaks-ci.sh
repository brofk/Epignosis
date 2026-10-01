#!/bin/sh
set -eu
[ "$(uname -s)" = Linux ] && [ "$(uname -m)" = x86_64 ] || { echo 'This installer is for Linux x64 CI only.' >&2; exit 1; }
directory=$(mktemp -d)
trap 'rm -rf "$directory"' EXIT HUP INT TERM
curl --fail --silent --show-error --location --retry 3 --connect-timeout 15 --max-time 120 \
  https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz \
  -o "$directory/gitleaks.tar.gz"
printf '%s  %s\n' '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb' "$directory/gitleaks.tar.gz" | sha256sum --check --status
tar --no-same-owner -xzf "$directory/gitleaks.tar.gz" -C "$directory" gitleaks
mkdir -p "$HOME/.local/bin"
install -m 755 "$directory/gitleaks" "$HOME/.local/bin/gitleaks"
printf '%s\n' "$HOME/.local/bin" >> "$GITHUB_PATH"

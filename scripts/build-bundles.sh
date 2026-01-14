#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if ! command -v zip >/dev/null 2>&1; then
  echo "ERROR: 'zip' not found in PATH" >&2
  exit 1
fi

mkdir -p bundles
rm -f bundles/go-coder.skill bundles/rust-coder.skill

zip -rq bundles/go-coder.skill go-coder
zip -rq bundles/rust-coder.skill rust-coder

echo "Wrote:"
ls -la bundles/*.skill


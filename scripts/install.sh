#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: install.sh [--force]

Installs skills into $CODEX_HOME/skills (default: ~/.codex/skills).
EOF
}

force=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) force=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
  esac
  shift
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
codex_home="${CODEX_HOME:-$HOME/.codex}"
dest="$codex_home/skills"

mkdir -p "$dest"

for skill in go-coder rust-coder; do
  src="$repo_root/$skill"
  dst="$dest/$skill"

  if [[ -e "$dst" && $force -ne 1 ]]; then
    echo "ERROR: $dst already exists (use --force to overwrite)" >&2
    exit 1
  fi

  rm -rf "$dst"
  cp -a "$src" "$dst"
done

echo "Installed to: $dest"


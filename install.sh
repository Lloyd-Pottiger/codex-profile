#!/bin/sh
set -eu

REPO_URL=${CODEX_PROFILE_REPO:-https://github.com/Lloyd-Pottiger/codex-profile.git}
REPO_REF=${CODEX_PROFILE_REF:-main}
SOURCE_DIR=${CODEX_PROFILE_SOURCE:-}
TMP_DIR=

usage() {
    cat <<'EOF'
Usage: install.sh

Install or update this Codex profile in ${CODEX_HOME:-$HOME/.codex}.

Environment:
  CODEX_HOME           Destination Codex home. Defaults to $HOME/.codex.
  CODEX_PROFILE_SOURCE  Local source checkout to install from.
  CODEX_PROFILE_REPO    Git repository used when no local source is found.
  CODEX_PROFILE_REF     Git branch or tag used when cloning. Defaults to main.

The installer adds missing files and updates existing profile files in place.
Files that exist only in the destination are kept.
EOF
}

log() {
    printf '%s\n' "$*"
}

die() {
    printf 'error: %s\n' "$*" >&2
    exit 1
}

cleanup() {
    if [ -n "$TMP_DIR" ]; then
        rm -rf "$TMP_DIR"
    fi
}

path_exists() {
    [ -e "$1" ] || [ -L "$1" ]
}

resolve_codex_home() {
    if [ -n "${CODEX_HOME:-}" ]; then
        printf '%s\n' "$CODEX_HOME"
        return
    fi

    [ -n "${HOME:-}" ] || die 'HOME is not set; set CODEX_HOME explicitly'
    printf '%s\n' "$HOME/.codex"
}

find_local_source() {
    if [ -n "$SOURCE_DIR" ]; then
        return
    fi

    case $0 in
        */*)
            script_dir=$(CDPATH= cd "$(dirname "$0")" && pwd -P)
            ;;
        *)
            script_dir=
            ;;
    esac

    if [ -n "$script_dir" ] &&
        [ -f "$script_dir/AGENTS.md" ] &&
        [ -d "$script_dir/agents" ] &&
        [ -d "$script_dir/skills" ]; then
        SOURCE_DIR=$script_dir
    fi
}

clone_source() {
    command -v git >/dev/null 2>&1 ||
        die 'git is required when install.sh is run outside a local checkout'

    tmp_parent=${TMPDIR:-/tmp}
    TMP_DIR=$(mktemp -d "${tmp_parent%/}/codex-profile.XXXXXX")
    trap cleanup EXIT HUP INT TERM

    printf 'Cloning %s (%s)...\n' "$REPO_URL" "$REPO_REF" >&2
    git clone --depth 1 --branch "$REPO_REF" "$REPO_URL" "$TMP_DIR/repo" >/dev/null 2>&1 ||
        die "failed to clone $REPO_URL at $REPO_REF"
    SOURCE_DIR=$TMP_DIR/repo
}

validate_source() {
    [ -f "$1/AGENTS.md" ] || die "missing AGENTS.md in source: $1"
    [ -d "$1/agents" ] || die "missing agents/ in source: $1"
    [ -d "$1/skills" ] || die "missing skills/ in source: $1"
}

installed_count=0
updated_count=0
unchanged_count=0
skipped_count=0

install_file() {
    if path_exists "$2"; then
        if [ -L "$2" ]; then
            log "skip existing symlink $3: $2"
            skipped_count=$((skipped_count + 1))
            return
        fi

        if [ -d "$2" ]; then
            log "skip conflicting directory $3: $2"
            skipped_count=$((skipped_count + 1))
            return
        fi

        if [ ! -f "$2" ]; then
            log "skip conflicting non-file $3: $2"
            skipped_count=$((skipped_count + 1))
            return
        fi

        if cmp -s "$1" "$2"; then
            log "unchanged $3: $2"
            unchanged_count=$((unchanged_count + 1))
            return
        fi

        cp -p "$1" "$2"
        log "updated $3: $2"
        updated_count=$((updated_count + 1))
        return
    fi

    cp -p "$1" "$2"
    log "installed $3: $2"
    installed_count=$((installed_count + 1))
}

install_dir() {
    if path_exists "$2"; then
        if [ -L "$2" ] || [ ! -d "$2" ]; then
            log "skip conflicting non-directory $3: $2"
            skipped_count=$((skipped_count + 1))
            return
        fi

        install_tree "$1" "$2" "$3"
        return
    fi

    cp -pR "$1" "$2"
    log "installed $3: $2"
    installed_count=$((installed_count + 1))
}

install_entry() {
    if [ -d "$1" ] && [ ! -L "$1" ]; then
        install_dir "$1" "$2" "$3"
    else
        install_file "$1" "$2" "$3"
    fi
}

install_tree() {
    for src in "$1"/* "$1"/.[!.]* "$1"/..?*; do
        path_exists "$src" || continue
        name=${src##*/}
        install_entry "$src" "$2/$name" "$3/$name"
    done
}

install_agents_md() {
    install_file "$1/AGENTS.md" "$2/AGENTS.md" AGENTS.md
}

install_children() {
    src_dir=$1
    dest_dir=$2
    label=$3

    for src in "$src_dir"/* "$src_dir"/.[!.]* "$src_dir"/..?*; do
        path_exists "$src" || continue
        name=${src##*/}
        dest=$dest_dir/$name

        install_entry "$src" "$dest" "$label/$name"
    done
}

main() {
    case ${1:-} in
        -h|--help)
            usage
            exit 0
            ;;
        '')
            ;;
        *)
            usage >&2
            exit 2
            ;;
    esac

    codex_home=$(resolve_codex_home)
    find_local_source
    if [ -z "$SOURCE_DIR" ]; then
        clone_source
    fi

    validate_source "$SOURCE_DIR"

    mkdir -p "$codex_home" "$codex_home/agents" "$codex_home/skills"

    install_agents_md "$SOURCE_DIR" "$codex_home"
    install_children "$SOURCE_DIR/agents" "$codex_home/agents" agents
    install_children "$SOURCE_DIR/skills" "$codex_home/skills" skills

    log "Done. Installed: $installed_count. Updated: $updated_count. Unchanged: $unchanged_count. Skipped: $skipped_count."
}

main "$@"

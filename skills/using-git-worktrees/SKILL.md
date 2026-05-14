---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from the current workspace or before executing implementation plans - creates isolated git worktrees, preferring a project-adjacent <repo>.worktrees directory unless the user or repository explicitly requests another path
---

# Using Git Worktrees

## Overview

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously without switching.

**Core principle:** Project-adjacent by default + safety verification = reliable isolation.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Directory Selection Process

Follow this priority order. By default, put worktrees beside the repository in `<repo-name>.worktrees` so the layout matches editor workflows such as VS Code. Do not default to repository-internal paths such as `.worktrees/` or config-owned global paths such as `~/.config/superpowers`; use another path only when the user or repository instructions explicitly ask for it.

### 1. Honor Explicit Instructions

If the user gives a worktree location, use it. Otherwise, check repository instructions for a worktree directory preference:

```bash
rg -i "worktree.*(dir|director|path)|worktrees/" AGENTS.md CLAUDE.md docs .agents 2>/dev/null
```

**If preference specified:** Use it without asking.

### 2. Default to Project-Adjacent

If no explicit preference is found, use `<parent-of-repo>/<repo-name>.worktrees/`.

Example: if the repository is `~/projects/xx`, use `~/projects/xx.worktrees/`.

### Submodules

If the current repository is a submodule, place its worktrees under the superproject's worktree root, grouped by the submodule path:

```bash
super_root=$(git rev-parse --show-superproject-working-tree)
submodule_root=$(git rev-parse --show-toplevel)

if [ -n "$super_root" ]; then
  super_worktree_root="$(dirname "$super_root")/$(basename "$super_root").worktrees"
  submodule_rel="${submodule_root#$super_root/}"
  default_worktree_root="$super_worktree_root/submodules/$submodule_rel"
fi
```

Example: if the superproject is `~/projects/A` and the submodule is `~/projects/A/third_party/B`, use `~/projects/A.worktrees/submodules/third_party/B/`.

## Safety Verification

### For Project-Adjacent Directories (`<repo>.worktrees`)

No `.gitignore` verification is needed because the worktree root is outside the repository.

### For Explicit Repository-Internal Directories

Only use a repository-internal directory when the user or repository instructions explicitly specify it. If so, **MUST verify directory is ignored before creating worktree:**

```bash
# Check if the selected directory is ignored (respects local, global, and system gitignore)
git -C "$repo_root" check-ignore -q "${WORKTREE_ROOT#$repo_root/}" 2>/dev/null
```

**If NOT ignored:**

1. Add the chosen worktree directory to `.git/info/exclude` by default.
2. Use `.gitignore` only when the project convention or user explicitly wants the ignore rule committed.
3. Proceed with worktree creation

**Why critical:** Prevents accidentally committing worktree contents to repository.

### For Explicit External Directories

No `.gitignore` verification is needed for paths outside the repository. External directories must come from the user or repository instructions, not from this skill's default behavior.

## Creation Steps

### 1. Detect Project Name

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. Create Worktree

```bash
repo_root=$(git rev-parse --show-toplevel)
default_worktree_root="$(dirname "$repo_root")/$(basename "$repo_root").worktrees"

super_root=$(git rev-parse --show-superproject-working-tree)
if [ -n "$super_root" ]; then
  super_worktree_root="$(dirname "$super_root")/$(basename "$super_root").worktrees"
  submodule_rel="${repo_root#$super_root/}"
  default_worktree_root="$super_worktree_root/submodules/$submodule_rel"
fi

# Determine full path from the selected worktree root.
# Default: <parent-of-repo>/<repo-name>.worktrees/<branch-name>
WORKTREE_ROOT="${WORKTREE_ROOT:-$default_worktree_root}"
path="$WORKTREE_ROOT/$BRANCH_NAME"

# Create worktree with new branch
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### 3. Run Project Setup

Auto-detect and run appropriate setup:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

### 4. Verify Clean Baseline

Run tests to ensure worktree starts clean:

```bash
# Examples - use project-appropriate command
npm test
cargo test
pytest
go test ./...
```

**If tests fail:** Report failures, ask whether to proceed or investigate.

**If tests pass:** Report ready.

### 5. Report Location

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| User specifies a path | Use it |
| Repository instructions specify a path | Use it |
| Sibling `<repo>.worktrees/` already exists | Use it |
| None exists | Use sibling `<repo>.worktrees/` |
| Explicit repository-internal directory not ignored | Add to `.git/info/exclude` by default |
| Tests fail during baseline | Report failures + ask |
| No package.json/Cargo.toml | Skip dependency install |

## Common Mistakes

### Skipping ignore verification

- **Problem:** Worktree contents get tracked, pollute git status
- **Fix:** Avoid repository-internal worktree roots unless explicitly requested; if requested, use `git check-ignore` first

### Assuming directory location

- **Problem:** Creates inconsistency, violates project conventions, or scatters worktrees into unrelated global config directories
- **Fix:** Follow priority: user/repo instructions > sibling `<repo>.worktrees/`

### Proceeding with failing tests

- **Problem:** Can't distinguish new bugs from pre-existing issues
- **Fix:** Report failures, get explicit permission to proceed

### Hardcoding setup commands

- **Problem:** Breaks on projects using different tools
- **Fix:** Auto-detect from project files (package.json, etc.)

## Example Workflow

```
You: I'm using the using-git-worktrees skill to set up an isolated workspace.

[Compute default root: /Users/jesse/projects/myproject.worktrees]
[Create worktree: git worktree add /Users/jesse/projects/myproject.worktrees/auth -b feature/auth]
[Run npm install]
[Run npm test - 47 passing]

Worktree ready at /Users/jesse/projects/myproject.worktrees/auth
Tests passing (47 tests, 0 failures)
Ready to implement auth feature
```

## Red Flags

**Never:**
- Create repository-internal worktree without verifying it's ignored
- Use repository-internal `.worktrees/` or `worktrees/` just because it exists
- Default to a config-owned global path such as `~/.config/superpowers`
- Skip baseline test verification
- Proceed with failing tests without asking
- Assume directory location when ambiguous
- Skip repository instruction checks

**Always:**
- Follow directory priority: user/repo instructions > sibling `<repo>.worktrees/`
- Verify directory is ignored for explicitly requested repository-internal roots
- Auto-detect and run project setup
- Verify clean test baseline

## Integration

Use before substantial feature work when isolation is valuable, especially for multi-commit changes, risky refactors, long-running experiments, or any workflow that needs an isolated workspace.

Clean up worktrees with `git worktree remove <path>` after the branch is merged, abandoned, or no longer needed.

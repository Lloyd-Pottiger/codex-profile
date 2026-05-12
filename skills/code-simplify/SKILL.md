---
name: code-simplify
description: Use when simplifying, cleaning up, or de-bloating a patch, branch, PR, or changed diff before review or merge, especially when code may duplicate existing helpers, carry temporary scaffolding or over-abstraction, add hot-path overhead, grow a noisy diff, or accumulate redundant intermediate TDD tests.
---

# Code Simplify

## Overview

Simplify the final diff, not the story of how you reached it.

**Core principle:** prefer deleting unnecessary code, state, comments, and tests over hiding them behind more abstraction. Keep only behaviorally distinct logic and tests.

**Decision order:** `delete > reuse > merge > abstract`

## Required Background

Load the language-specific coder skill before applying this workflow:
- mostly `.go` changes -> `go-coder`
- mostly `.rs` changes -> `rust-coder`
- mixed-language diffs -> apply the matching coder skill rules per file type

If no language-specific coder skill exists, still follow this cleanup workflow and stay consistent with the repo's local rules.

## Common Triggers

- "simplify this patch/branch/PR before merge"
- "clean up this diff" or "trim this refactor"
- "find reuse opportunities" or "dedupe this code"
- "remove scaffolding / hacky code / temporary helpers"
- "too many tests", "redundant tests", or "TDD left a noisy diff"

## Guardrails

- **Scope guard:** default to changes tightly coupled to the current diff. Do not turn simplify work into a broad drive-by refactor unless the user asked for it or the local change is impossible to make safely without the wider cleanup.
- **Behavior guard:** do not remove externally visible contracts just because the code looks simpler without them. Keep required error context, logging fields, metrics, protocol behavior, concurrency or lifecycle constraints, and compatibility guarantees unless you are intentionally changing that behavior.
- **Test replacement rule:** before deleting or merging a test, identify the surviving test that preserves the same guarantee or a stronger one. If no such test exists, keep the original or replace it with a clearer final-form test in the same change.

## Workflow

1. Identify the review scope:
   - Run `git diff`.
   - If `git diff --cached` is non-empty, use `git diff HEAD` so staged and unstaged edits are both visible.
   - If there is no diff, review the most recently modified files the user mentioned or you touched earlier in the conversation. If there is still no clear target, ask which files to simplify.
2. Launch three review agents in parallel and give each the full diff.
   - In Codex, use one `multi_tool_use.parallel` call that wraps three `functions.spawn_agent` calls.
   - Agent 1: reuse review - search nearby modules, packages, shared helper/util directories, existing types, constants, and APIs that replace new code.
   - Agent 2: quality review - find derived or cached state that could be computed directly, parameter sprawl, copy-paste variants, leaky abstractions, stringly-typed inputs where constants/enums/typed wrappers already exist, and unnecessary comments.
   - Agent 3: efficiency review - find extra allocations or copies, repeated parsing or lookups, hot-path bloat, broad scans, TOCTOU pre-checks, lock contention, concurrency that does needless work, unconditional no-op updates, unbounded structures, or missing cleanup.
   - If subagents are unavailable, do the same three passes locally in that order.
3. Aggregate findings. Fix the real issues directly. If a finding is a false positive or not worth addressing, note it briefly and move on.
   - Apply simplifications in this order: `delete`, then `reuse`, then `merge`, and only introduce a new abstraction when the simpler options fail.
4. Apply a simplify pass:
   - replace ad-hoc helpers with existing utilities where they already express the behavior clearly
   - collapse near-duplicate branches, functions, impls, and error paths into one clear path
   - remove redundant fields or cached state that can be derived cheaply
   - tighten APIs: remove bool flags and excess parameters when a clearer type, config object, or existing option pattern already expresses the choice
   - reduce unnecessary allocations, clones, copies, repeated encoding or decoding, repeated parsing, repeated file or network work, and other common-case waste
   - avoid unconditional state, store, cache, or watcher updates; preserve the local no-change signal, such as same-reference returns from updater or reducer callbacks
   - operate directly and handle errors instead of pre-checking file or resource existence when the pre-check only adds a TOCTOU window
   - bound or clean up maps, queues, listeners, tickers, goroutines, tasks, and other resources introduced by the diff
   - delete comments that narrate what the code obviously does, explain patch history, or describe caller intent; keep invariants, safety notes, protocol caveats, compatibility constraints, and non-obvious why
5. Simplify tests created during iterative TDD:
   - delete intermediate RED or GREEN tests that only proved a temporary step and no longer protect distinct behavior
   - merge near-duplicate tests into focused table-driven cases or shared helpers when that improves clarity
   - prefer end-state regression tests that cover observable behavior, important invariants, and real failure boundaries
   - do not keep tests that only assert a refactor path, private helper shape, or temporary scaffolding unless that behavior is an actual contract
   - coverage matters; test archaeology does not
6. Verify with the repo formatter and focused checks before claiming success. Use the smallest command set that proves the simplified diff is correct.

## Quick Review Targets

| Pass | What to look for |
|------|------------------|
| reuse | duplicated path or string handling, hand-rolled conversions, local error glue, new helpers that existing APIs, constants, or types already cover |
| quality | extra struct fields, bool flags, long argument lists, copy-paste branches, stringly-typed code, comments stating the obvious, abstractions that only preserve patch history |
| efficiency | unnecessary allocations or copies, repeated parsing or splitting, repeated file or RPC reads, broad scans, lock scope too wide, needless concurrency, unconditional no-op updates, missing cleanup, work added to hot loops |

## Test-Pruning Rules

Keep a test only if removing it would lose a distinct behavioral guarantee.

Before deleting or merging a test, name the surviving test or replacement test that still covers the behavior. If you cannot point to one, the test is not redundant yet.

Good reasons to keep a test:
- it protects a public contract
- it captures a previously failing regression
- it checks a safety, concurrency, or lifecycle invariant
- it covers an error boundary or hot-path behavior the larger tests do not isolate

Good reasons to delete or merge a test:
- it only proved an intermediate TDD step
- a clearer final test already subsumes it
- it asserts internal helper shape rather than observable behavior
- several tests differ only by literals and belong in one table

## Red Flags

- "Leave it in for safety" when no distinct behavior depends on it
- "This helper might be useful later" without a second real caller
- "Tests are cheap, keep them all" when several tests protect the same behavior
- "I already touched this area, may as well clean everything nearby" when the extra refactor is outside the task's safe scope
- "A new abstraction is cleaner" before trying deletion, reuse, or merge

## Example

Partner: "Simplify this patch before merge. Review the diff for reuse, code quality, efficiency, and trim any low-value TDD tests."

You: inspect the diff, load the matching language coder skill, run the three review agents in parallel with the full patch, apply the real fixes, prune redundant tests, then verify with the formatter and targeted checks before reporting what changed.

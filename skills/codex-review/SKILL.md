---
name: codex-review
description: Run a synchronous independent Codex CLI deep code review for non-trivial, final, high-risk, or production-critical changes. Use when explicitly invoked as $codex-review, when asked for a deep/second-pass review, or as the final review phase after substantial implementation; after starting the script, wait for it to exit before doing any triage or final response.
---

# Codex Review

Launch a separate Codex reviewer through `scripts/review.js` and wait for it to complete. Use your own judgment only after the script exits, to verify and triage the script's findings.

## Synchronous Execution Rule

After starting `scripts/review.js`, the active task is waiting for that process to finish.

- Do not run a separate manual review while the script is still running.
- Do not inspect the diff in parallel as a substitute for waiting.
- Do not produce findings, a final answer, or a review summary until the script exits.
- If the command returns a session id, keep polling that same session until it exits.
- While waiting, send only brief progress updates to the user.
- If the user asks for status, report whether the script is still running, then keep waiting unless the user explicitly tells you to stop.

## Fit

Use this skill when:

- The user explicitly invokes `$codex-review` or asks for a deep review.
- The change is non-trivial, high-risk, production-critical, or performance-sensitive.
- A substantial implementation is complete and needs a final independent review pass.

Avoid this skill when:

- The request is a small or simple review that can be handled by direct inspection.
- Code is still changing rapidly and the review result would immediately go stale.
- The user needs an interactive design discussion rather than a finished-code review.

## Workflow

1. Define the review scope.

Use the narrowest prompt that matches the request:

```text
Review current code changes (staged, unstaged, and untracked files)
Review code changes against the base branch <branch>
Review code changes introduced by commit <sha> (<title>)
Review code changes for commit range <sha1>..<sha2>
Review <specific path/module/feature> for <specific risk or behavior>
```

If none of these scopes can be inferred from the user request or repository state, ask for clarification before running the tool.

2. Run the review script in the foreground.

```shell
node <skill-directory>/scripts/review.js --cwd "<project directory>" "<review prompt>"
```

`scripts/review.js` lives inside this skill directory, not inside the project being reviewed. The review may take a long time; let it run until it exits. Do not append `&`, do not detach it, and do not move on to another review path while it is active.

3. Monitor progress.

The script prints occasional progress and final Markdown. Poll the running command session every few minutes. Do not treat the review as stuck until there has been no progress for more than 30 minutes.

4. After the script exits, triage the result before answering the user.

- Verify each reported finding against the diff and surrounding code.
- Drop clear false positives instead of forwarding them blindly.
- Preserve the reviewer's priority labels when they are defensible; adjust only when the evidence clearly supports a different severity.
- If the review reports no actionable findings, say that directly and include any residual test or validation gaps it identified.

## Review Standard

The delegated reviewer is instructed to perform a production-critical review:

- Determine the exact change set before judging it.
- Understand the problem, intent, and solution mechanics from code, tests, docs, commit messages, and repository instructions.
- Explain or internally account for non-obvious control flow, data flow, state changes, concurrency, and failure modes.
- Evaluate negative impacts across correctness, security, robustness, compatibility, CPU, memory, IO/RPC behavior, logging cost, and maintainability.
- Report only discrete, actionable issues that the author would likely fix.
- Prefer no findings over speculative findings.

## Priority Labels

- `[P0]`: Drop everything to fix. Blocking release, operations, or major usage.
- `[P1]`: Urgent. Should be addressed in the next cycle.
- `[P2]`: Normal. Should be fixed eventually.
- `[P3]`: Low. Nice to have.

## Constraints

- Run this at most once for a given review scope unless the code changed substantially after the run.
- Do not use this as a lint replacement.
- Do not ask the delegated reviewer to edit files.
- Do not call the script "background" work; it is the foreground review task until it exits.
- If the script exits unsuccessfully, report the failure and the visible output; do not fabricate review results.

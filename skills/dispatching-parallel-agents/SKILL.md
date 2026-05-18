---
name: dispatching-parallel-agents
description: Coordinate explicit fan-out to multiple Codex subagents, wait for them correctly, integrate their work, then optionally dispatch review agents. Use when the user explicitly requests dispatch, parallel agents, subagents, multi-agent work, fan-out, review agents, or 并发 subagents.
---

# Dispatching Parallel Agents

Use this skill only when the user explicitly authorizes subagents, delegation, or parallel agent work. Do not treat task complexity alone as permission to spawn agents.

## Non-Negotiables

- Spawn multiple agents only for genuinely independent work that can run in parallel.
- If spawning 2 or more agents, use one `multi_tool_use.parallel` call that wraps the `spawn_agent` calls.
- Give each agent a concrete, self-contained task with clear scope, expected output, and ownership.
- Do not duplicate delegated work locally or edit a worker's owned files while it is running.
- A `wait_agent` timeout is not a failure. It means the agent has not reached a final state yet.
- Do not finish, summarize, or start review fan-out until every required first-stage agent reaches a final state, unless the user interrupts or changes the plan.
- Default review agents are read-only. They report findings; the main agent decides and applies any fixes.

## Dispatch Planning

Before spawning, state assumptions, success criteria, and dispatch shape.

For non-trivial dispatch, first use `agent_type: "agent-organizer"` to propose the lineup, local-vs-delegated split, ownership boundaries, dependency/wait points, and prompt skeletons. Non-trivial means 2 or more first-stage agents, user-specified `n`, mixed read/write work, unclear ownership, or review fan-out after implementation. While the organizer runs, the main agent may read non-overlapping context and prepare verification, but should not launch first-stage workers until the organizer finishes or the user chooses a new path after the wait budget.

Choose first-stage agents by real boundaries:

- Use `agent_type: "explorer"` for independent codebase questions.
- Use `agent_type: "worker"` for implementation slices with disjoint file or module ownership.
- Use `agent_type: "reviewer"` only after there is a stable artifact to review.
- Use `agent_type: "qa-expert"` for dedicated test strategy, acceptance coverage, or release-risk review.
- If the user requests `n` agents but the work cannot be split safely into `n` independent tasks, spawn fewer and explain why.
- Keep one immediate local task when useful; do not outsource the next critical-path blocker and then idle.

Each worker prompt must say the agent is not alone in the codebase, must not revert unrelated edits or edits by other agents, and must include `Ownership`, `Task`, `Constraints`, and `Return format`.

## Waiting Protocol

Use long joins. Codex subagents can be slow.

- Preferred single wait: `wait_agent` on all outstanding targets with a `10-20 min` timeout.
- Default global wait budget: `60 min`, unless the user specifies a different budget.
- If a wait times out before the global budget, report brief status if useful, continue non-overlapping work, then wait again.
- Do not infer agent failure from one or more timeouts.
- If the global budget is reached, report completed agents, outstanding agents, partial results, and ask whether to continue waiting, close slow agents, or take over.

Valid reasons to stop waiting before all first-stage agents finish: the user interrupts or changes the request; an agent reaches a terminal failed/cancelled state; or the global wait budget is reached and the user chooses a new path.

## Required Agent Output

Workers must return: `Scope`, `Result`, `Changed files`, `Verification`, and `Risks/Follow-ups`.

Explorers and reviewers must return: `Scope`, `Findings`, `Evidence`, and `Risks/Follow-ups`.

Reject vague output. If an answer lacks evidence, changed-file scope, or verification status, treat it as incomplete and resolve the gap before relying on it.

## Integration

After all first-stage agents finish, read each result, inspect important changed files or evidence, resolve conflicts and incompatible assumptions, apply only evidence-supported integrations, and run relevant local verification before claiming success.

Do not trust an agent success report by itself. Inspect changed files or evidence that matters, then verify the integrated result locally.

## Review Fan-Out

After first-stage work is integrated, launch review agents if the user requested review fan-out or this workflow calls for post-work review.

- Use the user-specified review-stage count. If unspecified, default to 3 agents.
- Review-stage agents are read-only unless the user explicitly authorizes them to edit.
- Spawn 2 or more review-stage agents with `multi_tool_use.parallel`.
- Use `agent_type: "reviewer"` for defect-review angles and `agent_type: "qa-expert"` for test, validation, or rollout angles.
- Give every review-stage agent the same stable artifact or diff, plus a distinct angle.

Default review lineup:

1. `reviewer`: correctness and requirement coverage.
2. `reviewer`: simplicity, maintainability, performance, and concurrency risk.
3. `qa-expert`: tests, verification, rollout, and operational risk.

Wait for review agents with the same protocol. Integrate findings by severity and evidence. Fix real issues, reject false positives explicitly, and re-run verification after changes.

## Final Report

Keep the final report short, but include:

- first-stage agents spawned and their scopes;
- whether all agents reached final state and whether any waits timed out before completion;
- review agents spawned and the review angles;
- key review findings accepted or rejected;
- final verification commands and results.

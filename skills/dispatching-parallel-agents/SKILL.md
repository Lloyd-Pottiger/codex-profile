---
name: dispatching-parallel-agents
description: Coordinate explicit fan-out to multiple Codex subagents, wait for them correctly, integrate their work, then optionally dispatch review agents. Use when the user explicitly requests dispatch, parallel agents, subagents, multi-agent work, fan-out, review agents, or 并发 subagents.
---

# Dispatching Parallel Agents

Use this skill only when the user explicitly authorizes subagents, delegation, or parallel agent work. Do not treat task complexity alone as permission to spawn agents.

## Non-Negotiables

- Spawn multiple agents only for genuinely independent work that can run in parallel.
- When the user gives an agent count, treat it as the number of spawned task agents. The main agent and any organizer do not count.
- If spawning 2 or more agents, use one `multi_tool_use.parallel` call that wraps the `spawn_agent` calls.
- Give each agent a concrete, self-contained task with clear scope, expected output, and ownership.
- Use the main agent primarily as an orchestrator: keep local context focused on planning, ownership, integration, and verification.
- Do not duplicate delegated work locally or edit a worker's owned files while it is running.
- For 2 or more concurrent writer agents, use `$using-git-worktrees` isolation: one worktree branch per writer, then pick the accepted commits back to the target branch during integration.
- A `wait_agent` timeout is not a failure. It means the agent has not reached a final state yet.
- Do not finish, summarize, or start review fan-out until every required first-stage agent reaches a final state, unless the user interrupts or changes the plan.
- Default review agents are read-only. They report findings; the main agent decides and applies any fixes.

## Dispatch Planning

Before spawning, state assumptions, success criteria, and dispatch shape.

For non-trivial dispatch, first use `agent_type: "agent-organizer"` to propose the lineup, local-vs-delegated split, ownership boundaries, dependency/wait points, and prompt skeletons. Non-trivial means 2 or more first-stage agents, user-specified `n`, mixed read/write work, unclear ownership, or review fan-out after implementation. If the user specified `n`, instruct the organizer to plan for `n` spawned task agents when safe and to explain any smaller lineup. While the organizer runs, the main agent may read non-overlapping context and prepare verification, but should not launch first-stage workers until the organizer finishes or the user chooses a new path after the wait budget.

The main agent should minimize local context growth. Delegate targeted code reading, implementation slices, test planning, and review whenever those tasks are independent enough to run in parallel. Locally keep only the compact state needed to coordinate the work: task intent, constraints, ownership map, branch/worktree map, wait status, integration order, and verification plan.

Choose first-stage agents by real boundaries:

- Use `agent_type: "explorer"` for independent codebase questions.
- Use `agent_type: "worker"` for implementation slices with disjoint file or module ownership.
- Use `agent_type: "reviewer"` only after there is a stable artifact to review.
- Use `agent_type: "qa-expert"` for dedicated test strategy, acceptance coverage, or release-risk review.
- If the user requests `n` agents, spawn `n` when there are `n` safe independent scopes. Spawn fewer only when the work cannot be split that way, and explain why.
- Keep one immediate local task only when it is cheap, clearly useful, or on the critical path; otherwise prefer orchestration work such as preparing verification, tracking ownership, and integrating completed branches.

Each worker prompt must say the agent is not alone in the codebase, must not revert unrelated edits or edits by other agents, and must include `Ownership`, `Task`, `Constraints`, and `Return format`.

## Concurrent Write Isolation

When 2 or more first-stage agents will write code or docs concurrently, isolate the write work before spawning them:

1. Use `$using-git-worktrees` to select a safe worktree root and create one branch/worktree per writer from the current target branch.
2. Give each writer its worktree path, branch name, owned files/modules, and explicit instruction to make changes only inside that worktree and ownership scope.
3. Require each writer to leave accepted work as one or more commits on its branch when feasible. If committing is not feasible, require a clean diff summary and exact changed-file list.
4. Do not assign overlapping write ownership to concurrent writers. If overlap is unavoidable, serialize those agents or split the work differently.
5. After all writer agents finish, inspect each branch or diff, then return to the target branch or integration worktree and cherry-pick/pick accepted commits in a deliberate order.
6. Resolve integration conflicts only in the target branch or integration worktree, re-run verification after integration, and keep worker worktrees until their changes are safely integrated or intentionally rejected.

## Waiting Protocol

Use long joins. Codex subagents can be slow.

- Preferred single wait: `wait_agent` on all outstanding targets with a `10-20 min` timeout.
- Default global wait budget: `60 min`, unless the user specifies a different budget.
- If a wait times out before the global budget, report brief status if useful, continue non-overlapping work, then wait again.
- Do not infer agent failure from one or more timeouts.
- If the global budget is reached, report completed agents, outstanding agents, partial results, and ask whether to continue waiting, close slow agents, or take over.

Valid reasons to stop waiting before all first-stage agents finish: the user interrupts or changes the request; an agent reaches a terminal failed/cancelled state; or the global wait budget is reached and the user chooses a new path.

## Required Agent Output

Workers must return: `Scope`, `Result`, `Changed files`, `Verification`, and `Risks/Follow-ups`. Worktree-isolated writers must also return `Worktree`, `Branch`, and `Commit(s)` when commits were created.

Explorers and reviewers must return: `Scope`, `Findings`, `Evidence`, and `Risks/Follow-ups`.

Reject vague output. If an answer lacks evidence, changed-file scope, or verification status, treat it as incomplete and resolve the gap before relying on it.

## Integration

After all first-stage agents finish, read each result, inspect important changed files or evidence, resolve conflicts and incompatible assumptions, apply only evidence-supported integrations, and run relevant local verification before claiming success.

For worktree-isolated writer fan-out, inspect each worker branch before picking it. Pick accepted commits into the target branch or integration worktree, reject unsupported changes explicitly, and keep the final integrated diff coherent. Do not manually recreate large worker changes locally unless the worker could not produce commits and the diff has been inspected.

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
- writer worktrees/branches used and which commits were picked, when concurrent writers were used;
- whether all agents reached final state and whether any waits timed out before completion;
- review agents spawned and the review angles;
- key review findings accepted or rejected;
- final verification commands and results.

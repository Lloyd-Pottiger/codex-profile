---
name: handoff
description: Write either a full-session handoff document or a focused prompt for another agent to continue a specific task. Use when the user asks to hand off work, create a continuation note, or provide a prompt for another agent/session.
---

# Handoff

Produce a self-contained artifact that lets a fresh agent continue work without relying on private conversation context.

## Choose the output

- If the user asks for a prompt, delegation prompt, or a handoff for a specific subtask, write a focused prompt in the chat unless they explicitly ask for a file.
- If the user asks for a full handoff, session handoff, or continuation document, write a handoff document and save it to a path produced by `mktemp -t handoff-XXXXXX.md` (read the file before writing to it).
- If the user passed arguments, treat them as the next agent's focus. Include only conversation details relevant to that focus and explicitly omit unrelated work.

## Copy-Friendly Chat Output

For a focused prompt written in chat, output only the prompt text that should be
given to the next agent. Do not add an introduction, explanation, language label,
or closing note such as "Below is..." or "下面是...". Do not wrap the prompt in a
code block. Start directly with the prompt title or objective so the user can use
`/copy` on the response without cleanup.

## Focused Prompt

Write a prompt the user can give directly to another agent. Include:

- Objective and success criteria.
- Relevant repository, branch, files, commands, artifacts, or URLs.
- Current state, known facts, decisions already made, and verification already run.
- Constraints the next agent must preserve, including any requested skills.
- Concrete next steps and expected return format.

Do not summarize the whole session. Keep context tight enough that the next agent owns only the requested subtask.

## Full Handoff Document

Summarize the current conversation so a fresh agent can continue the broader work. Include:

- Goal and current status.
- Important code locations, artifacts, docs, issues, PRs, commits, or diffs to inspect.
- Decisions, assumptions, blockers, and open questions.
- Work already completed and verification results.
- Recommended next steps.

Suggest the skills to be used, if any, by the next session.

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

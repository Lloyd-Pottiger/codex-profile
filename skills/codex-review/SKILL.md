---
name: codex-review
description: Run a code review using Codex CLI. Use when user asks for a code review.
---

# Review via Codex CLI

This skill provides a _black-box_ review tool that utilizes LLM (Codex CLI) to do a code review, without relying on prior knowledge.

## When to use this skill

**This skill is extremely slow and expensive**, but provides high quality results, so you should only use it when:

- User explicitly invokes $codex-review ( /codex-review )
- As the final review phase after all work has been done
- Reviewing something non-trivial or critical

No need to use this skill for:

- Small change (e.g. < 500 LOC)
- Simple or trivial code
- During the middle of work when code is changing rapidly

**This is a black-box review:**

This skill only does black-box review (i.e. it only takes repository as input), there are pros and cons. Carefully consider whether it's suitable for your use case before using it.

Pros:

- Resistant to mistakes when user provides insufficient or wrong background information.
- Possible to discover different issues compared as a white-box review.

Cons:

- Should not be used to check whether code changes meet specific requirements, as there is no way to tell it what requirements are, unless those requirements are documented in the codebase.
- It may not discover hidden constraints that are not documented.

IMPORTANT GUIDELINE: Always use this skill as a complementary tool, not the only tool, to provide a more comprehensive review.

**This skill is LLM based:**

- it will not exhaustively report all issues in one run
- it may report different issues in different runs
- it may report false positives (rare but possible)

You should always use your own judgment to evaluate the review results, and not blindly trust it.

**This skill is very expensive:**

- You SHOULD NOT run it multiple times just to get more issues reported. SINGLE RUN IS ENOUGH to get most of the major issues.
- This skill is not a lint or check. NEVER run this skill just to check for new issues when a previous review has just been done (unless the change is large enough).

## Workflow

1. Assemble a review prompt.

Select one of the following review prompts based on the user request. If the user didn't specify, choose the most appropriate one based on the available information.

```
Review current code changes (staged, unstaged, and untracked files)
Review code changes against the base branch <...>
Review code changes introduced by commit <sha> (<title>)
Review code changes for commit range <sha1>..<sha2>
Review ... (this is the most flexible one, just describe what to review, e.g. review all code in <absolute path> related with ...)
```

If you believe none of the above prompts are suitable, stop and ask the user for clarification.

2. Run the review script:

```shell
node scripts/review.js --cwd "<project directory>" "<review prompt>"
```

Review script will start a new agent to do the review. It takes a lot of time to complete (e.g. > 1 hour), so be patient, do not interrupt it.

Note: `scripts/review.js` lives inside this skill's directory, instead of project directory.

3. The script may output progress texts as the review goes. Just report what script outputs, including progress updates and results, keep text unchanged.

To reduce round trips, you should poll script output at least every 5 minutes. Do not poll frequently.

## Review Results

Review script reports findings with these priority definitions:

[P0] – Drop everything to fix. Blocking release, operations, or major usage.
[P1] – Urgent. Should be addressed in the next cycle
[P2] – Normal. To be fixed eventually
[P3] – Low. Nice to have.

## Principles

- Never do review by yourself. Always run the review script and just report the progress and results. If review script fails or stucks, report to user and ask for next steps.
- Never regard script as stuck until it has no progress for > 30 minutes.
- Never regard script as failed even if it outputs errors or fails. It will try to recover by itself. Script kills itself if it really fails.

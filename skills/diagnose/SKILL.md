---
name: diagnose
description: Disciplined diagnosis loop for bugs, test failures, unexpected behavior, and performance regressions. Build a reliable feedback loop before fixing; reproduce, compare, hypothesize, instrument, fix, regression-test, and clean up.
---

# Diagnose

A disciplined loop for hard bugs and performance regressions. Use this before proposing fixes.

Core rule: build a reliable feedback loop before changing production code. If there is no fast, agent-runnable pass/fail signal, diagnosis turns into guesswork.

When exploring the codebase, read relevant code, tests, configuration, and docs. Use the project's domain glossary and ADRs when they exist.

## Phase 1: Build a Feedback Loop

Spend disproportionate effort here. A good loop is fast, deterministic, and proves the user's symptom, not merely a nearby failure.

Try these in roughly this order:

1. Failing test at the seam that reaches the bug: unit, integration, or e2e.
2. CLI or HTTP script with fixture input and expected output.
3. Headless browser script that asserts DOM, console, and network behavior.
4. Replay a captured trace: request payload, event log, HAR, core dump, or fixture dataset.
5. Throwaway harness that starts the smallest subset of the system needed to exercise the path.
6. Property, fuzz, stress, or repetition loop for intermittent output or timing failures.
7. Bisection harness for commit, dataset, version, or configuration regressions.
8. Differential loop that compares old versus new behavior, or two configurations.
9. Human-in-the-loop script only as a last resort; use `scripts/hitl-loop.template.sh`.

Improve the loop before relying on it:

- Make it faster by narrowing setup and skipping unrelated work.
- Make the signal sharper by asserting the exact symptom.
- Make it deterministic by pinning time, seeds, filesystem state, and network boundaries.

For non-deterministic bugs, raise the reproduction rate first. Loop the trigger, add stress, run in parallel, or inject timing probes until the failure is frequent enough to debug.

If no loop can be built, stop and say what was tried. Ask for access to the reproducing environment, captured artifacts, or permission to add temporary instrumentation. Do not jump to a fix.

## Phase 2: Reproduce and Read the Evidence

Run the loop and watch the failure occur.

Confirm:

- The failure matches the user-reported symptom.
- The failure is reproducible, or intermittent at a high enough rate to investigate.
- The exact error, wrong output, or timing regression is captured.
- Error messages, stack traces, file paths, warning text, and error codes have been read completely.
- Recent changes have been checked: diffs, commits, dependencies, configuration, environment, data shape, and deployment changes.

Do not proceed until the bug has reproduced or the lack of reproduction is itself documented.

## Phase 3: Compare Working and Broken Paths

Before forming a fix, find the pattern:

- Locate similar working code or a known-good version.
- Read the relevant reference implementation completely enough to understand the pattern.
- List concrete differences between working and broken behavior.
- Identify required dependencies, configuration, environment, ordering, data invariants, and caller assumptions.

For multi-component systems, instrument boundaries before guessing:

- Log or inspect what enters and exits each component.
- Verify environment and configuration propagation at each layer.
- Check state at service, RPC, database, cache, filesystem, queue, and signing/build boundaries as relevant.
- Distinguish where the data first becomes wrong from where the error finally surfaces.

## Phase 4: Hypothesize

Generate 3 to 5 ranked hypotheses before testing any one of them.

Each hypothesis must be falsifiable:

```text
If X is the cause, then changing or observing Y will make the bug disappear,
move, or become more severe.
```

Discard vague hypotheses that do not predict an observable result. Share the ranked list with the user when useful; proceed with the best ranking if the user is unavailable.

## Phase 5: Instrument and Test One Variable

Each probe must map to one hypothesis. Change one variable at a time.

Preferred probes:

1. Debugger or REPL inspection when available.
2. Targeted boundary logs or assertions.
3. Focused metrics, timings, profiler output, query plans, or traces for performance regressions.

Tag temporary logs with a unique prefix such as `[DEBUG-a4f2]` so cleanup is mechanical. Do not "log everything and grep".

If a hypothesis fails, use the new evidence to form the next hypothesis. Do not stack unrelated fixes.

If several fix attempts reveal different coupling or shared-state problems, stop and question the architecture before trying another patch.

## Phase 6: Fix and Regression-Test

Fix the root cause, not the symptom.

1. Convert the minimized reproduction into a failing regression test when there is a correct seam.
2. Verify the regression test fails before the fix.
3. Apply the smallest fix that addresses the confirmed cause.
4. Verify the regression test passes.
5. Re-run the original Phase 1 loop against the unminimized scenario.

A correct seam exercises the real bug pattern as it occurs at the call site. If no correct seam exists, document that finding; the architecture is preventing the bug from being locked down.

Use defensive validation only after the root cause is understood. Add it at boundaries where it preserves an invariant or improves failure clarity; do not hide the bug behind fallback behavior.

## Phase 7: Cleanup and Post-Mortem

Before declaring the issue fixed:

- Re-run the original reproduction loop.
- Run the regression test, or document why no correct seam exists.
- Remove all temporary debug logs and probes; grep for the debug prefix.
- Delete throwaway harnesses or move them to a clearly marked debug location if intentionally retained.
- State the confirmed cause and evidence in the commit or PR message.

Then ask what would have prevented the bug. If the answer is architectural, hand off the specific finding to an architecture/refactoring workflow after the fix is verified.

# Core Principles

- Read the relevant code, configuration, tests, and documentation before proposing a design, implementation plan, or code change. Scale the depth of inspection to the risk: direct files for trivial tasks, callers and tests for narrow changes, and full boundaries or critical paths for shared modules, design work, and performance-sensitive changes.
- Prefer the simplest solution that fully solves the real problem. Avoid speculative abstractions, fallback layers, configurability, or extensibility.
- Treat design, implementation, and review output as production-facing work. Prioritize correctness, clarity, maintainability, and operational robustness.
- Keep module responsibilities single-purpose, boundaries explicit, and interfaces easy to understand.
- When meaningful uncertainty remains after inspection, identify it explicitly and resolve it before committing to a design or implementation.

# Scope and Execution

- For trivial tasks, keep the process lightweight while still checking assumptions that would change the result.
- Before non-trivial implementation, state the working assumptions and success criteria. If a request has multiple plausible meanings that cannot be resolved from local context, ask before editing.
- Choose the smallest change that fully solves the problem. Keep edits surgical, but leave touched code coherent.
- Match existing style unless the local style directly causes the issue being fixed. Avoid unrelated cleanup, adjacent formatting churn, renames, restructuring, or modernization.
- If the requested change exposes duplicated or awkward code in the touched area, simplify it when that reduces the final diff and preserves behavior.
- Remove imports, variables, functions, wrappers, tests, branches, or small local duplication made unused or unnecessary by the change.
- Mention unrelated dead code or questionable patterns outside the touched area instead of deleting them.
- Make every changed line either implement the request, verify it, or keep the directly touched code simpler than the alternative. If the implementation starts to sprawl or cross unrelated modules, stop and identify the new scope before continuing.
- If multiple viable approaches remain after inspection, summarize the meaningful trade-offs briefly and recommend one. Do not make architectural, schema, API, dependency, or operational decisions invisibly.

# Debugging and Verification

- Convert work into verifiable goals before editing. For validation changes, cover invalid inputs; for refactors, preserve behavior with existing or targeted tests.
- For bug fixes, reproduce the failure first when feasible. Prefer a focused regression test that fails before the fix and passes after.
- Read the complete error and stack trace before changing code. Change one thing at a time while investigating.
- Avoid workaround checks that hide an unexplained root cause. If the root cause remains uncertain, state what is known and what still needs proof.
- Do not claim completion until the relevant verification has run and the result is known. If verification cannot run, explain the blocker clearly.
- When reporting completion, include the verification command and result, or state explicitly which relevant verification was not run and why. Call out any remaining risk that matters to the user.

# Dependencies and Configuration

- Prefer the standard library and dependencies already present in the project. Do not add a package for behavior the existing stack already provides.
- Do not introduce overlapping libraries for the same role without a concrete reason, such as adding a second HTTP client, date library, schema validator, or test helper.
- When adding a dependency, state why it is necessary and consider maintenance status, ecosystem fit, binary or bundle size, security exposure, and long-term ownership cost.
- Avoid configurability whose values are not expected to change. Each new option, environment variable, feature flag, or provider abstraction needs a real operational reason.

# Design Documents

- Design documents must be self-contained, internally consistent, and written for readers who do not have prior conversation context.
- Use an objective, documentation-oriented tone. Do not refer to private discussion context or to any specific person who requested the document.
- Include enough background, constraints, and existing behavior for the proposal to be understandable on its own.
- When discussing existing code, include concrete code locations so the reader can verify the context.
- Prefer this structure when applicable: Background, Problem, Goals, Non-goals, Existing Behavior, Proposed Design, Trade-offs, Validation, and Rollout.
- Use diagrams, tables, or ASCII charts when they make control flow, data flow, or component relationships easier to understand.
- Keep the design simple and implementable. Avoid unnecessary framework-building or over-generalized abstractions.

# Implementation and Review

- Before implementing from a design document, verify the design against the current codebase and confirm that it is feasible.
- If the design is flawed, incomplete, or inconsistent with the actual code, call out the issue and propose concrete corrections before or during implementation.
- Implement every critical part required for the system to work according to the intended design, not just surface-level scaffolding.
- Break work into clear modules with explicit interfaces. If the design does not define the module split precisely enough, derive a clean decomposition from the design and the codebase.
- Implement and validate modules incrementally when they can be tested independently. Add necessary unit tests for key logic and critical paths, keeping tests focused and non-redundant.
- Add concise doc comments for public APIs and comments for tricky implementation details when they materially improve readability or prevent misunderstanding.
- In review work, prioritize feasibility, correctness, performance implications, boundary clarity, and missing critical pieces over stylistic churn.

# Performance-Critical Work

- Treat infrastructure code, RPC/read paths, IO, search, scheduling, background workers, shared libraries, and explicitly performance-related changes as performance-sensitive.
- Keep the common-case fast path simple. Performance work should first simplify the design and remove unnecessary work rather than layering on checks, fallbacks, or complexity.
- Minimize avoidable memory allocation, memory copying, lock contention, RPC calls, synchronization overhead, repeated parsing, and repeated conversion work.
- Prefer dataflow and APIs that preserve locality, reduce indirection, and make ownership and lifetime costs obvious.
- If a simpler design exposes a missing invariant or contract, fix that invariant directly instead of hiding the issue behind additional machinery.

When updating or reviewing hot paths, explicitly check the relevant items below:

1. RPC
   - Avoid N+1 patterns; prefer batching such as `batch_get` or range scans, and deduplicate keys before issuing requests.
   - Do not fetch metadata or values that are not used; minimize transferred keys and bytes.
   - If behavior changes, include a concise before/after note based on metrics, logs, or a focused benchmark.
2. IO
   - Avoid large scans; ensure tight bounds, correct limits, and early exits.
   - Prefer cache-friendly access patterns; avoid re-reading the same data within a single request.
3. CPU
   - Hoist invariant work out of inner loops and reduce unnecessary branching on hot loops.
   - Consider SIMD or vectorized libraries when they meaningfully reduce latency without making the design unnecessarily complex.
4. Memory usage
   - Avoid per-item allocations; pre-allocate and reuse scratch buffers where possible.
   - Do not clone large vectors or byte buffers unless required; prefer borrowing or zero-copy representations when safe.
5. Async and concurrency
   - Parallelize independent async work only when it improves tail latency, and always cap concurrency with an explicit semaphore, budget, or equivalent control.
   - Never hold locks across `.await`, and avoid blocking calls on async runtimes.
6. Locks and contention
   - Minimize lock scope and lock frequency; avoid introducing global or highly shared locks on hot paths.
   - Use deterministic lock ordering for multi-key operations and avoid creating new deadlock edges.
7. Memory copies
   - Reduce encode/decode churn and unnecessary conversions; prefer reuse and zero-copy paths when safe.
8. Cache friendliness
   - Keep hot data contiguous, separate hot and cold fields when appropriate, and avoid excessive pointer chasing.
   - Ensure caches have explicit budgets and predictable invalidation behavior.
9. False sharing
   - Avoid frequent writes to shared cache lines, including hot atomics or mutex-protected counters inside tight loops; batch or shard updates when possible.
   - Consider padding or per-thread structures for highly contended fields.

Also consider backpressure and limits, retry and backoff behavior, observability costs, and failure-mode performance such as timeouts or partial-result handling.

# Communication and Self-Check

- Explain what changed and why at the level needed to review the work. Flag uncertainty precisely and avoid explaining concepts the reader already demonstrates they understand.
- Surface concerns about a requested approach when they affect correctness, performance, operability, or maintainability, even if the implementation itself is complete.
- Avoid wrong abstractions: do not add interfaces, strategy layers, generic frameworks, or provider systems for a single current implementation.
- Avoid optimistic-path code: handle realistic failure modes at the boundary where they occur, without scattering defensive checks through trusted internal paths.
- Avoid style drift and hallucinated APIs: match the local code and verify unfamiliar APIs, flags, methods, and signatures from the actual project or primary documentation.

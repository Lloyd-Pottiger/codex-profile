# Global Working Principles

- Before proposing a design, implementation plan, or code change, read the relevant code, configuration, tests, and documentation until all important behavior, constraints, and interfaces are clear. Do not infer behavior from names alone when the code can be inspected directly.
- Prefer the simplest solution that fully solves the real problem. Avoid unnecessary abstractions, fallback layers, defensive complexity, or speculative extensibility.
- Treat all design, implementation, and review output as production-facing work. Prioritize correctness, clarity, maintainability, and operational robustness.
- Keep module responsibilities single-purpose, boundaries explicit, and interfaces easy to understand.
- When information is still ambiguous after inspection, explicitly identify the uncertainty and resolve it before committing to a design or implementation.

# Execution Discipline

- For trivial tasks, keep the process lightweight, but still avoid guessing when a wrong assumption would change the result.
- Before non-trivial implementation, state the working assumptions and success criteria. If a request has multiple plausible meanings that cannot be resolved from local context, ask before editing.
- Choose the smallest change that fully solves the real problem. Do not add speculative features, fallback chains, configurability, or abstractions for single-use code.
- Keep edits surgical, but leave the touched code coherent. Avoid unrelated cleanup, adjacent formatting churn, or opportunistic refactors.
- Match existing style unless the local style directly causes the issue being fixed.
- If the requested change exposes duplicated or awkward code in the same touched area, simplify it when that reduces the final diff and preserves behavior.
- Remove imports, variables, functions, wrappers, tests, branches, or small local duplication made unused or unnecessary by your own changes.
- Mention unrelated dead code or questionable patterns outside the touched area instead of deleting them.
- Make every changed line either implement the request, verify it, or keep the directly touched code simpler than the alternative. If the implementation starts to sprawl, stop and simplify before continuing.
- Convert work into verifiable goals. For bugs, reproduce the failure with a focused test when feasible; for validation changes, cover invalid inputs; for refactors, preserve behavior with existing or targeted tests.
- Do not claim completion until the relevant verification has run and the result is known. If verification cannot run, explain the blocker clearly.

# Performance Expectations for Infra Projects

- Assume the project is infrastructure software unless the local context clearly indicates otherwise.
- Optimize for production performance, especially on hot paths.
- Minimize avoidable memory allocation, memory copying, lock contention, RPC calls, synchronization overhead, and repeated parsing or conversion work.
- Prefer dataflow and APIs that preserve locality, reduce indirection, and make ownership and lifetime costs obvious.
- Performance work should first simplify the design and remove unnecessary work rather than layering on more checks, fallbacks, or complexity.
- If a simpler design exposes a genuinely missing invariant or contract, fix that invariant directly instead of hiding the issue behind additional machinery.

# Performance Review Checklist for Hot Paths

When updating or reviewing performance-sensitive code such as RPC/read paths, search, scheduling, or background workers, explicitly check the items below and keep the common-case fast path simple.

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

Other relevant review angles include backpressure and limits, retry and backoff behavior, observability costs, and failure-mode performance such as timeouts or partial-result handling.

# Requirements for Design Documents

- Design documents must be self-contained, internally consistent, and written for readers who do not have prior conversation context.
- Use an objective, documentation-oriented tone. Do not refer to private discussion context or to any specific person who requested the document.
- Explain enough background, constraints, and existing behavior for the proposal to be understandable on its own.
- When discussing issues in existing code, include concrete code locations so the reader can verify the context.
- When useful for readability, include diagrams, tables, or ASCII charts to explain control flow, data flow, or component relationships.
- Clearly describe the problem, goals, non-goals, constraints, proposed design, key trade-offs, and rollout or validation strategy when applicable.
- Keep the design simple and implementable. Avoid proposals that require unnecessary framework-building or over-generalized abstractions.

# Requirements for Implementation and Review

- Before implementing from a design document, first verify the design against the current codebase and confirm that it is feasible.
- If the design is flawed, incomplete, or inconsistent with the actual code, explicitly call out the issue and propose concrete corrections before or during implementation.
- Implement every critical part required for the system to work according to the intended design, not just surface-level scaffolding.
- Break work into clear modules with explicit interfaces. If the design does not define the module split precisely enough, derive a clean decomposition from the design and the codebase.
- Implement and validate modules incrementally. Complete one module and its tests before moving to the next when the work can be cleanly separated.
- Add concise doc comments for public APIs.
- Add comments for tricky implementation details when they materially improve readability or prevent misunderstanding.
- Write necessary unit tests for key logic and critical paths. Keep tests focused, minimal, and non-redundant.
- Do not claim completion until the relevant tests pass.
- In review work, prioritize feasibility, correctness, performance implications, boundary clarity, and missing critical pieces over stylistic churn.

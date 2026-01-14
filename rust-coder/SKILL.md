---
name: rust-coder
description: Write, refactor, and review Rust code while adhering to the [Pragmatic Rust Guidelines](https://microsoft.github.io/rust-guidelines/) and Rust API/Style guidance. Use for any task that creates or edits Rust source, designs Rust APIs, introduces public interfaces, errors, logging, async and concurrency, unsafe or FFI code, docs, or performance-sensitive paths.
---

# Rust Coder

## Source of Truth

- Use:
  - `references/pragmatic-rust-guidelines.md` (full text)
  - `references/rust-guidelines-checklist.md` (index of guideline IDs)
- Do not guess: when a rule is unclear, locate the relevant guideline section in `references/pragmatic-rust-guidelines.md` (search for the `M-...` ID) and follow it.
- If a repository has explicit local rules (e.g., `AGENTS.md`, `CONTRIBUTING.md`), follow them; when they differ from these sources, avoid expanding the deviation and keep new code internally consistent.

## Workflow

1. Classify the change: universal (always), plus any of library, application, documentation, performance, safety/unsafe, FFI.
2. Apply the relevant checklists below before writing code.
3. While coding, enforce the “Non-Negotiables” section.
4. Before finalizing, run the repo’s formatter, lints, and tests where feasible. If adding or changing unsafe code, run Miri when available.

## Quick Lookup

- Bundled index: `references/rust-guidelines-checklist.md`
- Search by ID (bundled): `rg "M-UNSAFE" references/pragmatic-rust-guidelines.md -n`

## Non-Negotiables

- Never ship unsound safe code; if UB is possible, expose `unsafe` APIs and document the safety contract.
- Use `unsafe` only for novel abstractions, proven performance wins (after benchmarking), or FFI/platform calls; include plain-text safety reasoning for every unsafe block/API.
- Mark functions/traits `unsafe` only when misuse can cause UB (not merely “dangerous behavior”).
- Treat `panic!` as “stop the program”; panic only for detected programming bugs/contract violations or explicitly user-requested unwrap-style APIs; never use panic for recoverable errors.
- Prevent secret leakage in `Debug` and `Display`; add tests for custom redaction behavior.

## Universal Checklist

- **M-UPSTREAM-GUIDELINES:** Follow Rust API Guidelines and Rust Style Guide (naming, constructors like `Foo::new`, common trait impls, feature naming).
- **M-STATIC-VERIFICATION:** Use rustc lints, clippy categories, rustfmt, and (when relevant) cargo-audit/hack/udeps and Miri.
- **M-LINT-OVERRIDE-EXPECT:** Use `#[expect(..., reason = "...")]` for local lint overrides; keep `#[allow]` for generated code/macros.
- **M-PUBLIC-DEBUG:** Ensure public types implement `Debug`; redact secrets via a custom `Debug` plus tests.
- **M-PUBLIC-DISPLAY:** Implement `Display` for public types meant to be read; apply the same redaction discipline as `Debug`.
- **M-SMALLER-CRATES:** Split crates when a module is independently useful; avoid cyclic dependencies; re-export sparingly (except technical splits like proc-macro crates).
- **M-CONCISE-NAMES:** Avoid “weasel words” in type/trait names (e.g. `Service`, `Manager`, `Factory`); prefer concrete nouns or specific roles; use `Builder` terminology.
- **M-REGULAR-FN:** Prefer free functions over unrelated associated functions; reserve associated functions for construction.
- **M-PANIC-IS-STOP + M-PANIC-ON-BUG:** Do not use panics as error propagation; return `Result` for fallible inputs; panic on detected bugs/contract violations rather than inventing unhandleable “bug error types”.
- **M-DOCUMENTED-MAGIC:** Document magic constants and behaviors; prefer named constants with rationale and side effects.
- **M-LOG-STRUCTURED:** Use structured logging with message templates; avoid runtime string formatting; name events (`component.operation.state`); follow OpenTelemetry attributes; redact sensitive data.

## Library Checklist (Public APIs and Reusable Crates)

- **M-TYPES-SEND:** Keep public types and produced futures `Send`; avoid holding `!Send` values across `.await`; assert `Send` for key futures/entry points.
- **M-DONT-LEAK-TYPES:** Prefer `std` types in public APIs; leak third-party types only when needed (feature-gated, umbrella crates, or substantial ecosystem benefit).
- **M-ESCAPE-HATCHES:** For native handle wrappers, provide `unsafe fn from_native(...)` plus `to_native/into_native` accessors and document safety requirements.
- **M-SIMPLE-ABSTRACTIONS:** Avoid visible nested generics on service-like types; keep primary API types simple and easy to name.
- **M-AVOID-WRAPPERS:** Avoid exposing `Arc`, `Rc`, `Box`, `RefCell`, etc. in public APIs unless fundamental to the API or benchmark-justified; hide behind `&T`, `&mut T`, or `T`.
- **M-DI-HIERARCHY:** Follow the dependency design ladder: concrete type → enum for mocking → narrow traits + generics → `dyn Trait` only if needed, behind a wrapper newtype.
- **M-ESSENTIAL-FN-INHERENT:** Keep core methods inherent; have traits forward to inherent methods (do not make users hunt for traits to use a type).
- **M-ERRORS-CANONICAL-STRUCTS:** Use canonical error structs with `Backtrace` + optional cause + helper methods; hide `ErrorKind` behind query methods; implement `Display` + `std::error::Error`.
- **M-INIT-BUILDER:** Use `FooBuilder` for complex construction (4+ permutations): chainable setters and `.build()`; pass required deps at builder creation (often via a `Deps` struct + `Into`).
- **M-INIT-CASCADED:** Cascade long parameter lists via semantic helper types/newtypes to prevent mixups.
- **M-SERVICES-CLONE:** Make service-like handles cheap to clone (typically `Arc<Inner>`).
- **M-IMPL-ASREF / M-IMPL-RANGEBOUNDS / M-IMPL-IO:** In function signatures, accept flexible inputs like `impl AsRef<T>`, `impl RangeBounds<T>`, and (for one-shot I/O) `impl Read/Write`; avoid infecting public structs with these bounds.
- **M-MOCKABLE-SYSCALLS + M-TEST-UTIL:** Make I/O and syscalls mockable; return `(Self, MockCtrl)` from `new_mocked()`; gate test-only utilities behind a `test-util` feature.
- **M-NO-GLOB-REEXPORTS:** Avoid `pub use foo::*` from modules/crates; only use glob re-exports for narrow, reviewable, technical forwarding (e.g., per-platform HAL).
- **M-AVOID-STATICS:** Avoid correctness-relevant statics/TLS; beware silent state duplication across linked crate versions; use statics only for performance-only caches.
- **M-OOBE + M-SYS-CRATES:** Ensure `cargo build` works without extra tools/env vars; for `-sys` crates, build from `build.rs` via `cc` without external build systems; keep external tools optional; embed and verify sources.
- **M-FEATURES-ADDITIVE:** Keep features additive; avoid `no-std` feature toggles (prefer `std`); ensure feature combinations work.

## Application Checklist

- **M-MIMALLOC-APPS:** Prefer `mimalloc` as the global allocator in binaries.
- **M-APP-ERROR:** Applications (and app-only internal crates) may standardize on `anyhow`/`eyre`; pick one and do not mix. Libraries should still use canonical error structs.

## FFI Checklist

- **M-ISOLATE-DLL-STATE:** Share only portable `repr(C)` data across Rust DLLs; do not exchange Rust allocations, statics/TLS-backed state, or `TypeId`-dependent state across DLL boundaries.

## Performance Checklist

- **M-THROUGHPUT:** Optimize throughput; batch work; avoid empty cycles from contention, per-item overhead, and hot spinning.
- **M-HOTPATH:** Identify hot paths early; benchmark and profile regularly; document perf-sensitive areas.
- **M-YIELD-POINTS:** Add yield points to long-running async CPU work (`yield_now().await`) to avoid starving other tasks.

## Documentation Checklist

- **M-FIRST-DOC-SENTENCE:** Keep the first doc sentence to one line (about 15 words) for skim-friendly summaries.
- **M-MODULE-DOCS:** Add comprehensive `//!` docs for public modules (what/when/examples/specs/side effects/impl notes).
- **M-CANONICAL-DOCS:** Use canonical doc sections where applicable (examples, errors, panics, safety, abort); avoid parameter tables.
- **M-DOC-INLINE:** Use `#[doc(inline)]` for re-exported crate-local items so docs integrate; do not inline re-exports of `std` or third-party items.
- **Public API Documentation:** Write rustdoc comments for all `pub` items (modules, types, traits, functions, methods, constants/statics, and any `pub` fields). If something is not intended to be user-facing API, do not make it `pub`.
- **User-Facing, Not Code-Facing:** Treat doc comments as API documentation: explain semantics, invariants, non-obvious behavior, and “why”; do not restate the code or signature.
- **Narrow-Screen Readability:** Keep doc comments and important inline comments readable in source on narrow screens: prefer short paragraphs and line breaks; avoid wide tables and very long lines.
- **Behavioral Clarity:** Document side effects and footguns (I/O, blocking, allocations, lock ordering, holding locks across `.await`, expensive clones, lossy conversions, precision/time units).
- **Failure Modes:** When applicable, document `Result` error conditions, panic conditions, and abort conditions (and prefer making these impossible “by construction” when feasible).
- **Unsafe Clarity:** For `unsafe fn` docs include a `# Safety` section describing the contract; for `unsafe {}` blocks include a `// SAFETY: ...` rationale describing why the block is sound and what invariants are relied upon.
- **Examples:** Provide minimal, directly usable `# Examples` for public APIs, especially for non-trivial types and functions.

## AI Checklist

- **M-DESIGN-FOR-AI:** Prefer idiomatic patterns, strong types, thorough docs/examples, and testable APIs with good test coverage.

---
name: rust-coder
description: Write, refactor, and review Rust code while adhering to the Rust API Guidelines, the Rust Style Guide (rustfmt defaults), and pragmatic Rust guidelines (Microsoft), plus repository-local conventions. Use when creating or editing .rs files, designing public APIs, documenting Rust items, handling errors, reviewing unsafe/FFI code, or making concurrency/performance changes.
---

# Rust Coder

## Source Of Truth

- Follow these documents as authoritative:
  - Rust API Guidelines: https://rust-lang.github.io/api-guidelines/about.html (see also `references/checklists.md`)
  - Rust Style Guide (rustfmt default): https://doc.rust-lang.org/nightly/style-guide/
  - Pragmatic Rust Guidelines (Microsoft): https://microsoft.github.io/rust-guidelines/
- If a repository has explicit local rules (e.g., `AGENTS.md`, `CONTRIBUTING.md`, `rustfmt.toml`, clippy config), follow them; when they differ from the sources above, avoid expanding the deviation and keep new code internally consistent.
- Do not guess: when a rule is unclear, consult the relevant section in the sources above (or `references/sources.md`).

## Workflow

1. Identify change type: new public API, internal refactor, unsafe/FFI, error handling, concurrency/async, performance, docs/tests.
2. Apply the “Non-Negotiables”.
3. Apply the relevant checklists (Naming, API surface, Errors, Docs, Unsafe, Concurrency, Cargo/features).
4. Before finalizing, run `cargo fmt` (or the repo formatter) and the repo’s test/lint commands when available (`cargo test`, `cargo clippy`, CI scripts).

## Non-Negotiables

- **Formatting:** use rustfmt; do not hand-format around it.
- **Static verification:** prefer `cargo fmt` + `cargo clippy` + compiler warnings; use scoped lint suppressions with `#[expect(..., reason = \"...\")]` (not `#[allow]`) unless suppressing generated/macro code.
- **Soundness:**
  - Never introduce unsound “safe” APIs. If a call can cause UB in any valid calling mode, it must be `unsafe` (and documented).
  - Every `unsafe { ... }` block has a `// SAFETY: ...` comment stating the exact invariants and why they hold.
- **Public API hygiene:**
  - Public types implement `Debug` (redact secrets; test redaction).
  - Prefer `std` (or `core`) types in public APIs; avoid leaking third-party types unless feature-gated or strongly justified.
  - Prefer `Send`/`Sync` public types and `Send` futures where practical.
  - Features are additive; feature names avoid placeholders (`use-foo`, `with-foo`) and avoid “negative” features (`no-foo`).
- **Errors and panics:**
  - Library code returns typed errors (`std::error::Error` + `Display` + `Send` + `Sync`); never use `()` as an error type.
  - Panic is for bugs/contract violations; do not use panics for normal control flow; assume `panic = "abort"` is possible.
  - Destructors (`Drop`) must not fail or block; provide explicit teardown methods if needed.
- **Docs:**
  - Public items have rustdoc examples; examples use `?` (not `unwrap`/`try!`).
  - Keep the first doc sentence as a one-line summary (roughly <=15 words) to render well in rustdoc listings.
  - Document `# Errors`, `# Panics`, and `# Safety` (and `# Abort` when relevant).
- **Logging (when applicable):** prefer structured logging with stable event names and named fields; avoid eager string formatting in logs (defer formatting to the logging backend when possible); redact sensitive data.

## Formatting And Layout

- Prefer `cargo fmt` / rustfmt default style (Rust Style Guide).
- Default line width is 100; use block indentation and trailing commas on multi-line lists.
- Avoid drive-by reformatting; keep diffs minimal and localized.

## Naming

- Follow RFC 430 conventions: types/traits/variants `UpperCamelCase`, modules/functions/vars `snake_case`, constants `SCREAMING_SNAKE_CASE`.
- Avoid `get_` prefixes for typical getters; use `get` only when it is the single obvious meaning; use `*_mut` for mutable accessors.
- Conversions: `as_` (free borrowed->borrowed), `to_` (expensive), `into_` (consumes self); wrapper access uses `into_inner()`.
- Iterators: `iter`/`iter_mut`/`into_iter`; iterator types named `Iter`/`IterMut`/`IntoIter` (module-qualified).
- Avoid placeholder/weasel words in type names (`Service`, `Manager`, `Factory`) unless they truly add meaning; prefer specific nouns and `Builder` for construction.

## API Design

- Prefer simple, non-nested public types; avoid exposing `Arc<Mutex<T>>`/`Rc<T>`/`Box<T>` in APIs unless fundamental or benchmark-justified.
- Keep essential functionality inherent; trait impls should forward to inherent methods.
- Prefer flexible function inputs: `impl AsRef<str>` / `impl AsRef<Path>` / `impl AsRef<[u8]>` where it improves ergonomics; accept `impl RangeBounds<T>` for range-y APIs; write one-shot init I/O as “sans-io” (`impl Read`/`Write` or `futures::io::AsyncRead` for runtime-agnostic async).
- Use newtypes/structs instead of `bool` flags; use `bitflags` for “set of flags” APIs.
- Use builders when construction has many permutations; use cascaded parameter types/newtypes to avoid long parameter lists and mix-ups.
- Validate arguments (prefer type-level enforcement); provide `_unchecked`/`raw` variants only with explicit safety contracts.
- Avoid correctness-relevant `static` / TLS state; prefer explicit instance state. (Multiple crate versions can silently duplicate statics.)
- Avoid glob re-exports; re-export explicitly and use `#[doc(inline)]` for your own re-exports (not for `std`/third-party).

## Errors And Panics

- Use `Result<T, E>` for expected failures; use `Option<T>` when absence is normal.
- Error messages: lowercase, no trailing punctuation; implement `Display` and `std::error::Error`.
- Prefer separate focused error types over a single “everything” public enum; if you use an internal `ErrorKind`, keep it private and expose predicates (`is_io()`, etc.).
- Panics are for detected programming bugs/contract violations; prefer “correct by construction” APIs to avoid panicking paths.

## Unsafe And FFI

- Use `unsafe` only for: FFI/platform calls, novel low-level abstractions, or measured performance hot paths.
- Never use `unsafe` to “work around” the borrow checker, `Send`, or lifetime bounds.
- Keep unsafe blocks small; document invariants; test with Miri when relevant.
- Between multiple Rust dynamic libraries (DLLs) in one process, only share portable `#[repr(C)]` data; do not share `String`/`Vec`/`Box` or `TypeId`-dependent state across DLL boundaries.

## Concurrency And Async

- Prefer `Send` futures/public types when targeting multi-thread executors; add `Send`/`Sync` regression tests for tricky types.
- Never hold locks/guards across `.await`; scope them tightly.
- Service-like/shared components should be cheap-to-clone handles (shared-ownership semantics, typically `Arc<Inner>`), not “fat clones”.
- Prefer message passing over shared mutable state; document lock ordering when multiple locks exist.

## Performance

- Measure first (bench + profile) before “optimizing”.
- Prefer throughput-friendly batching and avoid hot spinning; yield cooperatively in long CPU-bound async loops.

## Testing

- Add tests for observable behavior and for safety invariants when needed (e.g., Debug redaction, `Send`/`Sync` assertions).
- Feature-gate test utilities (commonly `test-util`) and avoid exposing test-only escape hatches in production builds.

---
name: go-coder
description: Write, refactor, and review Go code while adhering to Effective Go and the Google Go Style Guide (Guide, Decisions, Best Practices). Use when creating or editing Go source files (.go), designing Go APIs, naming and documentation comments, imports, error handling, contexts, concurrency, tests, and general Go readability/idioms.
---

# Go Coder

## Source Of Truth

- Follow these documents as authoritative:
  - Effective Go: `https://go.dev/doc/effective_go` (note its “written in 2009” caveat)
  - Google Go Style Guide: `https://google.github.io/styleguide/go/` and its subpages:
    - `https://google.github.io/styleguide/go/guide`
    - `https://google.github.io/styleguide/go/decisions`
    - `https://google.github.io/styleguide/go/best-practices`
- Do not guess: when a rule is unclear, consult the relevant section in the sources above (or `references/sources.md`).
- If a repository has explicit local rules (e.g., `AGENTS.md`, `CONTRIBUTING.md`), follow them; when they differ from these sources, avoid expanding the deviation and keep new code internally consistent.

## Workflow

1. Identify change type: formatting-only, refactor, new API, error handling, concurrency, tests, docs.
2. Apply the “Non-Negotiables”.
3. Apply the relevant checklist sections below (Naming, Imports, Errors, Context, Concurrency, Testing, etc.).
4. Before finalizing, run `gofmt` (and the repo’s Go build/test/lint commands if available).

## Non-Negotiables

- Use `gofmt` formatting; do not hand-format around `gofmt`.
- Use `MixedCaps`/`mixedCaps`; avoid underscores in identifiers except where explicitly allowed (tests, rare interop).
- Prefer clarity and simplicity over cleverness; keep normal control flow unindented (avoid `else` after terminal returns).
- Handle errors deliberately; do not ignore errors without an explicit justification comment.
- Keep `context.Context` as the first parameter when present; do not store contexts in structs.
- Never start a goroutine without knowing how it will stop (lifetime/cancellation must be evident).
- Do not introduce assertion libraries or custom “assert” frameworks in new code; write failures directly in the `Test` function with useful messages.

## Formatting And Layout

- Run `gofmt` on all Go code; allow it to decide indentation and alignment.
- Do not enforce a fixed line length; refactor when a line is “too long” rather than wrapping mechanically.
- Do not split lines right before an indentation change (function declarations, `if`, `for`, `switch`).
- Do not split long string literals (URLs, messages) just to satisfy an arbitrary width.

## Naming

- Use `MixedCaps`/`mixedCaps` for multiword names; avoid underscores.
- Name packages with short, lowercase, single words; avoid generic names like `util`, `common`, `helper` unless part of a more specific name.
- Keep initialisms consistent (`URL`, `ID`, `DB`, `XMLAPI`; `gRPC`/`iOS`-style initialisms follow prose casing except for exportedness).
- Name receivers with short, consistent abbreviations of the type (usually 1–2 letters); do not use `this`/`self`.
- Avoid `Get`/`get` prefixes for accessors; use noun-like names (`Owner`, `Counts`) and `SetX` only when needed.
- Size variable names to scope: short in tiny scopes; more descriptive across larger scopes; omit redundant type words (`users` not `userSlice`, `count` not `numUsersInt`).
- Avoid repetition at call sites: do not repeat package name in exported symbol names (`yamlconfig.Parse`, not `ParseYAMLConfig`).

## Comments And Godoc

- Write doc comments for all exported top-level names; start the first sentence with the name being documented.
- Treat doc comments as user-facing API docs; explain “why” and non-obvious behavior rather than restating the code.
- Keep comments readable in source on narrow screens (wrap long comments into multiple `//` lines).
- Use proper sentence capitalization/punctuation for full-sentence comments; allow fragments for end-of-line field comments.
- Use package comments immediately above `package ...` with no blank line; ensure exactly one package comment per package.
- Prefer runnable examples in `*_test.go` (`ExampleXxx`) over pasted code in comments when possible.
- Follow Godoc formatting rules: blank line separates paragraphs; indent code/list/table blocks by two spaces to render verbatim.

## Imports

- Group imports: standard library, other packages, protobuf packages, side-effect (`_`) imports.
- Avoid import renaming except for collisions, poor names, or proto packages that require cleanup; keep renames consistent across nearby code.
- Do not use `import .`; always qualify with the package name.
- Restrict blank imports (`import _`) to `main` packages or tests (except narrowly justified tooling/compiler directive cases).
- For protobuf imports, use descriptive local names and usually a `pb` (or `grpc`) suffix; avoid generic `pb` alone in new code.

## Errors

- Return `error` as the last result; return `nil` error on success.
- Avoid in-band error values (like `-1`/`""`); return `(value, ok)` or `(value, error)` instead.
- Keep the normal path unindented: handle errors early and return; avoid `else` after an `if` that returns/continues/breaks.
- Keep error strings uncapitalized and without trailing punctuation (unless starting with proper nouns/acronyms/exported names).
- Do not parse/regex-match error strings for control flow; use structured errors plus `errors.Is`/`errors.As`.
- Wrap errors with `fmt.Errorf(...: %w, err)` only when callers are meant to inspect the chain; place `%w` at the end.
- Do not add redundant annotations; add context only when it’s non-obvious or materially helpful.
- Avoid logging and returning the same error by default; let callers decide how to log/handle unless the function is swallowing the error.
- Do not use `panic` for ordinary error handling; reserve panics for programming bugs, invariant violations, or “must”-style initialization helpers.

## Context

- Put `ctx context.Context` first in parameter lists.
- Do not add contexts as struct fields; pass them explicitly to methods/functions that need them.
- Avoid creating new root contexts (`context.Background()`) mid-call-chain; prefer receiving a context from the caller.
- In tests, prefer `(testing.TB).Context()` (when available) over `context.Background()` for the test root context.

## Concurrency

- Make goroutine lifetimes obvious; ensure cancellation/stop conditions are clear and tested.
- Prefer synchronous APIs; let callers add concurrency if needed.
- Use channel direction (`<-chan T`, `chan<- T`) in function signatures where it improves correctness/clarity.
- Avoid copying values with uncopyable fields (e.g., `sync.Mutex`, `bytes.Buffer`); prefer pointer receivers/types when needed.

## API Design And Types

- Prefer “accept interfaces, return concrete types”; define interfaces in the consuming package, not the implementing package.
- Do not define interfaces or introduce abstraction before there is real usage; keep interfaces minimal (only methods needed).
- Use generics deliberately; do not introduce generics as “default abstraction” when one type is actually used.
- Choose pointer vs value receivers based on correctness and method sets; be consistent (mostly all-pointer or all-value methods per type).
- Avoid mutable package-level global state in libraries; prefer instance types and explicit dependency passing.
- Avoid long argument lists; use option structs or variadic options; never put contexts inside option structs.

## Variables, Literals, And Data

- Prefer `:=` for initializing new variables with non-zero values; use `var` for zero-value declarations that convey “ready for later use”.
- Prefer `nil` slices for empty slice values unless a non-nil empty slice is required by an external contract; avoid APIs that distinguish nil vs empty.
- Use composite literals when you have initial members; omit zero-value fields when clarity is improved.
- Use field names in struct literals for types from other packages.
- Use size hints/preallocation only when justified; comment the source of the sizing assumption.
- Use `strings.Builder` for piecemeal string construction; use `+` for simple concatenation; use `fmt.Sprintf` when formatting.
- Prefer raw string literals (backticks) for constant multi-line strings.

## Testing

- Use the standard `testing` package; do not add new assertion frameworks in new code.
- Make failures diagnosable without reading the test source:
  - Include the function name and key inputs.
  - Print got before want (`Foo(x) = got, want ...`).
  - Prefer diffs for large values; explain diff direction (e.g., `(-want +got)`).
- Prefer full-structure comparisons (avoid hand-written field-by-field comparisons) when it improves clarity.
- Prefer `cmp.Equal`/`cmp.Diff` over `reflect.DeepEqual`; avoid comparing unstable serialized output (parse and compare semantics).
- Prefer `t.Error` to keep checking multiple properties; use `t.Fatal` only when continuing would mislead.
- Never call `t.Fatal`/`t.FailNow` from goroutines; report from goroutines with `t.Error` and return.
- Use table-driven tests when cases share logic; name subtests with filter-friendly names (avoid spaces and slashes).
- Mark test helpers with `t.Helper()`; allow helpers to `t.Fatal` only for setup/cleanup failures (environment issues), not for assertions.

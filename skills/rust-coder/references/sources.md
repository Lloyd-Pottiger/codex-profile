## Sources (Authoritative)

This skill is derived from these documents; consult them directly when a rule is unclear.

### Rust API Guidelines (Library Team)

- Main: https://rust-lang.github.io/api-guidelines/about.html
- Checklist: https://rust-lang.github.io/api-guidelines/checklist.html
- Chapters:
  - Naming: https://rust-lang.github.io/api-guidelines/naming.html
  - Interoperability: https://rust-lang.github.io/api-guidelines/interoperability.html
  - Macros: https://rust-lang.github.io/api-guidelines/macros.html
  - Documentation: https://rust-lang.github.io/api-guidelines/documentation.html
  - Predictability: https://rust-lang.github.io/api-guidelines/predictability.html
  - Flexibility: https://rust-lang.github.io/api-guidelines/flexibility.html
  - Type safety: https://rust-lang.github.io/api-guidelines/type-safety.html
  - Dependability: https://rust-lang.github.io/api-guidelines/dependability.html
  - Debuggability: https://rust-lang.github.io/api-guidelines/debuggability.html
  - Future proofing: https://rust-lang.github.io/api-guidelines/future-proofing.html
  - Necessities: https://rust-lang.github.io/api-guidelines/necessities.html

### Rust Style Guide (Default rustfmt style)

- https://doc.rust-lang.org/nightly/style-guide/

### Pragmatic Rust Guidelines (Microsoft)

- https://microsoft.github.io/rust-guidelines/

### Safety / Unsafe Deep Dives

- Rust Reference: Undefined Behavior: https://doc.rust-lang.org/reference/behavior-considered-undefined.html
- The Rustonomicon: https://doc.rust-lang.org/nomicon/
- Unsafe Code Guidelines: https://rust-lang.github.io/unsafe-code-guidelines/
- Miri: https://github.com/rust-lang/miri

## What To Consult For What

- **Naming, iterators, conversions, features:** Rust API Guidelines `Naming` chapter + checklist (`C-CASE`, `C-CONV`, `C-ITER`, `C-FEATURE`).
- **Public API surface and ergonomics:** Rust API Guidelines `Predictability`, `Flexibility`, `Type safety`, plus Microsoft `Library/UX` and `Interoperability` guidelines.
- **Errors/panics/docs:** Rust API Guidelines `Documentation` + `Interoperability` (`C-GOOD-ERR`) plus Microsoft error guidance (`M-ERRORS-CANONICAL-STRUCTS`, `M-PANIC-*`).
- **Unsafe/FFI:** Microsoft safety + FFI guidelines and the Rust Reference/Nomicon/UCG; use Miri when modifying unsafe invariants.
- **Formatting:** Rust Style Guide + rustfmt defaults (and repo-local `rustfmt.toml`).

## Sources (Authoritative)

This skill is derived from these documents; consult them directly when a rule is unclear.

### Effective Go

- https://go.dev/doc/effective_go
- Note: The page itself states it was written for Go’s 2009 release and has not been updated significantly since; treat it as language/idiom guidance, not modern ecosystem guidance.

### Google Go Style Guide (Go Style at Google)

- Overview: https://google.github.io/styleguide/go/
- Style Guide (normative + canonical): https://google.github.io/styleguide/go/guide
- Style Decisions (normative, not canonical): https://google.github.io/styleguide/go/decisions
- Best Practices (auxiliary): https://google.github.io/styleguide/go/best-practices

## What To Consult For What

- Formatting, naming, line length: `guide`
- Naming details, imports, errors, language gotchas, testing conventions: `decisions`
- Error wrapping/logging, docs conventions, options patterns, global state, testing patterns: `best-practices`
- Core language idioms (`gofmt`, `make` vs `new`, slices/maps, interfaces, concurrency basics): `effective_go`

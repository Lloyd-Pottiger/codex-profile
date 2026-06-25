---
name: codebase-design
description: Shared vocabulary for designing deep modules — small interfaces behind a lot of behaviour, placed at clean seams, testable through the interface. Use when designing or improving a module's interface, deciding where a seam goes, making code more testable or AI-navigable, deepening a cluster of shallow modules, or when another skill needs the deep-module vocabulary.
---

# Codebase Design

Design **deep modules**: a lot of behaviour behind a small interface, placed at a clean seam, testable through that interface. Use this language and these principles wherever code is being designed or restructured. The aim is **leverage** for callers, **locality** for maintainers, and **testability** for everyone.

This skill is the canonical home of the deep-module vocabulary. Other skills (e.g. `improve-codebase-architecture`) consume these terms — don't duplicate them.

## Vocabulary

Use these terms exactly — don't substitute "component," "service," "API," or "boundary." Consistent language is the whole point. Full definitions in [LANGUAGE.md](LANGUAGE.md).

- **Module** — anything with an interface and an implementation (function, class, package, tier-spanning slice).
- **Interface** — everything a caller must know to use the module correctly: types, invariants, ordering, error modes, configuration, performance. Not just the type signature.
- **Implementation** — the code inside.
- **Depth** — leverage at the interface. **Deep** = a lot of behaviour behind a small interface. **Shallow** = interface nearly as complex as the implementation.
- **Seam** _(Michael Feathers)_ — where an interface lives; a place behaviour can be altered without editing in place. (Use this, not "boundary.")
- **Adapter** — a concrete thing satisfying an interface at a seam.
- **Leverage** — what callers get from depth.
- **Locality** — what maintainers get from depth: change, bugs, knowledge, and verification concentrate in one place.

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be internally composed of small, swappable parts — they just aren't part of the interface. Internal seams (private, used by the module's own tests) are fine; don't expose them through the external interface just because tests use them.
- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test *past* the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.** Don't introduce a seam unless something actually varies across it.

## Going deeper

- Full term definitions, relationships, and rejected framings — see [LANGUAGE.md](LANGUAGE.md).
- Deepening a cluster given its dependencies (in-process, local-substitutable, remote-but-owned, true external) and the replace-don't-layer testing strategy — see [DEEPENING.md](DEEPENING.md).
- Exploring alternative interfaces ("design it twice") with parallel sub-agents — see [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md).

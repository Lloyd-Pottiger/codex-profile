---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. While grilling, sharpen domain terminology, update CONTEXT.md inline as terms crystallise, and offer ADRs sparingly when a real trade-off is locked in. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions **one at a time**, waiting for feedback on each question before continuing. If a question can be answered by exploring the codebase, explore the codebase instead of asking.

Don't ask silly questions — make sure you fully understand the context first:

- Check the current project state: files, docs, recent commits.
- Explore the current structure and codebase to understand the context.
- Read existing domain documentation: `CONTEXT.md`, `CONTEXT-MAP.md`, and any ADRs under `docs/adr/`. The grilling works against the language and decisions already recorded there.

## Domain awareness

### File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts; the map points to where each one lives. Infer which context the current topic relates to; if unclear, ask. Full rules for single vs multi-context repos and the `CONTEXT.md` / ADR formats live in the [`domain-modeling`](../domain-modeling) skill — see [CONTEXT-FORMAT.md](../domain-modeling/CONTEXT-FORMAT.md) and [ADR-FORMAT.md](../domain-modeling/ADR-FORMAT.md).

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. _"Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"_

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. _"You're saying 'account' — do you mean the Customer or the User? Those are different things."_

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: _"Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"_

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen, using the format in [CONTEXT-FORMAT.md](../domain-modeling/CONTEXT-FORMAT.md).

`CONTEXT.md` is a glossary and nothing else. Do not couple it to implementation details, do not treat it as a spec or a scratch pad, and do not record implementation decisions there — those go in ADRs.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful.
2. **Surprising without context** — a future reader will wonder _"why did they do it this way?"_
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons.

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](../domain-modeling/ADR-FORMAT.md).

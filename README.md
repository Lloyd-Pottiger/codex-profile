# Codex Profile

This repository is laid out like a Codex home directory. It tracks only the
portable configuration that should be shared:

- `AGENTS.md`: global working instructions.
- `agents/`: sub-agent definitions.
- `skills/`: Codex skills.

Local runtime state, credentials, logs, history, SQLite databases, sessions, and
machine-specific config are intentionally ignored.

## Use Directly

For a new Codex setup, clone this repository as `$CODEX_HOME`:

```bash
git clone <repo-url> ~/.codex
```

If `~/.codex` already exists, clone elsewhere and copy the tracked configuration:

```bash
git clone <repo-url> ~/code-skills
mkdir -p ~/.codex/agents ~/.codex/skills
cp -a ~/code-skills/AGENTS.md ~/.codex/
cp -a ~/code-skills/agents/. ~/.codex/agents/
cp -a ~/code-skills/skills/. ~/.codex/skills/
```

After cloning into `~/.codex`, update with:

```bash
git -C ~/.codex pull
```

## Repository Layout

```text
.
├── AGENTS.md
├── agents/
├── skills/
├── LICENSE
├── README.md
└── THIRD_PARTY_NOTICES.md
```

## License

This repository is MIT licensed; see `LICENSE`.

Some included skill materials carry their own licenses; see
`THIRD_PARTY_NOTICES.md`.

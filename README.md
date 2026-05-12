# Codex Profile

This repository is laid out like a Codex home directory. It tracks only the
portable configuration that should be shared:

- `AGENTS.md`: global working instructions.
- `agents/`: sub-agent definitions.
- `skills/`: Codex skills.

Local runtime state, credentials, logs, history, SQLite databases, sessions, and
machine-specific config are intentionally ignored.

## Install

Install into `${CODEX_HOME:-$HOME/.codex}` with one command:

```bash
curl -fsSL https://raw.githubusercontent.com/Lloyd-Pottiger/codex-profile/main/install.sh | sh
```

The installer only adds missing files. It never removes or overwrites existing
`skills/`, `agents/`, or `AGENTS.md` content. If `~/.codex/AGENTS.md` already
exists, the repository version is copied to `~/.codex/AGENTS.codex-profile.md`
for manual review and merge.

From a local checkout, run:

```bash
./install.sh
```

To install into a custom Codex home:

```bash
CODEX_HOME=/path/to/.codex ./install.sh
```

## Repository Layout

```text
.
├── AGENTS.md
├── install.sh
├── agents/
├── skills/
├── LICENSE
└── README.md
```

## Sources

Some skills are adapted from:

- https://github.com/obra/superpowers
- https://github.com/mattpocock/skills

Agents are adapted from:

- https://github.com/VoltAgent/awesome-codex-subagents

## License

This repository is MIT licensed; see `LICENSE`.

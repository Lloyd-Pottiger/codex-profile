# Code Skills

This repo contains a couple of Codex CLI “skills”:

- `go-coder`: Go coding/review guidelines.
- `rust-coder`: Rust coding/review guidelines (includes vendored reference docs).

## Install

Codex skills live under `$CODEX_HOME/skills` (commonly `~/.codex/skills`).

Copy:

```bash
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
mkdir -p "$CODEX_HOME/skills"
cp -a go-coder rust-coder "$CODEX_HOME/skills/"
```

Or use the helper script:

```bash
./scripts/install.sh
```

## Bundles

`bundles/*.skill` are zip bundles of the skill folders for convenient distribution. Rebuild them with:

```bash
./scripts/build-bundles.sh
```

## License

This repository is MIT licensed; see `LICENSE`.

Some files are vendored from third parties under their own licenses; see `THIRD_PARTY_NOTICES.md`.

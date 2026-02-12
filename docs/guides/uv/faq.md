---
sidebar_label: FAQ
sidebar_position: 5
title: uv FAQ
description: Common questions and gotchas when using uv.
tags: [python, uv, packaging, dependencies]
---

# FAQ

## Should I commit `uv.lock` to Git?

**Yes.** This is the whole point of a lockfile — it ensures everyone gets the exact same dependency versions. Without it, two developers running `uv sync` on the same `pyproject.toml` could get different versions.

## Should I commit `.venv` to Git?

**No.** The venv is a local artifact that can be recreated from `uv.lock` at any time. Add it to `.gitignore`:

```gitignore
.venv/
```

## Do I still need `requirements.txt`?

Not if your project uses `pyproject.toml` + `uv.lock`. The only exception is if you deploy to a platform that only understands `requirements.txt` — in which case you can generate one:

```bash
uv pip compile pyproject.toml -o requirements.txt
```

## Do I need to activate the venv?

**It depends.** If you use `uv run` to execute commands, no — uv handles the venv automatically. If you want to use `python` or `pip` directly in your shell, yes — you need to activate first:

```bash
source .venv/bin/activate    # Linux/macOS
```

## What's the difference between `uv add` and `uv pip install`?

| | `uv add` | `uv pip install` |
|---|---|---|
| Updates `pyproject.toml` | Yes | No |
| Updates `uv.lock` | Yes | No |
| Installs into venv | Yes | Yes |
| Reproducible | Yes (lockfile) | No |

Use `uv add` for projects. Use `uv pip install` for quick one-offs or legacy compatibility.

## Can I use uv with an existing `requirements.txt` project?

Yes. You can migrate gradually:

```bash
# 1. Create a pyproject.toml from your requirements.txt
uv init

# 2. Add your existing dependencies
uv add -r requirements.txt

# 3. Now you have pyproject.toml + uv.lock
# You can delete requirements.txt
```

## How does uv compare to Poetry / Pipenv?

| | uv | Poetry | Pipenv |
|---|---|---|---|
| **Speed** | Extremely fast (Rust) | Slow | Very slow |
| **Lockfile** | `uv.lock` | `poetry.lock` | `Pipfile.lock` |
| **Config file** | `pyproject.toml` (PEP 621) | `pyproject.toml` (custom format) | `Pipfile` (custom format) |
| **Standards** | Follows PEP 621 | Partially (custom `[tool.poetry]`) | Non-standard |
| **Venv management** | Built-in | Built-in | Built-in |
| **Python version management** | Built-in | No (need pyenv) | No (need pyenv) |
| **pip compatibility** | Full (`uv pip` commands) | No | No |

uv is the newest of the three and the clear direction the Python ecosystem is moving in. Poetry and Pipenv solved real problems in their time, but uv is faster, more standards-compliant, and more comprehensive.

## I get "No `pyproject.toml` found" — what do I do?

You're running a project-level command (`uv sync`, `uv add`) in a directory without a `pyproject.toml`. Either:
- `cd` into the correct directory, or
- Run `uv init` to create one

## How do I see what's installed?

```bash
# Show the dependency tree
uv tree

# Or the pip-compatible way
uv pip freeze
```

---
sidebar_label: Commands Reference
sidebar_position: 4
title: uv Commands Reference
description: Common uv commands and workflows for everyday development.
tags: [python, uv, packaging, dependencies]
---

# Commands Reference

## Project Commands

These are the commands you'll use daily when working with a `pyproject.toml`-based project.

| Command | Description |
|---|---|
| `uv init <name>` | Scaffold a new project with `pyproject.toml` |
| `uv add <package>` | Add a dependency, resolve, lock, and install |
| `uv add --group dev <package>` | Add a dev/test dependency |
| `uv remove <package>` | Remove a dependency and re-lock |
| `uv sync` | Install all dependencies from `uv.lock` (creates venv if needed) |
| `uv lock` | Resolve dependencies and write `uv.lock` without installing |
| `uv run <command>` | Run a command using the project's venv |
| `uv tree` | Show the dependency tree |

### The difference between `uv lock` and `uv sync`

```
uv lock    →  resolve + write uv.lock             (does NOT install)
uv sync    →  resolve + write uv.lock + install    (does everything)
```

`uv lock` is useful when you want to update the lockfile (e.g., in CI) without actually installing packages. In practice, `uv sync` is what you'll use most of the time.

## Virtual Environment Commands

| Command | Description |
|---|---|
| `uv venv` | Create a `.venv` in the current directory |
| `uv venv --python 3.13` | Create a venv with a specific Python version |
| `uv venv my-env` | Create a venv with a custom name |

## Python Version Management

| Command | Description |
|---|---|
| `uv python install 3.13` | Install a Python version |
| `uv python list` | List available Python versions |
| `uv python pin 3.13` | Pin the project to a Python version (writes `.python-version`) |

## pip-Compatibility Commands

Drop-in replacements for pip. Use these for legacy projects or quick scripts — not for `pyproject.toml` projects.

| Command | Description |
|---|---|
| `uv pip install <package>` | Install a package |
| `uv pip install -r requirements.txt` | Install from requirements file |
| `uv pip uninstall <package>` | Uninstall a package |
| `uv pip freeze` | List installed packages |
| `uv pip compile pyproject.toml -o requirements.txt` | Generate a `requirements.txt` from `pyproject.toml` |

## Tool Commands

Run Python CLI tools without installing them globally — like `npx` for Python.

| Command | Description |
|---|---|
| `uv tool run ruff check .` | Run a tool in an isolated environment |
| `uvx ruff check .` | Shorthand for `uv tool run` |
| `uv tool install ruff` | Install a tool globally |

## Common Workflows

### "I just cloned a project and want to get started"

```bash
uv sync
```

### "I need a new dependency"

```bash
uv add requests
```

### "I pulled changes and my lockfile updated"

```bash
uv sync
```

### "I want to run my tests"

```bash
uv run pytest
```

### "I want to update all dependencies to latest compatible versions"

```bash
uv lock --upgrade
uv sync
```

### "I want to update a specific package"

```bash
uv lock --upgrade-package fastapi
uv sync
```

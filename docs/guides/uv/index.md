---
sidebar_label: Overview
sidebar_position: 1
title: Learning uv — Modern Python Package Management
description: A practical guide to understanding and using uv for Python dependency management, virtual environments, and project workflows.
tags: [python, uv, packaging, dependencies]
---

# Learning uv — Modern Python Package Management

A practical guide to understanding and using uv for Python dependency management, virtual environments, and project workflows.

## What is uv?

uv is an extremely fast Python package and project manager written in Rust by Astral (the team behind Ruff). It replaces multiple tools you'd normally use separately — `pip`, `pip-tools`, `virtualenv`, `pyenv`, and even `pipx` — with a single, unified CLI.

## Why uv Matters

- **Speed**: uv is 10–100x faster than pip. Installing dependencies that took 30 seconds with pip can take under a second with uv.
- **Single tool**: Instead of juggling `pip`, `virtualenv`, `pyenv`, and `pip-tools`, uv handles all of it.
- **Deterministic builds**: uv uses a lockfile (`uv.lock`) to ensure everyone on your team gets the exact same dependency versions.
- **Modern standards**: uv is built around `pyproject.toml` (PEP 621), the modern Python packaging standard.

## What uv Replaces

| Traditional tool | What it does | uv equivalent |
|---|---|---|
| `pip` | Install packages | `uv pip install` or `uv add` |
| `pip-tools` (`pip-compile`) | Lock dependencies | `uv lock` |
| `virtualenv` / `venv` | Create virtual environments | `uv venv` |
| `pyenv` | Install and manage Python versions | `uv python install` |
| `pipx` | Run CLI tools in isolation | `uv tool run` / `uvx` |

## The Problem uv Solves

Traditional Python dependency management is fragmented and error-prone:

```
Without uv (multiple tools, no lockfile):
┌──────────────────────────────────────────┐
│  pyenv install 3.13       (Python)       │
│  python -m venv .venv     (virtualenv)   │
│  pip install fastapi      (installer)    │
│  pip freeze > requirements.txt (lock??)  │
└──────────────────────────────────────────┘
Problems:
- pip freeze captures everything, including sub-dependencies
- No distinction between "what I want" vs "what I got"
- Slow installs
- Different tools with different interfaces
```

```
With uv (one tool, proper lockfile):
┌──────────────────────────────────────────┐
│  uv init                  (project)      │
│  uv add fastapi           (dependency)   │
│  uv sync                  (install)      │
└──────────────────────────────────────────┘
Benefits:
- pyproject.toml = what you want
- uv.lock = what you actually get (auto-generated)
- Fast installs
- One tool for everything
```

## What's Next?

- [Getting Started](./getting-started.md) — Installation, creating projects, and first commands
- [Key Concepts](./key-concepts.md) — pyproject.toml vs uv.lock, dependency resolution, virtual environments
- [Commands Reference](./commands.md) — Common uv commands and workflows
- [FAQ](./faq.md) — Common questions and gotchas

---
sidebar_label: Getting Started
sidebar_position: 2
title: Getting Started with uv
description: Installation, creating projects, and first commands.
tags: [python, uv, packaging, dependencies]
---

# Getting Started with uv

## Installation

```bash
# Linux / macOS
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Or via pip (if you already have Python)
pip install uv
```

After installation, verify it works:

```bash
uv --version
```

## Creating a New Project

```bash
# Create a new project directory with pyproject.toml
uv init my-project
cd my-project
```

This creates:

```
my-project/
├── pyproject.toml     # Project metadata and dependencies
├── hello.py           # Sample Python file
└── README.md
```

The generated `pyproject.toml` looks like:

```toml
[project]
name = "my-project"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.13"
dependencies = []
```

## Adding Dependencies

```bash
# Add a dependency
uv add fastapi

# Add multiple at once
uv add sqlalchemy loguru redis

# Add with version constraints
uv add "fastapi>=0.123.0"

# Add a dev/test dependency
uv add --group dev pytest ruff
```

Each `uv add` command:
1. Adds the package to `pyproject.toml`
2. Resolves all dependencies and updates `uv.lock`
3. Installs everything into your virtual environment

## Creating a Virtual Environment

```bash
# Create a venv (defaults to .venv in current directory)
uv venv

# Create with a specific Python version
uv venv --python 3.13

# Activate it (still needed for your shell to use it)
source .venv/bin/activate    # Linux/macOS
.venv\Scripts\activate       # Windows
```

:::note
Unlike traditional tools, you often don't need to manually create or activate a venv. When you run `uv sync` or `uv run`, uv automatically creates a `.venv` if one doesn't exist and uses it.
:::

## The Typical Workflow

### Starting a new project

```
1. uv init my-project         →  scaffolds pyproject.toml
2. cd my-project
3. uv add fastapi sqlalchemy  →  adds deps, creates venv, installs everything
4. uv run python main.py      →  runs your code using the venv
```

### Joining an existing project (cloned from Git)

```
1. git clone <repo>
2. cd <repo>
3. uv sync                    →  reads uv.lock, creates venv, installs exact versions
```

This is the key advantage of a lockfile — `uv sync` gives everyone the exact same environment.

### Day-to-day development

```
uv add <package>     →  need a new dependency
uv remove <package>  →  drop a dependency
uv sync              →  re-sync after pulling changes from Git
uv run <command>     →  run something using the project's venv
```

## Installing Python Versions

uv can also manage Python installations — no need for `pyenv`:

```bash
# Install a specific Python version
uv python install 3.13

# List available versions
uv python list

# Pin the project to a specific version
uv python pin 3.13
```

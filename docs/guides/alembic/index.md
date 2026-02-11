---
sidebar_label: Overview
sidebar_position: 1
title: Learning Alembic — Database Migrations in Python
description: A practical guide to understanding and using Alembic for database migrations with SQLAlchemy.
tags: [python, alembic, sqlalchemy, database]
---

# Learning Alembic — Database Migrations in Python

A practical guide to understanding and using Alembic for database migrations with SQLAlchemy.

## What is Alembic?

Alembic is a lightweight database migration tool for SQLAlchemy. It lets you track and apply incremental changes to your database schema over time — similar to how Git tracks changes to your code.

## Why Alembic Matters in real projects?

- In production, you cannot just drop and recreate tables when your schema changes as you will lose all your data.
- Alembic tracks the schema changes as versioned *migration scripts*. You can think of it as Git commits, but for your database schema.
- Every team you work with will expect migrations to be managed using Alembic and it is a non-negotiable in Professional Python backends.

## The Problem Alembic Solves

Imagine you are building an app with SQLAlchemy. You define your models:

```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String)
```

Later, you need to add an `email` column. Without Alembic, your options are:

| Approach | Problem |
|---|---|
| Drop and recreate table | You lose all existing data |
| Manually run `ALTER TABLE` SQL | Error-prone, not tracked, teammates don't know about it |
| **Use Alembic** | Generates a versioned migration script that everyone can run |

Alembic will create migration files like this:

```python
def upgrade():
    op.add_column('users', sa.Column('email', sa.String()))

def downgrade():
    op.drop_column('users', 'email')
```

Every migration has an **upgrade** (apply the change) and **downgrade** (revert it). This gives you a full history and the ability to roll back.

## How Alembic Fits In

```
Your Code (SQLAlchemy Models)
        ↓
Alembic (detects changes, generates migration scripts)
        ↓
Database (migrations applied via upgrade/downgrade)
```

| File / Directory | Purpose |
|---|---|
| `alembic.ini` | Config file (database URL, logging, etc.) |
| `alembic/env.py` | Tells Alembic about your models so it can auto-detect changes |
| `alembic/versions/` | Folder where migration scripts live (one file per migration) |

## What's Next?

- [Getting Started](./getting-started.md) — Setup, configuration, workflow, and commands
- [Key Concepts](./key-concepts.md) — Revision chain, autogenerate vs manual, schema vs data migrations
- [Advanced Topics](./advanced.md) — Multi-environment, production pitfalls, async FastAPI
- [FAQ](./faq.md) — Common questions and gotchas
- [Self-Test Quiz](./quiz.md) — Test your understanding

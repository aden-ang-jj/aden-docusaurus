---
sidebar_label: Advanced Topics
sidebar_position: 4
title: Advanced Alembic Topics
description: Multi-environment migrations, production pitfalls, and async FastAPI setup.
tags: [python, alembic, sqlalchemy, database]
---

# Advanced Topics

## Multi-Environment Migrations

In real projects, you don't just have one database. You typically have multiple environments:

```
Your Machine          Staging Server         Production Server
┌──────────────┐     ┌──────────────┐      ┌──────────────┐
│   Dev DB     │     │  Staging DB  │      │   Prod DB    │
│              │     │              │      │              │
│ alembic_ver: │     │ alembic_ver: │      │ alembic_ver: │
│   g7h8i9     │     │   d4e5f6     │      │   a1b2c3     │
│  (up to date)│     │ (one behind) │      │ (two behind) │
└──────────────┘     └──────────────┘      └──────────────┘
        ↑                    ↑                     ↑
        └────────────────────┴─────────────────────┘
                    All read from the SAME
                  alembic/versions/ in Git
```

**Migration files live in Git** (shared by everyone). But **`alembic_version` lives in each database independently** — each environment tracks its own position in the chain.

### Deployment flow

```
1. Developer creates migration locally     →  commits to Git
2. CI/CD deploys to staging                →  runs `alembic upgrade head` on staging DB
3. QA tests on staging
4. CI/CD deploys to production             →  runs `alembic upgrade head` on prod DB
```

This is why **forward-only migrations** matter — you can't edit old migrations because staging and production may have already applied them at different times.

## Production Pitfalls

### Table Locking

When you run `ALTER TABLE` on a large table (millions of rows), most databases **lock the entire table** while the operation runs:

```
Migration runs ALTER TABLE on "users" (5 million rows)
        ↓
Database locks the table
        ↓
All queries to "users" are blocked (reads AND writes)
        ↓
App hangs → users see errors / timeouts
        ↓
Migration finishes → table unlocked → app recovers
```

This can mean **minutes of downtime** on large tables.

### Zero-Downtime Strategies

| Strategy | How it works | When to use |
|---|---|---|
| **Add columns as nullable** | `nullable=True` is instant on most DBs. Backfill later, then alter to `NOT NULL` in a separate migration. | Adding columns to large tables |
| **Batch backfills** | Instead of one giant `UPDATE`, process in chunks (e.g. 10,000 rows at a time) to avoid long locks. | Backfilling data on large tables |
| **Create-copy-swap** | Create new table → copy data over → rename tables. | Major table restructuring |
| **Concurrent index creation** | PostgreSQL: `CREATE INDEX CONCURRENTLY` doesn't lock the table. | Adding indexes to large tables |

### Safe migration pattern for adding a non-nullable column to a large table

Split it into 3 separate migrations (each deployed independently):

```python
# Migration 1: Add column as nullable (instant, no lock)
def upgrade():
    op.add_column('users', sa.Column('role', sa.String(), nullable=True))

def downgrade():
    op.drop_column('users', 'role')
```

```python
# Migration 2: Backfill in batches (separate deployment)
def upgrade():
    conn = op.get_bind()
    while True:
        result = conn.execute(
            sa.text("UPDATE users SET role = 'member' WHERE role IS NULL LIMIT 10000")
        )
        if result.rowcount == 0:
            break

def downgrade():
    op.execute("UPDATE users SET role = NULL WHERE role = 'member'")
```

```python
# Migration 3: Add constraint (safe now — no NULLs remain)
def upgrade():
    op.alter_column('users', 'role', nullable=False, server_default='member')

def downgrade():
    op.alter_column('users', 'role', nullable=True, server_default=None)
```

:::tip Why 3 separate migrations?
Each migration is a separate deployment. This means if the backfill takes a long time, it doesn't block your deployment pipeline. It also lets you verify each step worked before moving to the next.
:::

## Alembic with FastAPI / Async SQLAlchemy

If you use FastAPI with async SQLAlchemy (e.g. `asyncpg`), the Alembic setup is slightly different. The key change is in `env.py`:

```
Standard (sync) env.py          Async env.py
──────────────────────          ────────────────────
from sqlalchemy                 from sqlalchemy.ext.asyncio
  import create_engine            import async_engine_from_config

engine = create_engine(url)     connectable = async_engine_from_config(...)
with engine.connect() as conn:  async with connectable.connect() as conn:
    context.configure(conn)         await conn.run_sync(do_run_migrations)
    context.run_migrations()
```

### Example async `env.py` setup

```python
import asyncio
from sqlalchemy.ext.asyncio import async_engine_from_config

async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section)
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online():
    asyncio.run(run_async_migrations())
```

:::note
**Migration scripts themselves stay the same** — only `env.py` changes. The `upgrade()` and `downgrade()` functions are identical whether your app is sync or async. Migrations are a one-time admin task, not a request handler, so they run synchronously.
:::

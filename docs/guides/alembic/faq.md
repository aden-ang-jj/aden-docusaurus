---
sidebar_label: FAQ
sidebar_position: 5
title: Alembic FAQ
description: Common questions and gotchas when working with Alembic.
tags: [python, alembic, sqlalchemy, database]
---

# FAQ

### Does Alembic auto-detect my model changes?

No. Alembic never watches or auto-detects changes on its own. You must explicitly run a command to trigger it:

1. Update your SQLAlchemy model code
2. Run `alembic revision --autogenerate -m "description"` — Alembic compares your models against the actual DB and generates a migration script
3. **Review the generated script** — autogenerate isn't perfect
4. Run `alembic upgrade head` to apply it

The "auto" in `--autogenerate` means it auto-**writes** the script for you. You still trigger and review it manually.

### Do I always need to update the model, even for manual migrations?

**Yes.** Your model should always reflect the current state of the database. If you write a manual migration to add a `status` column but forget to add it to the model:

- Your code can't use `post.status` — SQLAlchemy doesn't know about it
- Next time autogenerate runs, it sees `status` in the DB but not in the model, and generates a migration to **drop** it

The golden rule: **model and database must always be in sync.** The model describes what the schema *should* look like. The migration describes *how to get there*.

### What's the difference between `server_default` and `default` in migrations?

| | Where it runs | Existing rows handled? | Works outside Python? |
|---|---|---|---|
| `server_default='draft'` | At the **database level** (in the `ALTER TABLE` SQL) | Yes — existing rows get the value immediately | Yes — raw SQL inserts also get the default |
| `default='draft'` | At the **Python/SQLAlchemy level** only | No — database has no default, migration fails on `nullable=False` | No — only works through SQLAlchemy |

In migrations, always use `server_default` when adding a non-nullable column to a table that already has data.

### What can't autogenerate detect?

| Change | What Alembic sees | What to do |
|---|---|---|
| Column rename | A drop + add (data loss!) | Write a manual migration using `op.alter_column()` |
| Column type constraint changes | May not detect at all | Write a manual migration |
| Data migrations (e.g. backfilling values) | Not schema-related, invisible to Alembic | Write a manual migration with raw SQL or ORM queries |
| Table rename | A drop + create | Write a manual migration using `op.rename_table()` |

For any of these, use `alembic revision -m "description"` to create an empty script and write the operations yourself.

### What happens if two developers create migrations on different branches?

Alembic uses a linked list (`revision` → `down_revision`). If two branches both create a migration pointing to the same `down_revision`, you'll get a **"multiple heads"** error when merging. Fix it with:

```bash
alembic merge heads -m "merge migrations"
```

This creates a merge migration that joins the two branches — similar to a Git merge commit.

### Can I edit a migration after running it?

- **If it hasn't been applied yet** — yes, just edit the file directly.
- **If it's already applied to your local DB** — downgrade first (`alembic downgrade -1`), edit the file, then upgrade again.
- **If it's already applied in production** — never edit it. Create a new migration to make corrections instead.

### How does Alembic track which migrations have been applied?

Alembic stores the current revision in an `alembic_version` table in your database. See the [Revision Chain](./key-concepts.md#revision-chain) section for a detailed breakdown with diagrams.

### I get `ModuleNotFoundError: No module named 'alembic.config'`

This usually means your migrations folder is named `alembic/` and it's **shadowing the installed `alembic` package**. Python finds your local `alembic/` directory first (since it has an `__init__.py` or is on the Python path) instead of the real package.

To fix, rename your migrations folder:

```bash
mv alembic migrations
```

Then update `alembic.ini`:

```ini
script_location = %(here)s/migrations
```

This is especially common in Docker setups where `PYTHONPATH` is set broadly (e.g., `PYTHONPATH=/app`).

### I get `NameError: name 'sqlmodel' is not defined` when applying a migration

Alembic's autogenerate uses `sqlmodel.sql.sqltypes.AutoString()` in migration scripts but doesn't add `import sqlmodel` to the generated file. Add it manually to the affected migration file:

```python
from alembic import op
import sqlalchemy as sa
import sqlmodel  # ← add this
```

To fix this permanently for all future migrations, add `import sqlmodel` to `script.py.mako`. See [Getting Started — SQLModel template fix](./getting-started.md#sqlmodel-fix-the-migration-template).

### Should I run Alembic locally or inside Docker?

**Inside Docker is recommended** for projects that use Docker Compose. Running inside the container means:

- Same Python version and dependencies as your app
- Database hostname (e.g., `postgres`) resolves correctly
- No need for a local Python environment

```bash
docker compose exec api alembic upgrade head
```

Running locally works too, but you'll need to adjust the database hostname (e.g., `localhost` instead of `postgres`) since Docker service names don't resolve on the host.

### My database already has tables — how do I start using Alembic?

Generate an initial migration to capture the current schema, then `stamp` it as already applied:

```bash
alembic revision --autogenerate -m "initial schema"
alembic stamp head
```

`stamp` writes the revision ID to `alembic_version` without executing the migration. See [Getting Started — Adopting Alembic on an Existing Database](./getting-started.md#adopting-alembic-on-an-existing-database) for details.

### My autogenerated migration is picking up tables/changes I didn't expect

This can happen when:

- **Duplicate model definitions** — two files define the same `__tablename__`. Alembic sees the conflict and raises `Table 'x' is already defined`. Ensure each table is defined in exactly one model file.
- **Missing model imports in `env.py`** — if a model isn't imported, Alembic doesn't know about it and may generate a migration to drop that table.
- **Stale database state** — if someone manually altered the database outside of Alembic, the diff will include unexpected changes.

Always **review the generated migration file** before applying it.

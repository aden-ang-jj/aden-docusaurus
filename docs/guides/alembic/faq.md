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

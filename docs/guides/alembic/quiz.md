---
sidebar_label: Self-Test Quiz
sidebar_position: 6
title: Alembic Self-Test Quiz
description: Test your understanding of Alembic migrations.
tags: [python, alembic, sqlalchemy, database]
---

# Self-Test Quiz

Test your understanding of Alembic. Try to answer each question before revealing the answer.

## Q1: After adding a new column to your model, what command do you run next?

| Option | |
|---|---|
| A | `alembic upgrade head` |
| B | `alembic revision --autogenerate -m "add phone number"` |
| C | `alembic init alembic` |
| D | `alembic current` |

<details>
<summary>Answer</summary>

**B** — `alembic revision --autogenerate -m "add phone number"`

You need to generate the migration script first. `upgrade head` applies migrations, but there's nothing to apply yet — you haven't created the script. The workflow is always: model change → generate script → review → upgrade.

</details>

## Q2: A teammate renamed `username` to `display_name` via a manual migration but forgot to update the model. What does the next autogenerate produce?

| Option | |
|---|---|
| A | Nothing — Alembic sees no diff |
| B | A migration to drop `display_name` and add `username` |
| C | A migration to rename `username` to `display_name` |
| D | An error — Alembic refuses to run |

<details>
<summary>Answer</summary>

**B** — A migration to drop `display_name` and add `username`

Alembic compares the model (which still says `username`) against the DB (which now has `display_name`). It sees a mismatch and tries to make the DB match the model — generating a drop + add that would destroy all data in that column. This is why the model and database must always stay in sync.

</details>

## Q3: You need to add a non-nullable `role` column to a `users` table that already has 10,000 rows. Which column definition works safely?

| Option | |
|---|---|
| A | `sa.Column('role', sa.String(), nullable=False)` |
| B | `sa.Column('role', sa.String(), nullable=False, default='member')` |
| C | `sa.Column('role', sa.String(), nullable=False, server_default='member')` |
| D | `sa.Column('role', sa.String(), nullable=True)` |

<details>
<summary>Answer</summary>

**C** — `sa.Column('role', sa.String(), nullable=False, server_default='member')`

- **A** fails — existing rows can't be `NULL` but there's no default to fill them with.
- **B** fails — `default` only works at the Python/SQLAlchemy level, not in the actual `ALTER TABLE` SQL. The database still has no default, so the migration fails on existing rows.
- **C** works — `server_default` sets the default at the database level, so all 10,000 existing rows immediately get `'member'`.
- **D** works but doesn't meet the requirement — the column would be nullable, not non-nullable.

</details>

## Q4: You and a colleague both created migrations on separate Git branches pointing to the same `down_revision`. What happens on `alembic upgrade head`?

| Option | |
|---|---|
| A | Both migrations run in alphabetical order |
| B | A "multiple heads" error |
| C | Only the first migration runs |
| D | Alembic auto-merges them |

<details>
<summary>Answer</summary>

**B** — A "multiple heads" error

Alembic's revision chain is a linked list. Two migrations pointing to the same `down_revision` creates a fork — Alembic doesn't know which path to follow. Fix it with:

```bash
alembic merge heads -m "merge migrations"
```

This creates a merge migration that joins the two branches, similar to a Git merge commit.

</details>

## Q5: Your database already has tables created by `Base.metadata.create_all()`. You just set up Alembic and ran `alembic revision --autogenerate -m "initial"`. What should you do next?

| Option | |
|---|---|
| A | `alembic upgrade head` |
| B | `alembic stamp head` |
| C | `alembic downgrade base` then `alembic upgrade head` |
| D | Delete the migration and start over |

<details>
<summary>Answer</summary>

**B** — `alembic stamp head`

The migration script contains `CREATE TABLE` statements for tables that already exist. Running `upgrade head` would fail with "table already exists". `stamp head` records the migration as applied in `alembic_version` without executing it — telling Alembic "the database is already at this state." Future migrations will then work normally.

</details>

## Q6: A buggy migration has already been applied to the production database. What should you do?

| Option | |
|---|---|
| A | Edit the migration file and re-run `upgrade` |
| B | Downgrade, edit the file, then upgrade again |
| C | Create a new migration to fix the issue |
| D | Delete the migration file and recreate it |

<details>
<summary>Answer</summary>

**C** — Create a new migration to fix the issue

- **A** won't work — the migration is already marked as applied in `alembic_version`. Re-running `upgrade` won't re-execute it.
- **B** is valid for your local DB, but dangerous in production — downgrading can cause downtime and data loss, and other team members' databases still have the old migration applied.
- **C** is the correct approach — always "fix forward" in production. Create a new migration that corrects the problem.
- **D** would break the revision chain and confuse Alembic on every environment that already applied it.

This is known as the **"forward-only migrations"** principle: in production, never edit or revert — always move forward.

</details>

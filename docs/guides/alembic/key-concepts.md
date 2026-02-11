---
sidebar_label: Key Concepts
sidebar_position: 3
title: Alembic Key Concepts
description: Revision chain, autogenerate vs manual, schema vs data migrations.
tags: [python, alembic, sqlalchemy, database]
---

# Key Concepts

## Revision Chain

Migrations form a **linked list** via `revision` and `down_revision`. Alembic walks this chain to know the order.

There are three key positions to understand:

```
                     alembic_version table
                     tracks this pointer
                            ↓
(base)  →  a1b2c3  →  d4e5f6  →  g7h8i9
                       current      head
                     (DB is here)  (latest migration)
```

| Term | Meaning | How to check |
|---|---|---|
| **`base`** | Before any migrations — the starting point | — |
| **`head`** | The latest migration script in `alembic/versions/` | `alembic heads` |
| **`current`** | Where the database actually is right now — stored in the `alembic_version` table | `alembic current` |

:::tip Key insight
`upgrade` and `downgrade` always move relative to **current**, not head. If your DB is at `d4e5f6`:
- `alembic upgrade +1` → applies `g7h8i9` (one step forward from current)
- `alembic downgrade -1` → reverts `d4e5f6` (one step back from current, goes to `a1b2c3`)
- `alembic upgrade head` → applies everything from current up to `g7h8i9`
:::

### Example: Tracking current through a session

```
Starting state — fresh database, 3 migrations exist:

(base)  →  a1b2c3  →  d4e5f6  →  g7h8i9
  ↑ current                        head


After `alembic upgrade +1`:

(base)  →  a1b2c3  →  d4e5f6  →  g7h8i9
            ↑ current               head
            DB now has the changes from a1b2c3


After `alembic upgrade head`:

(base)  →  a1b2c3  →  d4e5f6  →  g7h8i9
                                  ↑ current = head
                                  DB is fully up to date


After `alembic downgrade -1`:

(base)  →  a1b2c3  →  d4e5f6  →  g7h8i9
                       ↑ current    head
                       g7h8i9's downgrade() was executed


After `alembic downgrade base`:

(base)  →  a1b2c3  →  d4e5f6  →  g7h8i9
  ↑ current                        head
  All migrations reverted — DB is empty
```

### How Alembic stores "current"

Alembic creates a table called `alembic_version` in your database with a single row:

```sql
SELECT * FROM alembic_version;
-- Returns: version_num = 'd4e5f6'  (whatever current is)
```

When you `upgrade`, it updates this value forward. When you `downgrade`, it updates it backward. This is how Alembic knows where you left off — even across sessions, machines, or deployments.

## Autogenerate vs Manual

In **both** approaches, you always update the model first. The difference is only how the migration script gets created:

| | Model change | Migration script |
|---|---|---|
| **Autogenerate** | You update the model | Alembic **generates** the script for you |
| **Manual** | You update the model | You **write** the script yourself |

**Autogenerate workflow** (used ~80% of the time for simple changes):

```bash
# 1. Update your model
# 2. Alembic generates the migration script
alembic revision --autogenerate -m "add status to blog_posts"
# 3. Review the generated file in alembic/versions/
# 4. Apply it
alembic upgrade head
```

**Manual workflow** (for things autogenerate can't handle):

```bash
# 1. Update your model
# 2. Create an empty migration script
alembic revision -m "rename username to display_name"
# 3. Write the upgrade() and downgrade() yourself
# 4. Apply it
alembic upgrade head
```

:::caution Always update your model
Even for manual migrations, **always update the model to match**. If the model and database go out of sync, the next autogenerate will produce incorrect migrations — e.g. trying to drop a column that exists in the DB but not in your model.
:::

## Schema Migrations vs Data Migrations

There are two types of migrations:

```
Schema Migration                    Data Migration (Backfilling)
─────────────────                   ────────────────────────────
Changes table STRUCTURE             Changes the DATA in rows
e.g. add/drop column, rename       e.g. fill NULL values, copy
     table, change type                  data between columns

op.add_column(...)                  op.execute("UPDATE ...")
op.drop_column(...)                 op.execute("INSERT ...")
op.alter_column(...)                op.execute("DELETE ...")
op.create_table(...)

Autogenerate: ✅ Yes                Autogenerate: ❌ No
(Alembic can detect these)          (Alembic can't see data changes)
```

### What is backfilling?

Backfilling means filling in values for existing rows that are missing data. For example, you added a `role` column to a table with 5,000 users — all existing rows now have `role = NULL`. Backfilling updates them:

```python
# Manual migration — autogenerate can't help here
def upgrade():
    # First, backfill existing rows
    op.execute("UPDATE users SET role = 'member' WHERE role IS NULL")
    # Then make the column non-nullable (safe now because no NULLs remain)
    op.alter_column('users', 'role', nullable=False)

def downgrade():
    op.alter_column('users', 'role', nullable=True)
```

:::caution Order matters
When backfilling + adding a constraint, always backfill **first**, then add the constraint. If you make the column `NOT NULL` before filling the data, the migration fails because `NULL` rows still exist.
:::

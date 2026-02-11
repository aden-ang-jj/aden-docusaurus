---
sidebar_label: Getting Started
sidebar_position: 2
title: Getting Started with Alembic
description: Setup, configuration, workflow, and core commands.
tags: [python, alembic, sqlalchemy, database]
---

# Getting Started with Alembic

## Prerequisites

```bash
pip install alembic sqlalchemy
```

## Project Setup

```bash
# Initialize Alembic in your project
alembic init alembic
```

This creates:

```
your-project/
├── alembic.ini              # Config file (database URL, logging)
├── alembic/
│   ├── env.py               # Connects Alembic to your models
│   ├── script.py.mako       # Template for new migration files
│   └── versions/            # Migration scripts live here
```

## Configuration

1. In `alembic.ini`, set your database URL:

```ini
sqlalchemy.url = postgresql://user:pass@localhost/mydb
```

2. In `alembic/env.py`, import your models' `Base.metadata` so Alembic can detect changes:

```python
from myapp.models import Base
target_metadata = Base.metadata
```

## The Typical Workflow

```
1. Update model code        →  edit your Python model file
2. Generate migration       →  alembic revision --autogenerate -m "message"
3. Review the script        →  check the generated file in alembic/versions/
4. Apply the migration      →  alembic upgrade head
```

:::note
Running `alembic` by itself only prints help text. You always need a subcommand like `upgrade`, `downgrade`, `revision`, etc.
:::

## Core Commands

| Command | Description |
|---|---|
| `alembic init alembic` | Scaffold the Alembic directory structure |
| `alembic revision --autogenerate -m "message"` | Auto-generate a migration by comparing your models to the DB |
| `alembic revision -m "message"` | Create an empty migration to write manually |
| `alembic upgrade head` | Apply **all** pending migrations (most common) |
| `alembic upgrade +1` | Apply only the **next** migration |
| `alembic upgrade a1b2c3` | Apply up to a **specific** revision ID |
| `alembic downgrade -1` | Revert the last migration |
| `alembic downgrade base` | Revert **all** migrations |
| `alembic current` | Show which migration the DB is currently at |
| `alembic history` | Show the full migration history |

## What does "head" mean?

`head` refers to the latest migration in the revision chain — borrowed from Git terminology:

```
(base) → a1b2c3 → d4e5f6 → g7h8i9 (head)
```

If your DB is at `a1b2c3` and you run `alembic upgrade head`, Alembic walks the chain and applies `d4e5f6` then `g7h8i9` in order. In practice, `alembic upgrade head` is what you'll use 99% of the time. The `+1` and specific revision options are useful for debugging — e.g. applying migrations one at a time to find which one breaks.

## Exercise: Write a Migration

Given this model:

```python
class BlogPost(Base):
    __tablename__ = "blog_posts"
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
```

Suppose you need to add a `status` column (draft/published) to `BlogPost`. Write the migration:

```python
def upgrade():
    op.add_column('blog_posts', sa.Column('status', sa.String(), nullable=False, server_default='draft'))

def downgrade():
    op.drop_column('blog_posts', 'status')
```

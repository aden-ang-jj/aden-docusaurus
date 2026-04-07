---
sidebar_label: Getting Started
sidebar_position: 3
title: Getting Started — Setup and Your First Trace
description: Set up Langfuse, install the SDK, and trace your first LLM call in under 10 minutes.
tags: [langfuse, setup, tracing, python]
---

# Getting Started — Setup and Your First Trace

This page gets you from zero to a traced LLM call. By the end, you'll have a trace visible in the Langfuse dashboard showing your prompt, the model's response, token usage, and cost.

## Step 1: Create a Langfuse Account

1. Go to [cloud.langfuse.com](https://cloud.langfuse.com) and sign up
2. Create a new **project** (e.g., "my-first-project")
3. Go to **Settings → API Keys** and create a new key pair
4. You'll get two keys:
   - `LANGFUSE_PUBLIC_KEY` — identifies your project (safe to expose)
   - `LANGFUSE_SECRET_KEY` — authenticates writes (keep secret)

## Step 2: Install the SDK

```bash
pip install langfuse openai
```

## Step 3: Configure Environment Variables

```bash
export LANGFUSE_SECRET_KEY="sk-lf-..."
export LANGFUSE_PUBLIC_KEY="pk-lf-..."
export LANGFUSE_BASE_URL="https://cloud.langfuse.com"
export OPENAI_API_KEY="sk-..."
```

:::tip
For self-hosted Langfuse, change `LANGFUSE_BASE_URL` to your instance URL. Everything else works the same.
:::

## Step 4: Your First Trace

The fastest way to trace an LLM call is the **OpenAI drop-in wrapper**. One import change and all your OpenAI calls are automatically traced:

```python
# The only change: import openai from langfuse instead of the openai package
from langfuse.openai import openai
from langfuse import get_client

response = openai.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is the capital of France?"}
    ],
)

print(response.choices[0].message.content)

# Flush to ensure the trace is sent before the script exits
get_client().flush()
```

Now open your Langfuse dashboard — you should see a trace with:
- The exact messages sent to the model
- The model's response
- Token counts (input, output, total)
- Calculated cost in USD
- Latency

That's it. One import change, and you have full observability.

## The `@observe` Decorator

The drop-in wrapper is great for quick wins, but real apps have multi-step pipelines. The `@observe` decorator lets you trace **any function** and build a hierarchical trace:

```python
from langfuse import observe, get_client
from langfuse.openai import openai

@observe()
def get_capital(country: str) -> str:
    """Ask the LLM for the capital of a country."""
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Reply with just the city name."},
            {"role": "user", "content": f"What is the capital of {country}?"}
        ],
        name="get-capital",  # Name shown in Langfuse UI
    )
    return response.choices[0].message.content

@observe()
def write_poem(city: str) -> str:
    """Ask the LLM to write a poem about a city."""
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Write a short 4-line poem about this city."},
            {"role": "user", "content": city}
        ],
        name="write-poem",
    )
    return response.choices[0].message.content

@observe()  # This is the top-level function → creates the Trace
def capital_poem(country: str) -> str:
    capital = get_capital(country)     # Child span with nested Generation
    poem = write_poem(capital)         # Child span with nested Generation
    return f"The capital of {country} is {capital}.\n\n{poem}"

result = capital_poem("Japan")
print(result)
get_client().flush()
```

In the Langfuse UI, you'll see this trace tree:

```
Trace: capital_poem
  ├── Span: get_capital
  │     └── Generation: get-capital (gpt-4o-mini, 45 tokens)
  └── Span: write_poem
        └── Generation: write-poem (gpt-4o-mini, 82 tokens)
```

### How `@observe` Works

- The **outermost** decorated function creates a **Trace** (the root)
- **Nested** decorated functions create **Spans** (child observations)
- OpenAI calls made via the drop-in wrapper are automatically captured as **Generations** inside the current span
- Context propagation is automatic — you don't need to pass trace IDs around

## Adding Metadata to Traces

Real applications need to associate traces with users, sessions, and tags. Use `propagate_attributes` to set these once and have them flow through all nested observations:

```python
from langfuse import observe, get_client, propagate_attributes

@observe()
def handle_message(user_input: str, user_id: str, session_id: str) -> str:
    with propagate_attributes(
        user_id=user_id,
        session_id=session_id,
        tags=["chatbot", "production"],
        metadata={"app_version": "1.2.0"},
    ):
        # All nested observations inherit user_id, session_id, tags
        response = process(user_input)

        # Update trace-level input/output for easy viewing in the dashboard
        langfuse = get_client()
        langfuse.update_current_trace(
            input={"message": user_input},
            output={"response": response},
        )

        return response

@observe()
def process(text: str) -> str:
    # ... your pipeline logic
    return "processed result"
```

## Flushing: Why It Matters

Langfuse sends traces **asynchronously in the background** to avoid adding latency to your app. This means:

- **Long-running apps** (web servers): Traces are batched and sent automatically. No action needed.
- **Short-lived scripts**: You **must** call `flush()` before the process exits, otherwise pending traces are lost.
- **Application shutdown**: Call `shutdown()` for a clean exit that flushes all pending data and releases resources.

```python
langfuse = get_client()

# For scripts — send pending traces before exit
langfuse.flush()

# For app shutdown — flush and clean up
langfuse.shutdown()
```

## Framework Integrations

If you're using a framework, Langfuse can integrate directly instead of using the `@observe` decorator:

### LangChain

```python
from langfuse.langchain import CallbackHandler

langfuse_handler = CallbackHandler()

# Pass the handler to any LangChain chain, agent, or tool
result = chain.invoke(
    {"input": "What is the capital of France?"},
    config={"callbacks": [langfuse_handler]},
)
```

### LlamaIndex

```python
from llama_index.core import Settings
from llama_index.core.callbacks import CallbackManager
from langfuse.llama_index import LlamaIndexCallbackHandler

langfuse_handler = LlamaIndexCallbackHandler()
Settings.callback_manager = CallbackManager([langfuse_handler])

# All LlamaIndex operations are now automatically traced
```

### Any Language via OpenTelemetry

Langfuse's v3 SDK is built on OpenTelemetry. For languages beyond Python and JS/TS, you can send OTel spans directly to Langfuse's OTLP endpoint.

## What's Next?

Now that you can trace LLM calls, let's look at real-world patterns — tracing RAG pipelines, tracking cost, evaluating quality, and monitoring agents.

- [Real-World Use Cases](./use-cases.md) — Concrete examples of Langfuse in production
- [FAQ](./faq.md) — Common questions and gotchas

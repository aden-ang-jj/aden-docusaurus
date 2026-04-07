---
sidebar_label: FAQ
sidebar_position: 5
title: FAQ — Common Questions and Gotchas
description: Frequently asked questions about Langfuse, tracing, and LLM observability.
tags: [langfuse, faq]
---

# FAQ — Common Questions and Gotchas

## Does Langfuse add latency to my app?

Minimal. Langfuse sends traces **asynchronously in the background** — your LLM call returns to the user immediately, and the trace data is batched and sent separately. Benchmarks show roughly ~15% overhead on the tracing operation itself, but this happens in a background thread, not on your request path.

The one thing to watch: **don't call `flush()` in your hot path**. `flush()` blocks until all pending traces are sent. Use it only in scripts or during shutdown.

## Do I need to call `flush()` in a web server?

Generally **no**. In long-running processes (FastAPI, Flask, Django), traces are batched and sent automatically in the background. You only need `flush()` in:

- **Scripts** that exit after doing work
- **Serverless functions** (Lambda, Cloud Functions) where the process may freeze between invocations
- **Application shutdown** handlers (use `shutdown()` instead for clean cleanup)

## What happens if Langfuse is down?

Your app continues to work normally. The SDK is designed to **never crash your application**. If it can't reach the Langfuse server, traces are dropped silently. Your LLM calls still execute and return responses as usual.

## Can I use Langfuse with models other than OpenAI?

Yes. Langfuse is **model-agnostic**. The `@observe` decorator works with any code. For automatic token/cost tracking, you have a few options:

| Model provider | Integration |
|---|---|
| OpenAI | Drop-in wrapper (`from langfuse.openai import openai`) |
| Anthropic, Google, etc. | Use `@observe(as_type="generation")` and pass model/usage info manually |
| LangChain models | Use the LangChain `CallbackHandler` — works with any model LangChain supports |
| LlamaIndex | Use the LlamaIndex callback handler |
| Any provider | Use the low-level SDK to manually create generations with model/token/cost data |

Langfuse has built-in pricing tables for major providers. For custom models, you can pass cost directly.

## What's the difference between the `@observe` decorator and the OpenAI wrapper?

They serve different purposes and are typically used **together**:

| | `@observe` decorator | OpenAI drop-in wrapper |
|---|---|---|
| **What it traces** | Any Python function | OpenAI API calls specifically |
| **Creates** | Traces (top-level) or Spans (nested) | Generations (with model, tokens, cost) |
| **Use for** | Structuring your trace tree | Automatically capturing LLM call details |

Typical pattern: `@observe` on your pipeline functions + the OpenAI wrapper for automatic generation tracking inside those functions.

## How do I trace async Python code?

The `@observe` decorator works with both sync and async functions:

```python
from langfuse import observe

@observe()
async def async_pipeline(query: str) -> str:
    docs = await retrieve_documents(query)
    answer = await generate_answer(docs)
    return answer
```

Context propagation works correctly across `await` boundaries.

## Cloud vs self-hosted: which should I pick?

| Situation | Recommendation |
|---|---|
| Learning / prototyping | **Cloud** (free tier, zero setup) |
| Small team, no data restrictions | **Cloud** (less operational overhead) |
| Enterprise, data must stay in your infra | **Self-hosted** |
| High volume (millions of traces/day) | **Self-hosted** (no per-event cost) |
| Need SSO / RBAC / audit logs | **Cloud Pro/Enterprise** or **Self-hosted Enterprise** |

Self-hosting requires PostgreSQL, ClickHouse, Redis, and S3-compatible storage. It's free (MIT license) but you own the infrastructure.

## How is Langfuse different from LangSmith?

Both are LLM observability platforms. Key differences:

| Aspect | Langfuse | LangSmith |
|---|---|---|
| **License** | Open-source (MIT) | Proprietary |
| **Self-hosting** | Full-featured, free | Limited self-hosting |
| **Framework lock-in** | Framework-agnostic | Built primarily for LangChain |
| **SDK approach** | `@observe` decorator + OTel | LangChain callbacks + RunTree |
| **Prompt management** | Built-in | Separate LangSmith Hub |

Langfuse is a strong choice if you want open-source, framework-agnostic observability. LangSmith is more tightly integrated if you're already all-in on LangChain.

## Can I export my data from Langfuse?

Yes. Langfuse provides:
- **REST API** for programmatic access to traces, scores, and sessions
- **CSV/JSON export** from the dashboard UI
- **Direct database access** if self-hosted (your PostgreSQL and ClickHouse)

## What are "units" in Langfuse Cloud pricing?

One unit = one ingested object (trace, observation, or score). A single user request that creates 1 trace with 3 spans and 2 scores = **6 units**. The free Hobby tier includes 50,000 units/month.

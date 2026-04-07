---
sidebar_label: Langfuse
sidebar_position: 1
title: Learning Langfuse — LLM Observability from Zero to Production
description: A practical guide to understanding Langfuse, from why LLM apps need observability to tracing, evaluation, and prompt management in production.
tags: [langfuse, llm, observability, tracing, evaluation]
---

# Learning Langfuse — LLM Observability from Zero to Production

A practical guide to understanding Langfuse, from why LLM apps need observability to tracing, evaluation, and prompt management in production.

## The Problem: LLM Apps Are Black Boxes

Traditional software is predictable — given the same input, you get the same output. LLM applications are fundamentally different:

- The **same prompt** can produce different outputs every time
- You can't write unit tests that assert exact responses
- A prompt that works in testing might **fail silently** in production (hallucinate, go off-topic, ignore instructions)
- You have **no visibility** into why a response was bad — was it the prompt? The retrieved context? The model?

Without observability, debugging an LLM app looks like this:

```
User reports: "The chatbot gave a wrong answer"

You:
- Which request was it? 🤷
- What prompt was sent? 🤷
- What context was retrieved? 🤷
- How many tokens did it use? 🤷
- Is this a one-off or a pattern? 🤷
```

This is the problem Langfuse solves.

## What is Langfuse?

Langfuse is an **open-source LLM observability platform**. It captures structured traces of every LLM interaction in your app — the prompts, completions, token usage, latency, cost, and the full execution tree of multi-step pipelines — and gives you a dashboard to explore, debug, and evaluate them.

Think of it as **application performance monitoring (APM), but purpose-built for LLM applications**.

| Traditional APM (Datadog, New Relic) | Langfuse |
|---|---|
| Tracks HTTP requests, DB queries, errors | Tracks LLM prompts, completions, chains |
| Metrics: latency, error rate, throughput | Metrics: token cost, latency, quality scores |
| Alerts on 500 errors | Alerts on hallucinations, high cost, low quality |
| Debugging: stack traces | Debugging: full prompt/response trees |

## Why Langfuse Matters

### 1. You can't improve what you can't measure

LLM apps degrade in subtle ways. A RAG pipeline might start retrieving irrelevant documents. A prompt might produce longer, more expensive responses after a model update. Without tracing, you won't notice until users complain.

### 2. Cost visibility is critical

LLM API calls cost real money. A single unoptimized prompt in a loop can burn through hundreds of dollars. Langfuse tracks token usage and cost per trace, so you can identify expensive patterns and optimize.

### 3. Evaluation closes the feedback loop

Langfuse lets you attach **scores** to traces — from user feedback (thumbs up/down), automated LLM-as-a-Judge evaluations, or custom metrics. This turns your production traffic into a continuous evaluation dataset.

### 4. Prompt management prevents chaos

When prompts live in code, changing them requires a deploy. Langfuse's prompt management lets you version, label, and swap prompts **without redeploying** — and every prompt version is automatically linked to the traces it produced.

## When to Use Langfuse

**Use Langfuse when:**

- You're building any app that calls an LLM (chatbot, RAG, agent, summarizer, etc.)
- You want to understand **why** your LLM app gives certain outputs
- You need to track cost and token usage across models
- You want to systematically evaluate output quality
- You're iterating on prompts and need to compare versions

**You might not need Langfuse if:**

- You're making one-off LLM calls in scripts (just use logging)
- You're only using LLMs for internal tooling with no quality requirements
- You already have a full observability stack that covers LLM-specific needs

## Langfuse at a Glance

```
Your LLM App                          Langfuse Platform
┌──────────────────────┐              ┌─────────────────────────┐
│                      │   traces     │                         │
│  User Request        │──────────────│  Dashboard & Analytics  │
│    ↓                 │              │    - Trace explorer     │
│  Retrieve docs       │              │    - Cost tracking      │
│    ↓                 │              │    - Latency metrics    │
│  Build prompt        │              │    - Quality scores     │
│    ↓                 │              │                         │
│  Call LLM            │              │  Evaluation             │
│    ↓                 │              │    - LLM-as-a-Judge     │
│  Return response     │              │    - User feedback      │
│                      │              │    - Annotation queues  │
└──────────────────────┘              │                         │
                                      │  Prompt Management      │
                                      │    - Versioning         │
                                      │    - A/B testing        │
                                      └─────────────────────────┘
```

## Cloud vs Self-Hosted

| Aspect | Langfuse Cloud | Self-Hosted |
|---|---|---|
| **Setup** | Sign up at `cloud.langfuse.com` | Deploy via Docker Compose or Kubernetes |
| **Cost** | Free tier (50k events/mo), paid plans from $29/mo | Free (MIT license), you pay for infrastructure |
| **Maintenance** | Fully managed | You manage PostgreSQL, ClickHouse, Redis, S3 |
| **Data residency** | Langfuse-managed servers | Full control in your own infrastructure |
| **Best for** | Getting started, small-to-medium projects | Enterprise, data-sensitive environments |

For learning, **start with Langfuse Cloud** — you'll be tracing in under 5 minutes.

## What's Next?

- [Core Concepts](./core-concepts.md) — Traces, spans, generations, scores, and the data model
- [Getting Started](./getting-started.md) — Setup, installation, and your first traced LLM call
- [Real-World Use Cases](./use-cases.md) — RAG tracing, cost optimization, evaluation, and agent monitoring
- [FAQ](./faq.md) — Common questions and gotchas

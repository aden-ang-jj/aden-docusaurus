---
sidebar_label: Core Concepts
sidebar_position: 2
title: Core Concepts — Traces, Generations, and Scores
description: Understanding Langfuse's data model — how traces, spans, generations, sessions, and scores fit together.
tags: [langfuse, tracing, observability, concepts]
---

# Core Concepts — Traces, Generations, and Scores

Before writing any code, you need to understand how Langfuse models the execution of your LLM app. Everything in Langfuse revolves around one idea: **a trace is a structured log of a single request flowing through your application**.

## The Data Model

Every request your app handles produces a **trace**. A trace contains one or more **observations** — the individual steps that happened during that request. Observations come in three types:

| Type | What it represents | Example |
|---|---|---|
| **Span** | A generic unit of work (has a start and end time) | "retrieve documents", "preprocess input" |
| **Generation** | An LLM call specifically (tracks model, tokens, cost) | "call GPT-4o", "call Claude" |
| **Event** | A point-in-time occurrence (no duration) | "user clicked thumbs up", "cache hit" |

The key distinction: **Generations** are special — they carry LLM-specific metadata like model name, token counts, and cost. Spans are for everything else.

### The Hierarchy

Observations nest inside each other, forming a tree:

```
Trace: "handle-user-question"
│
├── Span: "retrieve-documents"
│     ├── Span: "embed-query"
│     │     └── Generation: "embedding-call" (model=text-embedding-3-small)
│     └── Span: "vector-search"
│
├── Span: "build-prompt"
│
└── Generation: "answer-generation" (model=gpt-4o, tokens=1,847, cost=$0.02)
```

This tree is what you see in the Langfuse UI when you click on a trace. Each node shows its input, output, duration, and (for generations) the model and token usage.

### Why This Structure Matters

Without this hierarchy, a trace would just be a flat log line: "request took 2.3s, used 1,847 tokens". With it, you can answer:

- **Where is the latency?** The vector search took 800ms, the LLM call took 1.2s
- **Where is the cost?** The embedding call was $0.001, the answer generation was $0.02
- **What went wrong?** The retrieved documents were irrelevant (you can see them in the span's output)

## Traces

A trace is the top-level container. It represents **one end-to-end execution** of your application — typically one API request or one user message in a chatbot.

A trace carries:

| Field | Purpose |
|---|---|
| `input` / `output` | The overall request and response |
| `user_id` | Who made this request (for per-user analytics) |
| `session_id` | Groups related traces (e.g., a conversation thread) |
| `tags` | Flexible labels for filtering (e.g., `["production", "rag"]`) |
| `metadata` | Arbitrary JSON for your own use |
| `release` / `version` | Your app version (for tracking regressions after deploys) |

## Sessions

A **session** groups multiple traces together. The most common use case: a multi-turn chat conversation.

```
Session: "session_abc123"
│
├── Trace: "user message 1" → "assistant response 1"
├── Trace: "user message 2" → "assistant response 2"
└── Trace: "user message 3" → "assistant response 3"
```

Sessions let you:
- View an entire conversation in sequence
- Track cost and latency across a full user interaction
- Evaluate conversation-level quality (not just individual responses)

You create sessions implicitly — just pass the same `session_id` to multiple traces.

## Generations

A **generation** is the most important observation type. Every time your app calls an LLM, that should be a generation. Langfuse automatically tracks:

| Field | What it captures |
|---|---|
| `model` | Which model was called (gpt-4o, claude-sonnet, etc.) |
| `model_parameters` | Temperature, max_tokens, etc. |
| `input` | The prompt / messages sent to the model |
| `output` | The model's response |
| `usage` | Input tokens, output tokens, total tokens |
| `cost` | Calculated USD cost (Langfuse has built-in pricing tables) |
| `latency` | Time from request to response |

Langfuse knows the pricing for major model providers (OpenAI, Anthropic, Google, etc.) and **automatically calculates cost** from token counts. For custom or self-hosted models, you can provide cost manually.

## Scores

**Scores** are how you attach quality judgments to your traces and observations. They answer the question: _"Was this response good?"_

Scores come in three data types:

| Type | Example | Use case |
|---|---|---|
| **Boolean** | 1 (good) or 0 (bad) | User thumbs up/down |
| **Numeric** | 0.0 to 1.0 | Relevance score, accuracy rating |
| **Categorical** | "correct", "partially correct", "wrong" | Human annotation labels |

### Where Scores Come From

Langfuse supports four scoring methods, and you'll typically use more than one:

**1. User feedback** — Your end users click thumbs up/down or rate responses. You capture this in your frontend and push it to Langfuse as a score attached to the trace.

**2. LLM-as-a-Judge** — You configure an evaluator in the Langfuse UI that uses an LLM to automatically score traces. For example: "Given this context and this response, is the response a hallucination? Score 0 or 1." Langfuse runs this evaluator on your traces automatically.

**3. Manual annotation** — Your team reviews traces in annotation queues within the Langfuse UI and assigns scores manually. Useful for building gold-standard evaluation datasets.

**4. Programmatic scores** — You compute custom metrics in your code (e.g., "does the response contain a valid JSON?") and push them via the SDK.

### The Evaluation Loop

Scores aren't just for monitoring — they create a feedback loop:

```
Production traces → Scores (automated + human) → Identify failure patterns
    ↓                                                       ↓
Prompt/model improvements ← Add failures to test datasets ←─┘
```

## Prompt Management

Langfuse doubles as a **prompt registry**. Instead of hardcoding prompts in your application code, you store them in Langfuse and fetch them at runtime.

### How It Works

1. **Create a prompt** in the Langfuse UI (or via SDK) with a name and template variables using `{{variable}}` syntax
2. **Version it** — every edit creates a new version, old versions are preserved
3. **Label it** — assign labels like `production`, `staging`, `experiment-a` to specific versions
4. **Fetch at runtime** — your app calls `get_prompt("my-prompt")` and gets the version labeled `production`
5. **Swap without deploying** — move the `production` label to a different version in the UI, and your app picks it up automatically

### Why This Matters

| Without prompt management | With prompt management |
|---|---|
| Prompt changes require code deploys | Swap prompts instantly in the UI |
| No history of what changed | Full version history with diffs |
| Hard to A/B test prompts | Label different versions for different environments |
| No link between prompt and results | Every trace links to the exact prompt version that produced it |

## Putting It All Together

Here's how all the concepts relate in a real request:

```
User sends: "What are the side effects of ibuprofen?"

Session: "chat_user_789"                          ← groups the conversation
  └── Trace: "handle-message"                     ← this specific request
        ├── user_id: "user_789"
        ├── tags: ["rag", "medical"]
        │
        ├── Span: "retrieve-documents"            ← fetched 3 medical articles
        │     └── output: [doc1, doc2, doc3]
        │
        ├── Generation: "answer"                  ← called GPT-4o
        │     ├── model: "gpt-4o"
        │     ├── prompt: (fetched from Langfuse prompt registry, v3)
        │     ├── tokens: 2,100
        │     ├── cost: $0.03
        │     └── latency: 1.8s
        │
        ├── Score: "user-feedback" = 1 (thumbs up)       ← user liked it
        ├── Score: "hallucination" = 0 (no hallucination) ← LLM-as-a-Judge
        └── Score: "relevance" = 0.92                     ← programmatic
```

## What's Next?

Now that you understand the mental model, let's set up Langfuse and trace your first LLM call.

- [Getting Started](./getting-started.md) — Setup, installation, and your first traced LLM call
- [Real-World Use Cases](./use-cases.md) — RAG tracing, cost optimization, evaluation, and agent monitoring

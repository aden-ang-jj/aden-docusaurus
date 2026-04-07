---
sidebar_label: Real-World Use Cases
sidebar_position: 4
title: Real-World Use Cases — Langfuse in Production
description: Concrete examples of using Langfuse for RAG tracing, cost optimization, evaluation, prompt management, and agent monitoring.
tags: [langfuse, rag, evaluation, cost, agents, prompts]
---

# Real-World Use Cases — Langfuse in Production

This page shows how Langfuse solves real problems with concrete code examples. Each use case builds on the [core concepts](./core-concepts.md) and [getting started](./getting-started.md) foundations.

## Use Case 1: Tracing a RAG Pipeline

RAG (Retrieval-Augmented Generation) is the most common LLM application pattern, and also the hardest to debug. When a RAG app gives a bad answer, you need to know: was it a retrieval problem (wrong documents) or a generation problem (model ignored the context)?

Langfuse makes every step visible:

```python
from langfuse import observe, get_client
from langfuse.openai import openai

@observe()
def embed_query(query: str) -> list[float]:
    """Convert the user query to a vector embedding."""
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=query,
    )
    return response.data[0].embedding

@observe()
def search_documents(embedding: list[float], top_k: int = 3) -> list[dict]:
    """Search the vector database for relevant documents."""
    # In production, this would call Pinecone, Weaviate, pgvector, etc.
    return [
        {"title": "Ibuprofen Overview", "content": "Ibuprofen is a nonsteroidal anti-inflammatory drug (NSAID)..."},
        {"title": "NSAID Side Effects", "content": "Common side effects include stomach pain, nausea..."},
        {"title": "Drug Interactions", "content": "Ibuprofen may interact with blood thinners..."},
    ]

@observe()
def retrieve(query: str) -> list[dict]:
    """Full retrieval step: embed query → search vector DB."""
    embedding = embed_query(query)
    documents = search_documents(embedding)
    return documents

@observe()
def generate_answer(query: str, documents: list[dict]) -> str:
    """Generate an answer using retrieved context."""
    context = "\n\n".join(f"### {doc['title']}\n{doc['content']}" for doc in documents)

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"Answer based only on this context:\n\n{context}"},
            {"role": "user", "content": query},
        ],
        name="rag-generation",
    )
    return response.choices[0].message.content

@observe()
def rag_pipeline(query: str) -> str:
    """Full RAG pipeline: retrieve → generate."""
    documents = retrieve(query)
    answer = generate_answer(query, documents)

    langfuse = get_client()
    langfuse.update_current_trace(
        input={"query": query},
        output={"answer": answer, "num_documents": len(documents)},
    )
    return answer

answer = rag_pipeline("What are the side effects of ibuprofen?")
print(answer)
get_client().flush()
```

In the Langfuse dashboard, you'll see:

```
Trace: rag_pipeline (1.9s, $0.03)
  ├── Span: retrieve (0.4s)
  │     ├── Span: embed_query
  │     │     └── Generation: embedding (text-embedding-3-small, 12 tokens, $0.00)
  │     └── Span: search_documents
  │           └── output: [3 documents]     ← You can see exactly what was retrieved
  └── Span: generate_answer
        └── Generation: rag-generation (gpt-4o, 1,847 tokens, $0.03)
              ├── input: system prompt with context    ← The exact prompt sent
              └── output: "Common side effects..."     ← The model's response
```

Now when a user reports a bad answer, you can pinpoint whether the retrieval was wrong (bad documents) or the generation was wrong (model hallucinated despite good context).

## Use Case 2: Cost Tracking and Optimization

LLM costs can spiral quickly. Langfuse automatically tracks token usage and calculates cost for every generation, giving you visibility into where your money goes.

### What you get out of the box

Once you're tracing, the Langfuse dashboard shows:
- **Cost per trace** — how much each user request costs
- **Cost by model** — are you using GPT-4o where GPT-4o-mini would suffice?
- **Cost over time** — trending up or down?
- **Cost by user** — which users/features are most expensive?
- **Token breakdown** — input vs output tokens per call

### Common cost optimizations discovered via Langfuse

| Pattern found in traces | Optimization |
|---|---|
| System prompt is 2,000 tokens on every call | Shorten the system prompt or move context to retrieval |
| Same query is made repeatedly | Add a semantic cache layer |
| GPT-4o used for simple classification | Switch to GPT-4o-mini for that step |
| Retrieved 10 documents but model only needs 3 | Reduce `top_k` in retrieval |
| Output tokens are 5x input tokens | Add `max_tokens` or instruct conciseness |

## Use Case 3: Evaluation and Quality Monitoring

Tracing tells you _what happened_. Evaluation tells you _whether it was good_. Langfuse supports multiple evaluation strategies that you'll typically combine.

### User Feedback Scores

The simplest evaluation: let your users tell you. Capture thumbs up/down in your frontend and push it to Langfuse:

```python
from langfuse import get_client

langfuse = get_client()

# When the user clicks thumbs up in your UI, you call this
# with the trace_id you stored when the request was made
langfuse.create_score(
    trace_id="trace-id-from-your-app",
    name="user-feedback",
    value=1,
    data_type="BOOLEAN",
    comment="User clicked thumbs up",
)
langfuse.flush()
```

### Inline Programmatic Scores

Compute custom metrics within your traced functions:

```python
import json
from langfuse import observe, get_client

@observe()
def generate_structured_output(query: str) -> dict:
    langfuse = get_client()

    response = call_llm(query)

    # Score: is the output valid JSON?
    try:
        result = json.loads(response)
        langfuse.score_current_trace(
            name="valid-json",
            value=1,
            data_type="BOOLEAN",
        )
    except json.JSONDecodeError:
        langfuse.score_current_trace(
            name="valid-json",
            value=0,
            data_type="BOOLEAN",
            comment=f"Failed to parse: {response[:100]}",
        )
        result = {"error": "invalid response"}

    return result
```

### LLM-as-a-Judge (Automated Evaluation)

For subjective quality (relevance, helpfulness, hallucination), you configure evaluators in the Langfuse UI that run automatically:

1. Go to **Evaluation → Evaluators** in the Langfuse dashboard
2. Choose a pre-built template (Hallucination, Relevance, Toxicity) or write a custom prompt
3. Map template variables to trace data using JSONPath (e.g., `{{output}}` → `$.output`)
4. Set which traces to evaluate (by tags, sample rate, etc.)

Langfuse runs the evaluator LLM on matching traces and stores the results as scores. Each evaluator run creates its own trace, so you have full transparency into how the evaluation was done.

## Use Case 4: Prompt Management

As your app matures, you'll want to iterate on prompts without redeploying. Langfuse's prompt registry lets you manage prompts as a separate concern from your code.

### Creating and Using Prompts

```python
from langfuse import get_client
from langfuse.openai import openai

langfuse = get_client()

# === One-time setup: create a prompt (or do this in the UI) ===
langfuse.create_prompt(
    name="qa-system-prompt",
    type="chat",
    prompt=[
        {
            "role": "system",
            "content": (
                "You are a {{role}} assistant. "
                "Answer questions about {{domain}} concisely. "
                "If you don't know, say so."
            ),
        },
    ],
    labels=["production"],
)

# === At runtime: fetch and use the prompt ===
prompt = langfuse.get_prompt("qa-system-prompt", type="chat")

# Compile with variables
messages = prompt.compile(
    role="medical",
    domain="pharmacology",
)

# Add the user's question
messages.append({"role": "user", "content": "What is ibuprofen used for?"})

response = openai.chat.completions.create(
    model="gpt-4o",
    messages=messages,
)
print(response.choices[0].message.content)
langfuse.flush()
```

### The Workflow

```
1. Create prompt v1 → label as "production"
2. App fetches "production" label → uses v1
3. Write prompt v2 → label as "staging"
4. Test v2 in staging → check traces and scores
5. Move "production" label to v2 → app now uses v2 (no deploy needed)
6. If v2 is worse → move "production" label back to v1 (instant rollback)
```

## Use Case 5: Agent and Multi-Step Pipeline Monitoring

LLM agents (tool-calling loops, multi-step reasoning) are especially hard to debug because:
- They make **multiple LLM calls** in a loop
- Each iteration might call different **tools**
- The number of steps is **non-deterministic**
- A failure on step 7 might be caused by a bad decision on step 2

Langfuse traces the full agent execution tree:

```python
from langfuse import observe, get_client
from langfuse.openai import openai

@observe()
def run_tool(tool_name: str, args: dict) -> str:
    """Execute a tool and return the result."""
    # Your tool implementations here
    if tool_name == "search":
        return f"Search results for: {args['query']}"
    elif tool_name == "calculator":
        return str(eval(args["expression"]))  # simplified example
    return "Unknown tool"

@observe()
def agent_step(messages: list[dict]) -> dict:
    """One iteration of the agent loop."""
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=[...],  # your tool definitions
        name="agent-step",
    )
    return response.choices[0].message

@observe()
def run_agent(user_query: str, max_steps: int = 5) -> str:
    """Run a tool-calling agent loop."""
    messages = [
        {"role": "system", "content": "You are a helpful assistant with access to tools."},
        {"role": "user", "content": user_query},
    ]

    for step in range(max_steps):
        response_message = agent_step(messages)
        messages.append(response_message)

        # Check if the agent wants to call a tool
        if not response_message.tool_calls:
            # Agent is done — return the final response
            return response_message.content

        # Execute each tool call
        for tool_call in response_message.tool_calls:
            result = run_tool(
                tool_call.function.name,
                json.loads(tool_call.function.arguments),
            )
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

    return "Agent reached max steps without a final answer."
```

The resulting trace shows every decision the agent made:

```
Trace: run_agent
  ├── Span: agent_step (step 1)
  │     └── Generation: agent-step → decided to call "search"
  ├── Span: run_tool ("search")
  ├── Span: agent_step (step 2)
  │     └── Generation: agent-step → decided to call "calculator"
  ├── Span: run_tool ("calculator")
  └── Span: agent_step (step 3)
        └── Generation: agent-step → returned final answer
```

## Use Case 6: Scoring a RAG Pipeline for Quality

<!-- TODO(human): Implement the evaluate_rag_response function below.
     This function should score the quality of a RAG pipeline response
     by checking multiple quality dimensions and returning scores
     that get pushed to Langfuse. -->

Tracing alone tells you _what happened_ in your RAG pipeline. But to systematically improve quality, you need to **score every response** on dimensions that matter to your use case.

Below is a scaffold for a RAG evaluation function. The function receives the query, retrieved documents, and the generated answer, and should push meaningful scores to Langfuse.

```python
from langfuse import get_client

langfuse = get_client()

def evaluate_rag_response(
    trace_id: str,
    query: str,
    retrieved_docs: list[dict],
    answer: str,
) -> None:
    """
    TODO(human): Evaluate the quality of a RAG pipeline response.

    Score the response on dimensions you think matter most.
    Use langfuse.create_score() to push each score. For example:

        langfuse.create_score(
            trace_id=trace_id,
            name="your-metric-name",
            value=...,          # bool, float, or string
            data_type="...",    # "BOOLEAN", "NUMERIC", or "CATEGORICAL"
            comment="...",      # optional explanation
        )

    Consider dimensions like:
    - Does the answer actually use the retrieved documents?
    - Does the answer address the user's question?
    - Is the answer concise or unnecessarily verbose?
    - Are there claims not grounded in the retrieved context?

    Args:
        trace_id: The Langfuse trace ID to attach scores to
        query: The original user question
        retrieved_docs: List of documents retrieved from vector search
        answer: The LLM-generated answer
    """
    pass
```

---

**Learn by Doing**

**Context:** We've built a full RAG pipeline with tracing (Use Case 1) and understand how scoring works (Use Case 3). The infrastructure is ready — traces are flowing into Langfuse with full visibility into retrieval and generation steps. Now we need a function that programmatically evaluates each RAG response and pushes quality scores to Langfuse, so we can monitor quality over time and catch regressions.

**Your Task:** In `docs/guides/langfuse/use-cases.md`, implement the `evaluate_rag_response` function body. Look for `TODO(human)`. This function should check 2-4 quality dimensions of the RAG response and push a score for each one using `langfuse.create_score()`.

**Guidance:** Think about what makes a RAG response _good_ vs _bad_. Some dimensions to consider: Does the answer reference the retrieved documents? Is it actually answering the question that was asked? Is it making claims that aren't in the context (hallucination)? You can use simple heuristics (string matching, length checks) or more sophisticated approaches. Each dimension should become a separate `create_score()` call with a descriptive name. The scoring approach you choose here reflects a real design decision every LLM team faces — there's no single right answer.
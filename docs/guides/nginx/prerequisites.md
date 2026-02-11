---
sidebar_label: Prerequisites
sidebar_position: 2
title: Prerequisites — Networking & OS Fundamentals
description: The foundational concepts you need to understand before learning NGINX.
tags: [nginx, networking, http, tcp, dns]
---

# Prerequisites — Networking & OS Fundamentals

Before learning NGINX, you need to understand the networking and OS concepts it builds on. This page covers everything you need.

## 1. How a Web Request Travels

When you type `https://example.com/api/users` into your browser, here is what happens step by step:

### Step 1: URL Parsing

The browser breaks the URL into parts:

```
https://          →  protocol (how to communicate)
example.com       →  domain (who to talk to)
/api/users        →  path (what you're asking for)
```

### Step 2: DNS Lookup

The browser knows the domain name, but computers communicate using **IP addresses** (like `93.184.216.34`). DNS (Domain Name System) is the phonebook that translates domain names into IP addresses.

```
Browser:     "Hey DNS, where is example.com?"
DNS server:  "That's 93.184.216.34"
```

Your computer caches the result so it doesn't ask again for subsequent requests.

### Step 3: TCP Handshake

Before sending any data, the browser must establish a **reliable connection** with the server. This is the TCP three-way handshake:

```
Your computer → Server:  "Can we talk?"     (SYN)
Server → Your computer:  "Yes, I'm here"    (SYN-ACK)
Your computer → Server:  "Great, let's go"  (ACK)
```

Think of it like a phone call — you have to wait for someone to pick up before you can start talking. The browser also needs a **port** to connect to (covered in the next section), so the full connection target is something like `93.184.216.34:443`.

### Step 4: HTTP Request

Over the open connection, the browser sends a text-based **HTTP request**:

```
GET /api/users HTTP/1.1
Host: example.com
Accept: application/json
```

- **GET** = the method (read data, not create or delete)
- **/api/users** = the path
- **Host** = which domain (one server can host multiple sites)

### Step 5: HTTP Response

The server processes the request and sends back a response with three parts:

```
HTTP/1.1 200 OK              ← status line (protocol + status code)
Content-Type: application/json ← headers (metadata, key-value pairs)
                               ← blank line separates headers from body
{"users": ["Alice", "Bob"]}   ← body (the actual data)
```

Common status codes you'll see:
- **200** — OK
- **301/302** — Redirect
- **404** — Not Found
- **500** — Internal Server Error

### Step 6: Connection Reuse (Keep-Alive)

Opening a TCP connection has overhead (~150ms for the handshake). If the browser needs to make more requests (CSS files, images, API calls), it can **reuse** the same connection instead of opening a new one. This is called **keep-alive**.

### The Full Picture

```
Browser                          Internet                        Server
   │                                                               │
   │  1. Parse URL                                                 │
   │  2. DNS: "example.com" = ?  ──────►  DNS ──► 93.184.216.34   │
   │  3. TCP handshake           ◄─────────────────────────────►   │
   │  4. Send HTTP request       ──────────────────────────────►   │
   │                                                    process... │
   │  5. Receive HTTP response   ◄──────────────────────────────   │
   │  6. Render page / use data                                    │
   │                                                               │
```

**Why this matters for NGINX:** NGINX lives at steps 4-5. It's the thing on the server that receives the HTTP request and decides what to do with it.

---

## 2. Ports

A server (machine) can run many services — your app, a database, a cache, NGINX. They all share the same IP address. **Ports** are how the OS knows which program should receive a given connection.

### The Analogy

```
IP address = the building       (which machine)
Port       = the room number    (which program on that machine)
```

### Example: One Machine, Multiple Services

```
93.184.216.34:80    → NGINX listening here
93.184.216.34:3000  → Flask app listening here
93.184.216.34:5432  → PostgreSQL listening here
93.184.216.34:6379  → Redis listening here
```

### Well-Known Ports (Conventions)

| Port | Protocol | Notes |
|------|----------|-------|
| 80   | HTTP     | Default when you type `http://` |
| 443  | HTTPS    | Default when you type `https://` |
| 22   | SSH      | Remote server access |
| 5432 | PostgreSQL | |
| 3306 | MySQL    | |

When you type `https://example.com`, the browser silently adds port 443. The URL is really `https://example.com:443`.

### Privileged vs Non-Privileged Ports

```
Ports 0-1023:     Privileged — require root access to bind to
Ports 1024-65535: Non-privileged — any program can bind to these
```

This is why your dev server uses `localhost:3000` or `localhost:5000` — no root needed. In production, **NGINX binds to port 80/443** (it starts as root for this), then forwards traffic to your app on a non-privileged port.

### The Port Is Part of the TCP Connection

The browser determines the port **before** the TCP handshake — either from the URL explicitly (`http://example.com:3000`) or implicitly from the protocol (`https://` → 443). The OS uses the port in the TCP connection to route traffic to the correct program.

```
Browser connects to 93.184.216.34:5000  → OS delivers to Flask
Browser connects to 93.184.216.34:3000  → OS delivers to Node
```

### Development vs Production

```
Development:
  Browser ──► localhost:3000 (your app directly)

Production:
  Browser ──► server:443 (NGINX) ──► localhost:3000 (your app)
```

### The Two-Connection Model (Reverse Proxy)

This is crucial: when NGINX forwards a request to your app, the browser does **not** connect directly to your app. There are two separate connections:

```
Connection 1:  Browser ──► NGINX (port 443)
Connection 2:  NGINX  ──► Flask  (port 5000)
```

- The browser only knows about NGINX
- Flask only knows about NGINX (not the browser)
- NGINX knows about both

This is why checking the client IP in Flask often shows `127.0.0.1` — the request came from NGINX, not the browser. NGINX passes the real client IP via the `X-Forwarded-For` header.

---

## 3. Processes

A process is one of the most fundamental OS concepts, and it's central to how NGINX is structured.

### Program vs Process

A **program** is a file sitting on disk. Python, NGINX, Flask — just files. They don't do anything by themselves.

A **process** is what happens when you **run** that program. It's alive — using memory, executing code, talking to the network.

```
Program = a recipe book on a shelf
Process = someone actually cooking from that recipe
```

You can run the same program twice — that gives you two separate processes:

```bash
python3 app.py       → starts process (PID 4521)
python3 app.py       → starts another process (PID 4522)
```

### Every Process Gets a PID

The OS assigns each process a unique **PID** (Process ID). This is how you identify and manage them — for example, stopping a specific process by its PID.

```
PID    WHAT
4521   python3 app.py
4522   python3 worker.py
9001   nginx
```

### Processes Are Isolated

Each process gets its **own** memory, network connections, and resources. They don't share by default.

```
Process A (Flask)        Process B (PostgreSQL)
┌───────────────┐       ┌───────────────┐
│ its own memory │       │ its own memory │
│ its own port   │       │ its own port   │
└───────────────┘       └───────────────┘
```

If Flask crashes, PostgreSQL keeps running. They're completely separate. This also means **two processes cannot bind to the same port** — the second one will fail with `Address already in use`.

### Parent and Child Processes

A process can **spawn** (create) other processes. The creator is the **parent**, the new one is the **child**.

### Why NGINX Uses Parent + Child Processes

NGINX doesn't run as a single process. It uses a **master process** (parent) and multiple **worker processes** (children). This split exists for two reasons:

**Reason 1: Zero-downtime config reloads.**

If NGINX were a single process and you changed the config, you'd have to stop and restart it — disconnecting every user. With the master/worker split:

1. You change the config and tell NGINX to reload
2. The master reads the new config
3. The master spawns **new** workers with the new config
4. The **old** workers finish their current requests, then die
5. Traffic was never interrupted

The master never handles traffic itself, so it can safely coordinate this handoff.

**Reason 2: Crash recovery.**

If a worker crashes, the master notices and spawns a replacement. The other workers keep handling traffic the whole time. Users never notice.

### Why Multiple Workers?

A single process can only use **one CPU core**. If your machine has 4 cores and you only run 1 worker, 75% of your CPU is idle.

```
4-core machine, 1 worker:
  Core 1: [worker - busy]
  Core 2: [idle]
  Core 3: [idle]
  Core 4: [idle]

4-core machine, 4 workers:
  Core 1: [worker 1 - busy]
  Core 2: [worker 2 - busy]
  Core 3: [worker 3 - busy]
  Core 4: [worker 4 - busy]
```

The typical setup is **one worker per CPU core**. Each worker runs its own event loop and can handle thousands of connections.

### The Complete Picture

```
Master Process (PID 9001)
  Job: manage workers, read config, bind to ports
  Does NOT handle any traffic

  ├── Worker 1 (PID 9002) ── handles thousands of connections
  ├── Worker 2 (PID 9003) ── handles thousands of connections
  └── Worker 3 (PID 9004) ── handles thousands of connections
       Each worker: runs an event loop on one CPU core
```

| Role | Handles traffic? | Can be restarted safely? |
|------|-----------------|-------------------------|
| Master | No | No (but it never needs to be) |
| Workers | Yes | Yes (master replaces them) |

**Why this matters for NGINX:** When you start NGINX, you're starting a family of processes — one master that manages everything, and multiple workers that handle the actual traffic. This design gives NGINX its reliability and zero-downtime reloads.

---

## 4. What a Web Server Does

A web server has one job: **listen on a port, receive HTTP requests, send back responses.**

### Two Types of Serving

**Static serving** — return files directly from disk. No code runs, just file lookup.

```
Request: GET /logo.png
Server:  finds /var/www/logo.png on disk → sends it back
```

**Dynamic serving** — run code to generate the response. This is what Flask/Express does.

```
Request: GET /api/users
Server:  runs Python code → queries database → builds JSON → sends it back
```

### NGINX vs Flask/Express

Both are web servers, but they're good at different things:

| | NGINX | Flask/Express |
|---|---|---|
| Serve static files (images, CSS, JS) | Extremely fast | Slow in comparison |
| Handle thousands of connections | Built for it (event loop) | Struggles |
| Run your business logic | Cannot | This is its job |

### Where Does NGINX Get Static Files?

From a folder on the server's disk that you configure:

```
Server filesystem:
/var/www/mysite/
  ├── index.html
  ├── style.css
  ├── logo.png
  └── images/
       └── banner.jpg
```

In the NGINX config, you point it at that folder:

```nginx
location / {
    root /var/www/mysite;
}
```

When a request comes in for `GET /logo.png`, NGINX looks up `/var/www/mysite/logo.png` on disk and sends it back. No magic — just reading files from a configured folder.

### What NGINX Handles vs What It Forwards

| NGINX handles directly | Forwards to your app |
|---|---|
| Serve static files (HTML, CSS, JS, images) | API requests that need business logic |
| TLS/HTTPS encryption and decryption | Database queries |
| Reject bad requests (too large, wrong method) | Authentication logic |
| Rate limiting (block excessive requests) | Anything requiring your application code |
| Compression (gzip responses before sending) | |
| Caching (remember a response and reuse it) | |

The key distinction: **if it requires your application code to generate a response, it goes to your app. If NGINX can answer without your code, it handles it itself.**

### Why This Is Better Than Flask Doing Everything

```
Flask serving an image:
  request → Python interpreter → Flask framework → route matching → file read → response

NGINX serving an image:
  request → file read → response
```

Less overhead means faster responses. It also frees up your app to focus on requests that actually need business logic.

### NGINX Can Work Alone

For a purely static site (documentation, landing pages, blogs, SPAs), you don't need a backend at all. NGINX serves files directly:

```
Browser ──► NGINX ──► reads files from disk ──► responds
```

**Why this matters for NGINX:** Understanding this split — what NGINX handles vs what your app handles — is the foundation of every NGINX config you'll ever write. You're essentially defining rules for "serve this yourself" vs "forward this to my app."

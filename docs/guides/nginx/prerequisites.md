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

### How Does the Browser Know the Port?

A TCP connection **always** requires a specific port. But the URL often doesn't include one. The browser fills it in from the protocol:

```
Step 1: Browser parses the URL
  protocol = https
  domain   = example.com
  path     = /dashboard
  port     = not specified

Step 2: DNS resolves example.com → 93.184.216.34

Step 2.5: Browser fills in the port from the protocol
  https → 443
  http  → 80

Step 3: TCP handshake to 93.184.216.34:443
```

The port is either **explicit** (you typed it) or **implicit** (derived from the protocol):

```
Explicit:   http://example.com:3000/api   → port 3000
Implicit:   http://example.com/api        → port 80 (from http)
Implicit:   https://example.com/api       → port 443 (from https)
```

You can never have a TCP connection without a port. The browser just figures it out for you.

### Step 6: Connection Reuse (Keep-Alive)

Opening a TCP connection costs **time (latency)**, not bandwidth. Remember the handshake takes multiple round trips:

```
Each new connection:
  Your computer → Server:  SYN         (trip 1)
  Server → Your computer:  SYN-ACK     (trip 2)
  Your computer → Server:  ACK         (trip 3)
  NOW you can send the request          (trip 4)

With keep-alive (reusing connection):
  Just send the request                 (trip 1)
```

Each trip across the internet takes time (say 50ms). A new connection adds ~150ms of overhead **before any data is exchanged**. For 3 extra files, that's 450ms wasted just on handshakes.

With **keep-alive**, you do the handshake once and send all requests over the same open connection.

> **Note on bandwidth:** Bandwidth is how much data you can send at once — think of it as the width of a pipe. A wider pipe pushes more water per second. Keep-alive saves latency (time per trip), not bandwidth.

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

### Reserved vs Privileged Ports

These two terms overlap but mean different things:

```
Reserved    = ports with agreed-upon purposes (conventions)
              Port 80 is reserved for HTTP, port 443 for HTTPS

Privileged  = ports 0-1023 that require root/admin access to bind to
              This is an OS-level restriction

Non-privileged = ports 1024-65535, any program can bind to these
```

Port 80 is both reserved (convention: HTTP) **and** privileged (needs root). Port 3000 is neither — any program can bind to it, and it has no special meaning.

### Why Your App Can't Just Listen on Port 80

**Reason 1: Privilege.** Ports below 1024 require root. Running your Flask app as root is a security risk — if someone hacks your app, they have full control of the server. NGINX handles this safely: the master process starts as root to grab the port, then the workers **drop down to an unprivileged user**.

**Reason 2: Your app isn't built for it.** Flask/Express are good at business logic but bad at handling thousands of connections, serving static files efficiently, terminating TLS, and recovering from crashes gracefully. NGINX is purpose-built for all of that.

This is why your dev server uses `localhost:3000` or `localhost:5000` — no root needed. In production, **NGINX binds to port 80/443** and forwards traffic to your app on a non-privileged port.

### The Port Is Part of the TCP Connection

A common misconception is that the OS reads the HTTP request headers to decide which program gets the traffic. It doesn't — routing happens at the **TCP level**, before any HTTP is sent.

The port is specified when the browser opens the TCP connection (step 3 of the request lifecycle). The OS uses this port to deliver the connection to the correct program:

```
Browser connects to 93.184.216.34:5000  → OS delivers to Flask
Browser connects to 93.184.216.34:3000  → OS delivers to Node
```

Think back to the building analogy — you decide which room to walk into **before** you start talking. You don't enter a random room and ask "am I in the right place?"

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

---

## 5. What a Reverse Proxy Is

A **proxy** is a middleman between two parties in a network. There are two types:

### Forward Proxy vs Reverse Proxy

**Forward proxy** — sits in front of the **client**, acts on behalf of the client:

```
You ──► Forward Proxy ──► Internet
```

Example: a company network proxy that fetches websites for employees. The server sees the proxy's IP, not yours. The forward proxy **hides the client**.

**Reverse proxy** — sits in front of the **server**, acts on behalf of the server:

```
Internet ──► Reverse Proxy ──► Your App
```

Example: NGINX in production. Users hit `myapp.com`, NGINX receives the request and forwards it to Flask. Users have no idea Flask exists. The reverse proxy **hides the server**.

### Why Use a Reverse Proxy?

**1. Security** — Your app is never exposed to the internet directly.

```
Without reverse proxy:
  Internet ──► Flask (port 5000 open to the world, attackable)

With reverse proxy:
  Internet ──► NGINX (port 443) ──► Flask (port 5000, only accessible locally)
```

Only port 443 is open. Even if someone knows Flask runs on port 5000, they can't reach it from outside.

**2. Single entry point** — Multiple services behind one domain.

Without NGINX, users would have to type port numbers manually:

```
Without NGINX (ugly, insecure):
  myapp.com:5000/api/users    → Flask
  myapp.com:3000/admin        → Admin service
  myapp.com:8080/docs         → Docusaurus

  Every port is open to the internet = more attack surface.
  Users have to remember port numbers = bad experience.

With NGINX (clean, secure):
  myapp.com/api/*        → NGINX forwards to Flask (port 5000)
  myapp.com/admin/*      → NGINX forwards to Admin service (port 3000)
  myapp.com/docs/*       → NGINX forwards to Docusaurus (port 8080)
  myapp.com/*            → NGINX serves static files from disk

  Only port 443 is open. One domain, no port numbers.
```

Users just see `myapp.com`. They don't know there are three separate services behind it.

**3. TLS termination** — NGINX handles HTTPS encryption so your app doesn't have to.

TLS (Transport Layer Security) is the encryption that makes HTTPS secure. When you see the lock icon in your browser's address bar, TLS is active.

```
Without TLS (HTTP):
  Browser sends: {"password": "hunter123"}
  Anyone snooping on the network sees: {"password": "hunter123"}

With TLS (HTTPS):
  Browser sends: {"password": "hunter123"}
  Anyone snooping sees: x8Kj2#mP9...qR4nL (encrypted gibberish)
```

**"TLS termination"** means NGINX is where the encrypted connection **ends** — like a secure courier delivering a locked box to the front desk. NGINX (the front desk) unlocks the box, reads the contents, and passes the plain message to the right office (Flask). The secure courier's job **terminates** at the front desk.

```
Browser ── ENCRYPTED (TLS) ──► NGINX ── PLAIN HTTP ──► Flask
                                  ▲
                         encryption ends here
                         (TLS is "terminated")
```

From NGINX to Flask, the traffic is plain HTTP — no encryption needed because it's all on the same machine (`localhost`).

Without NGINX, every service needs its own TLS setup:

```
With NGINX (TLS once):
  Browser ── ENCRYPTED ──► NGINX ── plain ──► Flask (port 5000)
                                 ── plain ──► Admin (port 3000)
                                 ── plain ──► Docs  (port 8080)

  Only NGINX needs a TLS certificate.

Without NGINX (TLS everywhere):
  Browser ── ENCRYPTED ──► Flask (port 5000, needs its own TLS certificate)
  Browser ── ENCRYPTED ──► Admin (port 3000, needs its own TLS certificate)
  Browser ── ENCRYPTED ──► Docs  (port 8080, needs its own TLS certificate)

  3x the setup, 3x the maintenance, 3x the things that can go wrong.
```

**4. Load balancing** — Distribute traffic across multiple copies of your app.

```
                         ┌──► Flask copy 1 (port 5001)
Browser ──► NGINX ───────┼──► Flask copy 2 (port 5002)
                         └──► Flask copy 3 (port 5003)
```

If one copy crashes or gets overloaded, NGINX sends traffic to the others.

**Why this matters for NGINX:** The reverse proxy is NGINX's primary role in most production deployments. Almost everything you configure in NGINX — routing, TLS, load balancing, caching — is a feature of its reverse proxy capabilities.

---
sidebar_label: Load Balancing
sidebar_position: 5
title: Load Balancing — Distributing Traffic Across Multiple Backends
description: How to configure NGINX to distribute traffic across multiple copies of your backend service.
tags: [nginx, load-balancing, upstream, high-availability]
---

# Load Balancing — Distributing Traffic Across Multiple Backends

## The Problem

Your app gets popular. One Flask instance can't handle all the traffic. So you run **multiple copies** of the same app:

```
Flask copy 1 on port 5001
Flask copy 2 on port 5002
Flask copy 3 on port 5003
```

But the browser can only make a request to one place. Who decides which copy gets each request?

**NGINX does.**

## The Config

```nginx
upstream backend_servers {
    server localhost:5001;
    server localhost:5002;
    server localhost:5003;
}

server {
    listen 80;
    server_name myapp.com;

    location /api {
        proxy_pass http://backend_servers;
    }
}
```

Two new concepts:

- **`upstream`** — a named group of backend servers. You define it outside the `server` block, inside the `http` block.
- **`proxy_pass`** points to the upstream name instead of a single address.

The difference: `proxy_pass http://localhost:5000` sends to one server. `proxy_pass http://backend_servers` distributes across a group.

## Load Balancing Strategies

### Round Robin (Default)

NGINX sends each request to the next server in the list:

```
Request 1  → Flask copy 1 (port 5001)
Request 2  → Flask copy 2 (port 5002)
Request 3  → Flask copy 3 (port 5003)
Request 4  → Flask copy 1 (port 5001)   ← wraps around
Request 5  → Flask copy 2 (port 5002)
...
```

Each server gets an equal share. Simple and effective for most cases.

### Least Connections

Send to whichever server has the fewest active requests:

```nginx
upstream backend_servers {
    least_conn;
    server localhost:5001;
    server localhost:5002;
    server localhost:5003;
}
```

Best when requests take varying amounts of time — prevents one server from getting overloaded while others are idle.

### IP Hash

Same client IP always routes to the same server:

```nginx
upstream backend_servers {
    ip_hash;
    server localhost:5001;
    server localhost:5002;
    server localhost:5003;
}
```

```
User X, Request 1 → Copy 1 (always)
User X, Request 2 → Copy 1 (always)
User Y, Request 1 → Copy 3 (always)
```

This exists to solve the **session problem** (explained below).

### Strategy Summary

| Strategy | How it works | Best for |
|---|---|---|
| Round robin (default) | Each server takes turns | Most cases |
| `least_conn` | Server with fewest active connections gets the next request | When requests take varying amounts of time |
| `ip_hash` | Same client IP always routes to the same server | When your app stores session data in memory |

## The Session Problem

When your Flask app stores session data **in memory** (like "user X is logged in"), that data only exists inside that one process:

```
Copy 1 memory: {user_X: "logged in"}
Copy 2 memory: {}                      ← knows nothing about user X
Copy 3 memory: {}                      ← knows nothing about user X
```

With round robin:

```
Request 1 (login)     → Copy 1 → saves "user X logged in" in its memory
Request 2 (dashboard) → Copy 2 → "who is user X? not logged in!" → redirects to login
```

The user keeps getting bounced to login because each request lands on a different copy that doesn't have their session.

`ip_hash` fixes this by always sending the same client to the same server. But in practice, most production apps store sessions in a **shared store** like Redis instead of in-memory. That way any copy can access any user's session, and you can use round robin freely. `ip_hash` is more of a quick fix when you can't change the app.

## Automatic Failure Detection

NGINX detects when a backend is unresponsive and **stops sending traffic to it**:

```
Flask copy 1 (port 5001)  ✓ healthy
Flask copy 2 (port 5002)  ✗ crashed
Flask copy 3 (port 5003)  ✓ healthy

NGINX notices copy 2 isn't responding.
All traffic now goes to copies 1 and 3.

Later, copy 2 comes back online.
NGINX starts sending traffic to it again.
```

No manual intervention needed. Users never see errors because their requests are automatically routed to healthy servers.

## Weighted Servers

If some servers are more powerful than others, you can give them more traffic:

```nginx
upstream backend_servers {
    server localhost:5001 weight=3;    # gets 3x the traffic
    server localhost:5002 weight=1;    # gets 1x the traffic
    server localhost:5003 weight=1;    # gets 1x the traffic
}
```

Out of every 5 requests: 3 go to port 5001, 1 to 5002, 1 to 5003.

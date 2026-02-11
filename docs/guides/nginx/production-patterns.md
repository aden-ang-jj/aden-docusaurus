---
sidebar_label: Production Patterns
sidebar_position: 6
title: Production Patterns — Making NGINX Production-Ready
description: Common NGINX production configurations including gzip, rate limiting, security headers, TLS, and caching.
tags: [nginx, production, tls, security, caching, rate-limiting]
---

# Production Patterns

These are the things you configure in NGINX when going from "it works" to "it's production-ready".

## 1. Gzip Compression

NGINX compresses responses before sending them, so less data travels over the network.

```nginx
http {
    gzip on;
    gzip_types text/html text/css application/json application/javascript;
    gzip_min_length 1000;
}
```

| Directive | What it does |
|---|---|
| `gzip on` | Enable compression |
| `gzip_types` | Which content types to compress (don't compress images — they're already compressed) |
| `gzip_min_length 1000` | Don't bother compressing responses smaller than 1000 bytes — the overhead isn't worth it |

```
Without gzip:  NGINX sends 100KB CSS file → browser receives 100KB
With gzip:     NGINX compresses to 20KB → sends 20KB → browser decompresses
```

## 2. Rate Limiting

Protects your app from being overwhelmed — whether by abusive users, bots, or accidental traffic spikes. Without rate limiting, a single user could flood your Flask app with thousands of requests and bring it down.

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        location /api {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://localhost:5000;
        }
    }
}
```

### Defining the rule: `limit_req_zone`

```
$binary_remote_addr   → track each client by their IP address
zone=api_limit:10m    → name this rule "api_limit", use 10MB of memory to track IPs
rate=10r/s            → allow 10 requests per second per IP
```

### Applying the rule: `limit_req`

```
zone=api_limit      → use the rule we defined above
burst=20            → allow short bursts of up to 20 extra requests
nodelay             → don't queue burst requests, process them immediately
```

### What this looks like in practice

```
User sends 10 requests in 1 second  → all go through ✓
User sends 15 requests in 1 second  → all go through ✓ (within burst of 20)
User sends 35 requests in 1 second  → first 30 go through, rest get 429 Too Many Requests ✗
```

NGINX rejects the excess requests before they ever reach your backend. Your Flask app is protected.

## 3. Security Headers

HTTP headers NGINX adds to every response, telling the browser to enable certain security protections. These are one-liners that add meaningful protection — your backend doesn't need to know about them.

```nginx
server {
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

| Header | What it prevents |
|---|---|
| `X-Frame-Options SAMEORIGIN` | Other sites embedding your site in an iframe (prevents clickjacking) |
| `X-Content-Type-Options nosniff` | Browser guessing the content type (prevents MIME sniffing attacks) |
| `X-XSS-Protection` | Browser's built-in XSS filter |
| `Referrer-Policy` | Controls how much URL info is sent when navigating to other sites |

## 4. TLS/HTTPS Configuration

Here's what TLS termination looks like in config (see [Prerequisites](./prerequisites.md#5-what-a-reverse-proxy-is) for the conceptual explanation):

```nginx
server {
    listen 443 ssl;
    server_name myapp.com;

    ssl_certificate     /etc/nginx/ssl/myapp.com.crt;
    ssl_certificate_key /etc/nginx/ssl/myapp.com.key;

    location / {
        root /var/www/mysite;
    }

    location /api {
        proxy_pass http://localhost:5000;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name myapp.com;
    return 301 https://$host$request_uri;
}
```

There are two `server` blocks:

### Block 1 (port 443) — the real server

- `listen 443 ssl` — listen on port 443 with TLS enabled
- `ssl_certificate` — path to your certificate file (proves you own the domain)
- `ssl_certificate_key` — path to your private key (used for encryption)

### Block 2 (port 80) — redirect only

- Anyone hitting `http://myapp.com` gets redirected to `https://myapp.com`
- `return 301` sends a permanent redirect
- `$host$request_uri` preserves the original domain and path

This block is necessary because most users type `myapp.com` without a protocol. The browser defaults to `http://` (port 80). Without this block, there's nothing listening on port 80 and users get a connection refused error.

```
User types: http://myapp.com/dashboard
  → hits port 80 server block
  → NGINX responds: 301 redirect to https://myapp.com/dashboard
  → browser follows redirect
  → hits port 443 server block
  → NGINX serves the page over HTTPS
```

## 5. Proxy Caching

NGINX can **remember** responses from your backend and serve them again without bothering Flask:

```nginx
http {
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g;

    server {
        location /api {
            proxy_cache my_cache;
            proxy_cache_valid 200 10m;
            proxy_pass http://localhost:5000;
        }
    }
}
```

| Directive | What it does |
|---|---|
| `proxy_cache_path` | Where to store cached responses on disk, and how much space to use |
| `proxy_cache my_cache` | Enable caching for this location |
| `proxy_cache_valid 200 10m` | Cache successful responses (200 OK) for 10 minutes |

### How it works

```
Request 1: GET /api/products
  → NGINX has no cache → forwards to Flask → Flask responds → NGINX caches it

Request 2: GET /api/products (within 10 minutes)
  → NGINX has it cached → serves directly, Flask is never contacted

Request 3: GET /api/products (after 10 minutes)
  → Cache expired → forwards to Flask again → caches the new response
```

### When to cache and when not to

Cache **reads** (`GET` requests) that don't change often — like product lists, public pages, or configuration data.

Never cache **writes** (`POST`, `PUT`, `DELETE`) — these create or modify data. Every write request must reach your backend because it has a side effect (inserting into the database). If you cached a `POST /api/orders`, the second person to place an order would get back the first person's order confirmation instead of actually creating their own.

## Putting It All Together

A production NGINX config combines all of the above:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;

    # Compression
    gzip on;
    gzip_types text/html text/css application/json application/javascript;
    gzip_min_length 1000;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # Caching
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g;

    # Load balancing
    upstream backend_servers {
        server localhost:5001;
        server localhost:5002;
        server localhost:5003;
    }

    # Redirect HTTP → HTTPS
    server {
        listen 80;
        server_name myapp.com;
        return 301 https://$host$request_uri;
    }

    # Main server
    server {
        listen 443 ssl;
        server_name myapp.com;

        ssl_certificate     /etc/nginx/ssl/myapp.com.crt;
        ssl_certificate_key /etc/nginx/ssl/myapp.com.key;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options "nosniff";

        # Static files
        location / {
            root /var/www/mysite;
            index index.html;
        }

        # API — rate limited, cached, load balanced
        location /api {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_cache my_cache;
            proxy_cache_valid 200 10m;
            proxy_pass http://backend_servers;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

This single config file handles: TLS termination, HTTP→HTTPS redirect, static file serving, reverse proxying, load balancing across 3 backends, rate limiting, caching, compression, and security headers. Your Flask app just handles business logic — it knows nothing about any of this.

---
sidebar_label: Configuration Basics
sidebar_position: 3
title: Configuration Basics — Reading and Writing NGINX Configs
description: Understanding the NGINX config file structure, directive inheritance, and serving your first site.
tags: [nginx, configuration, docker, static-files]
---

# Configuration Basics

Everything in NGINX is controlled through a single config file, usually at `/etc/nginx/nginx.conf`. This page covers how to read and write it.

## The Two Building Blocks

NGINX config has only two building blocks:

**Directives** — key-value instructions ending with a semicolon:

```nginx
worker_processes auto;
listen 80;
root /var/www/mysite;
```

**Contexts** — blocks that group related directives:

```nginx
events {
    worker_connections 1024;
}
```

That's the entire grammar. Every NGINX config is just directives and contexts nested together.

## The Context Hierarchy

Contexts are nested in a specific order:

```nginx
# Main context (top level) — global settings
worker_processes auto;

events {
    # How workers handle connections
    worker_connections 1024;
}

http {
    # All web traffic config lives here

    server {
        # A virtual host (one website/service)
        listen 80;
        server_name myapp.com;

        location / {
            # Rules for a specific URL path
            root /var/www/mysite;
        }

        location /api {
            # Different rules for a different path
            proxy_pass http://localhost:5000;
        }
    }
}
```

The nesting:

```
main
 ├── events       → connection handling settings
 └── http         → all web traffic
      └── server  → one website/domain
           └── location → rules for a URL path
```

## How NGINX Matches a Request

When a request comes in, NGINX works through the hierarchy:

```
Request: GET https://myapp.com/api/users

Step 1: Which server block?
  → Match by server_name: "myapp.com" ✓

Step 2: Which location block inside that server?
  → /api/users starts with /api ✓
  → Uses the "location /api" block

Step 3: What does that location say to do?
  → proxy_pass http://localhost:5000
  → Forward the request to the backend app
```

Another request:

```
Request: GET https://myapp.com/index.html

Step 1: Which server block?
  → "myapp.com" ✓

Step 2: Which location block?
  → /index.html starts with / ✓
  → Uses the "location /" block

Step 3: What does that location say?
  → root /var/www/mysite
  → Serve the file /var/www/mysite/index.html from disk
```

### proxy_pass Path Behavior

With `proxy_pass http://localhost:3000;` (no trailing path), NGINX forwards the **full original path**:

```
Browser requests:    GET /api/users
NGINX forwards to:  http://localhost:3000/api/users   (full path preserved)
```

With `proxy_pass http://localhost:3000/;` (trailing slash), NGINX strips the matched location prefix:

```nginx
location /api/ {
    proxy_pass http://localhost:3000/;
}
```

```
Browser requests:    GET /api/users
NGINX forwards to:  http://localhost:3000/users   (/api stripped)
```

## Directive Inheritance

Directives set in a parent context **apply to all children** unless overridden:

```nginx
http {
    gzip on;              # applies to ALL servers and locations below

    server {
        listen 80;
        server_name site-a.com;
        # gzip is ON here (inherited)

        location / {
            # gzip is ON here too (inherited)
        }
    }

    server {
        listen 80;
        server_name site-b.com;
        gzip off;          # overrides — gzip is OFF for this server only
    }
}
```

Set a directive at a higher level, and it cascades down. Override it at a lower level to change behavior for just that block.

> **Note on gzip:** `gzip` is not a header — it's a compression step NGINX performs on the response body before sending it. A 100KB HTML file might get compressed to 20KB. NGINX then adds a `Content-Encoding: gzip` header so the browser knows to decompress it.

## The `include` Directive and mime.types

The `include` directive pulls in another file as if its contents were written inline:

```nginx
http {
    include /etc/nginx/mime.types;
}
```

`mime.types` is a file that maps file extensions to `Content-Type` headers:

```
.html  →  text/html
.css   →  text/css
.js    →  application/javascript
.png   →  image/png
```

Without this, NGINX doesn't know what `Content-Type` to set. Your browser would receive a CSS file but think it's plain text, and refuse to apply the styles.

---

## Hands-On: Serving a Static Site with NGINX + Docker

This section walks through serving a static site (like a Docusaurus build) using NGINX in Docker.

### 1. Build Your Static Site

```bash
npm run build
```

This outputs static files to a `build/` directory.

### 2. Create an NGINX Config

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;

    server {
        listen 80;
        server_name localhost;

        root /usr/share/nginx/html;
        index index.html;
    }
}
```

Line by line:
- `worker_connections 1024` — each worker handles up to 1024 connections
- `include /etc/nginx/mime.types` — so NGINX sets correct Content-Type headers
- `listen 80` — bind to port 80
- `server_name localhost` — respond to requests for "localhost"
- `root /usr/share/nginx/html` — serve files from this folder
- `index index.html` — when someone requests `/`, serve `index.html`

### 3. Run with Docker

```bash
docker run --name nginx-learn -d \
  -p 8080:80 \
  -v $(pwd)/build:/usr/share/nginx/html:ro \
  -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro \
  nginx:latest
```

What each flag does:
- `--name nginx-learn` — name the container so you can stop it easily
- `-d` — run in background
- `-p 8080:80` — map your machine's port 8080 to the container's port 80
- `-v $(pwd)/build:/usr/share/nginx/html:ro` — mount your build folder as the files to serve (read-only)
- `-v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro` — mount your config file (read-only)

### 4. Test It

```bash
# Check it's responding
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8080/

# Or open in your browser
# http://localhost:8080
```

### What Happened

```
1. Docker started an NGINX container (a process)
2. NGINX master process read nginx.conf
3. Master spawned worker processes
4. Workers are listening on port 80 inside the container
5. Docker maps your port 8080 → container's port 80
6. You request localhost:8080
   → Docker routes to container port 80
   → NGINX worker receives GET /
   → Config says: root /usr/share/nginx/html, index index.html
   → Worker reads index.html from disk (your build/ folder)
   → Sends it back
```

### Cleanup

```bash
docker stop nginx-learn && docker rm nginx-learn
```

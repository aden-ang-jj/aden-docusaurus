---
sidebar_label: Reverse Proxy
sidebar_position: 4
title: Reverse Proxy — Forwarding Requests to Backend Services
description: How to configure NGINX to forward requests to backend services while serving static files directly.
tags: [nginx, reverse-proxy, proxy-pass, headers]
---

# Reverse Proxy — Forwarding Requests to Backend Services

You already know what a reverse proxy is (see [Prerequisites](./prerequisites.md#5-what-a-reverse-proxy-is)). This page covers how to actually configure it in NGINX.

## The Core Directive: `proxy_pass`

```nginx
server {
    listen 80;
    server_name myapp.com;

    # Serve static files
    location / {
        root /var/www/mysite;
    }

    # Forward API requests to your backend
    location /api {
        proxy_pass http://localhost:5000;
    }
}
```

`proxy_pass` is the single directive that turns NGINX from a file server into a reverse proxy. When a request matches `location /api`, NGINX opens its own connection to `localhost:5000` and forwards the request.

## What Happens Step by Step

```
1. Browser sends:  GET /api/users  → NGINX (port 80)

2. NGINX matches:  /api/users starts with /api
                   → use the "location /api" block

3. NGINX becomes a client:
   Opens a NEW connection to localhost:5000
   Sends: GET /api/users

4. Flask responds to NGINX:
   HTTP/1.1 200 OK
   {"users": ["Alice", "Bob"]}

5. NGINX forwards the response back to the browser
```

The browser never knows Flask exists. It thinks NGINX generated the response.

## Important Headers: Passing Client Info

When NGINX forwards a request, connection-level information (like the client's IP) is lost because it's a **new TCP connection** from NGINX to the backend. NGINX does forward the original HTTP headers from the browser, but your backend will see NGINX's IP (`127.0.0.1`) as the client, not the real user.

You fix this by explicitly adding headers:

```nginx
location /api {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

| Header | What it passes |
|---|---|
| `Host` | The original domain the browser requested |
| `X-Real-IP` | The browser's actual IP address |
| `X-Forwarded-For` | Chain of IPs if there are multiple proxies |
| `X-Forwarded-Proto` | Whether the original request was `http` or `https` |

Without these, your Flask app would see every request as coming from `127.0.0.1` (NGINX itself).

## Multiple Backends Behind One Domain

This is where the reverse proxy really shines:

```nginx
server {
    listen 80;
    server_name myapp.com;

    location / {
        root /var/www/mysite;
    }

    location /api {
        proxy_pass http://localhost:5000;       # Flask API
    }

    location /admin {
        proxy_pass http://localhost:3000;       # Admin dashboard
    }

    location /docs {
        proxy_pass http://localhost:8080;       # Documentation service
    }
}
```

One domain, one port open to the internet, three different services behind it. The user sees `myapp.com/*` for everything. They can't tell how many services are running or what ports they use — reducing the attack surface.

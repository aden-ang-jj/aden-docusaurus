---
sidebar_label: Asynchronous Programming
sidebar_position: 1
title: Asynchronous Programming
description: A practical guide to understanding asynchronous programming, starting from etc.
tags: [nginx, networking, web-server, reverse-proxy, devops]
---

# Learning Asynchronous Programming

A practical guide to understanding async programming, starting from zero to.

## What is NGINX?

NGINX is a **reverse proxy and web server** that sits between the internet and your backend services. It receives all incoming HTTP requests and decides what to do with them — serve a static file, forward the request to your app, reject it, cache the response, or balance load across multiple app instances.

## Why NGINX Matters

- It is the most common entry point for HTTP traffic in production
- It handles concerns your app shouldn't: TLS termination, rate limiting, static file serving, load balancing
- Almost every production deployment you encounter will have NGINX (or something like it) in front of the application

## What's Next?

- [Prerequisites](./prerequis
ites.md) — Networking and OS fundamentals you need before learning NGINX
- [Configuration Basics](./configuration.md) — Config structure, directive inheritance, and serving your first static site
- [Reverse Proxy](./reverse-proxy.md) — Forwarding requests to backend services with `proxy_pass`
- [Load Balancing](./load-balancing.md) — Distributing traffic across multiple backends
- [Production Patterns](./production-patterns.md) — Gzip, rate limiting, security headers, TLS, and caching

---
sidebar_label: Overview
sidebar_position: 1
title: Learning NGINX — From Zero to Production
description: A practical guide to understanding NGINX, starting from networking fundamentals all the way to production configuration.
tags: [nginx, networking, web-server, reverse-proxy, devops]
---

# Learning NGINX — From Zero to Production

A practical guide to understanding NGINX, starting from networking fundamentals all the way to production configuration.

## What is NGINX?

NGINX is a **reverse proxy and web server** that sits between the internet and your backend services. It receives all incoming HTTP requests and decides what to do with them — serve a static file, forward the request to your app, reject it, cache the response, or balance load across multiple app instances.

## Why NGINX Matters

- It is the most common entry point for HTTP traffic in production
- It handles concerns your app shouldn't: TLS termination, rate limiting, static file serving, load balancing
- Almost every production deployment you encounter will have NGINX (or something like it) in front of the application

## What's Next?

- [Prerequisites](./prerequisites.md) — Networking and OS fundamentals you need before learning NGINX
- [Architecture](./architecture.md) — How NGINX works under the hood (master/worker, event loop)
- Configuration *(coming soon)*
- Reverse Proxy *(coming soon)*
- Production Patterns *(coming soon)*

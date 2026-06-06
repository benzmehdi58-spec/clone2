---
title: CyberAI NIDS Backend
emoji: 🛡️
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# CyberAI NIDS — Backend API

FastAPI backend for the CyberAI Network Intrusion Detection System.

## Endpoints
- `GET /api/health` — Health check
- `POST /api/predict/network` — Network flow inference
- `GET /api/alerts` — Fetch alerts
- `WS /ws/alerts` — Real-time alert stream

## Environment Variables
Set `ANTHROPIC_API_KEY` in the Space secrets before running.
